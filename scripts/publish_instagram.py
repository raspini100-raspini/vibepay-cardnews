#!/usr/bin/env python3
"""Publish a rendered folder to Instagram: carousel (slides.json) or Reel (reel.json) via the Graph API.

Usage:
  python3 scripts/publish_instagram.py content/<folder>               # dry run (default): checks only
  python3 scripts/publish_instagram.py content/<folder> --publish     # actually posts

Required env:
  IG_USER_ID       Instagram professional account ID (numeric, from Graph API)
  IMAGE_BASE_URL   Public base URL where <folder>/out/NN.jpg is reachable,
                   e.g. https://raw.githubusercontent.com/<owner>/<repo>/main
Optional env:
  IG_ACCESS_TOKEN  Long-lived token. In the cloud session leave unset: the network proxy injects it.
  GRAPH_VERSION    default v21.0
  GRAPH_HOST       default graph.facebook.com (Unified login + system user token; set graph.instagram.com for Instagram-Login tokens)

Gates (refuses to publish unless all pass):
  - review.md verdict is PASS or 수정 후 PASS
  - approved.txt exists in the folder (a human signs off by creating it)
  - 2..10 JPEG slides, caption <= 2200 chars, <= 30 hashtags
  - every image URL answers HTTP 200 publicly
"""
import json, os, re, ssl, subprocess, sys, time, urllib.parse, urllib.request

# graph.instagram.com = "Instagram API with Instagram Login" (no Facebook Page needed, default)
# graph.facebook.com  = "Instagram API with Facebook Login" (Page-linked account)
GRAPH = f"https://{os.environ.get('GRAPH_HOST', 'graph.facebook.com')}/{os.environ.get('GRAPH_VERSION', 'v21.0')}"
CA = "/root/.ccr/ca-bundle.crt"
CTX = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()


def die(msg):
    print("STOP:", msg); sys.exit(1)


def http(method, url, data=None, auth=False):
    body = urllib.parse.urlencode(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    if auth:
        req.add_header("Authorization", "Bearer " + os.environ.get("IG_ACCESS_TOKEN", "injected-by-proxy"))
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=60) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw[:1] in (b"{", b"[") else {})
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    publish = "--publish" in sys.argv
    if not args:
        die(__doc__)
    folder = args[0].rstrip("/")
    is_reel = os.path.exists(f"{folder}/reel.json")
    spec = json.load(open(f"{folder}/{'reel' if is_reel else 'slides'}.json", encoding="utf-8"))
    container_only = "--container-only" in sys.argv  # test: build + process container, never publish

    # --- gates ---
    review = open(f"{folder}/review.md", encoding="utf-8").read() if os.path.exists(f"{folder}/review.md") else ""
    if not container_only and not re.search(r"판정:\s*(수정 후 )?PASS", review):
        die("review.md verdict is not PASS")
    if publish and not os.path.exists(f"{folder}/approved.txt"):
        die("approved.txt missing: a human must approve before publishing")
    if publish and os.path.exists(f"{folder}/published.json"):
        die("already published (published.json exists)")
    caption = spec.get("caption", "").rstrip() + "\n\n" + " ".join(spec.get("hashtags", []))
    if len(caption) > 2200 or len(spec.get("hashtags", [])) > 30:
        die("caption > 2200 chars or > 30 hashtags")
    ig_user = os.environ.get("IG_USER_ID") or die("IG_USER_ID not set")
    base = (os.environ.get("IMAGE_BASE_URL") or die("IMAGE_BASE_URL not set")).rstrip("/")

    def reachable(local, url):
        if not os.path.exists(local):
            die(f"local file missing: {local} (render first)")
        code, _ = http("HEAD", url)
        if code != 200:
            die(f"not publicly reachable ({code}): {url}")

    if is_reel:
        video, cover = f"{base}/{folder}/out/reel.mp4", f"{base}/{folder}/out/cover.jpg"
        reachable(f"{folder}/out/reel.mp4", video); reachable(f"{folder}/out/cover.jpg", cover)
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                    f"{folder}/out/reel.mp4"], capture_output=True, text=True).stdout.strip() or 0)
        if not 3 <= dur <= 90:
            die(f"reel duration {dur}s outside 3-90s")
        print(f"OK: reel {dur:.1f}s, caption {len(caption)} chars, video+cover reachable")
    else:
        n = len(spec["slides"])
        if not 2 <= n <= 10:
            die(f"carousel needs 2-10 slides, got {n}")
        urls = [f"{base}/{folder}/out/{i:02d}.jpg" for i in range(1, n + 1)]
        for u in urls:
            reachable(f"{folder}/out/{u.rsplit('/', 1)[1]}", u)
        print(f"OK: {n} slides, caption {len(caption)} chars, images reachable")
    if not publish and not container_only:
        print("Dry run only. Add --publish to post (or --container-only to test Meta processing)."); return

    # --- containers ---
    if is_reel:
        code, r = http("POST", f"{GRAPH}/{ig_user}/media", {"media_type": "REELS", "video_url": video, "cover_url": cover,
                                                            "caption": caption, "share_to_feed": "true"}, auth=True)
        if code != 200 or "id" not in r:
            die(f"reel container failed ({code}): {r}")
        cid, tries = r["id"], 60  # video processing: up to ~5 min
    else:
        children = []
        for u in urls:
            code, r = http("POST", f"{GRAPH}/{ig_user}/media", {"image_url": u, "is_carousel_item": "true"}, auth=True)
            if code != 200 or "id" not in r:
                die(f"child container failed ({code}): {r}")
            children.append(r["id"]); print("child", r["id"])
        code, r = http("POST", f"{GRAPH}/{ig_user}/media",
                       {"media_type": "CAROUSEL", "children": ",".join(children), "caption": caption}, auth=True)
        if code != 200 or "id" not in r:
            die(f"carousel container failed ({code}): {r}")
        cid, tries = r["id"], 30
    status = None
    for _ in range(tries):
        code, r = http("GET", f"{GRAPH}/{cid}?fields=status_code,status", auth=True)
        status = r.get("status_code")
        if status == "FINISHED":
            break
        if status == "ERROR":
            die(f"container error: {r}")
        time.sleep(5)
    if status != "FINISHED":
        die(f"container not ready in time (last status {status})")
    if container_only:
        print(f"CONTAINER OK {cid} (processed by Meta, NOT published; expires in 24h)"); return
    code, r = http("POST", f"{GRAPH}/{ig_user}/media_publish", {"creation_id": cid}, auth=True)
    if code != 200 or "id" not in r:
        die(f"publish failed ({code}): {r}")
    code, p = http("GET", f"{GRAPH}/{r['id']}?fields=permalink", auth=True)
    with open(f"{folder}/published.json", "w", encoding="utf-8") as f:
        json.dump({"media_id": r["id"], "permalink": p.get("permalink"), "format": "reel" if is_reel else "carousel",
                   "at": time.strftime("%Y-%m-%dT%H:%M:%S%z")}, f, ensure_ascii=False, indent=2)
    print("PUBLISHED", p.get("permalink") or r["id"])


if __name__ == "__main__":
    main()
