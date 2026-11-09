#!/usr/bin/env node
// Usage: node scripts/render_reel.js content/<folder>/reel.json
// Renders a 1080x1920 (9:16) Instagram Reel: out/reel.mp4 (H.264 + silent AAC), out/cover.jpg, out/preview_NN.jpg
//
// reel.json:
// { "title": "...", "fps": 30,
//   "scenes": [
//     { "type": "hook",  "kicker": "결제연동", "title": "AI가 짠 결제 코드,\n*이것* 없으면 위험", "sub": "...", "dur": 3 },
//     { "type": "point", "num": 1, "title": "...", "body": "...", "dur": 4 },
//     { "type": "list",  "title": "...", "items": ["...", "..."], "dur": 5 },
//     { "type": "stat",  "kicker": "바이브페이", "title": "...", "stats": [{ "big": "...", "label": "..." }], "dur": 4 },
//     { "type": "cta",   "title": "...", "body": "...", "handle": "@vibepay2026", "dur": 3 } ],
//   "cover_scene": 0, "caption": "...", "hashtags": [...] }
// *text* = orange highlight, \n = line break. Keep each scene 2.5-6s, total 15-45s.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const specPath = process.argv[2];
if (!specPath) { console.error('Usage: node scripts/render_reel.js <reel.json>'); process.exit(1); }
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const fps = spec.fps || 30;
const outDir = path.join(path.dirname(specPath), 'out');
const frameDir = path.join(outDir, '.frames');
fs.rmSync(frameDir, { recursive: true, force: true });
fs.mkdirSync(frameDir, { recursive: true });

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rich = s => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>');
const scenes = spec.scenes.map(s => ({ ...s, dur: Math.max(1.5, Number(s.dur) || 3.5) }));
const total = scenes.reduce((a, s) => a + s.dur, 0);
if (total < 3 || total > 90) { console.error(`total duration ${total}s out of range (3-90s)`); process.exit(1); }

function sceneHtml(s, i) {
  const handle = s.handle || spec.handle || '@vibepay2026';
  const a = (k, inner, cls = '') => `<div class="a ${cls}" style="--k:${k}">${inner}</div>`; // staggered element
  let body = '';
  switch (s.type) {
    case 'hook':
      body = (s.kicker ? a(0, `<span class="kicker">${esc(s.kicker)}</span>`) : '') + a(1, `<h1>${rich(s.title)}</h1>`) + (s.sub ? a(2, `<p class="sub">${rich(s.sub)}</p>`) : '');
      break;
    case 'point':
      body = (s.num != null ? a(0, `<div class="num">${String(s.num).padStart(2, '0')}</div>`) : '') + a(1, `<h2>${rich(s.title)}</h2>`) + (s.body ? a(2, `<p class="body">${rich(s.body)}</p>`) : '');
      break;
    case 'list':
      body = a(0, `<h2>${rich(s.title)}</h2>`) + `<ul>${(s.items || []).map((x, k) => a(k + 1, `<li>${rich(x)}</li>`)).join('')}</ul>`;
      break;
    case 'stat':
      body = (s.kicker ? a(0, `<span class="kicker">${esc(s.kicker)}</span>`) : '') + a(1, `<h2>${rich(s.title)}</h2>`) +
        (s.stats || []).map((x, k) => a(k + 2, `<div class="stat"><b>${rich(x.big)}</b><span>${rich(x.label)}</span></div>`)).join('');
      break;
    default: // cta
      body = a(0, `<h2>${rich(s.title)}</h2>`) + (s.body ? a(1, `<p class="body">${rich(s.body)}</p>`) : '') + a(2, `<span class="handle">${esc(handle)}</span>`);
  }
  return `<section class="scene ${s.type === 'cta' || s.type === 'stat' ? 'brand' : ''}" id="s${i}">${body}</section>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
:root{--brand:#315DFF;--accent:#0AA7E2;--hi:#F39120;--bg:#002A44;--fg:#fff;--muted:#A9C1D2;--card:#0B3D5C;
  --font:"Pretendard","Noto Sans KR","Noto Sans CJK KR","WenQuanYi Zen Hei",sans-serif}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:var(--bg);color:var(--fg);font-family:var(--font);word-break:keep-all}
.bg{position:absolute;inset:0;background:radial-gradient(900px 900px at 85% 8%,rgba(49,93,255,.55),transparent 60%),radial-gradient(700px 700px at 0% 100%,rgba(10,167,226,.35),transparent 60%)}
.scene{position:absolute;inset:0;padding:260px 96px 320px;display:flex;flex-direction:column;justify-content:center;gap:44px;opacity:0}
.scene.brand{background:linear-gradient(165deg,#315DFF,#003454)}
.a{opacity:0;transform:translateY(60px)}
.kicker{align-self:flex-start;display:inline-block;background:var(--brand);font-size:40px;font-weight:800;padding:14px 32px;border-radius:999px}
.brand .kicker{background:#fff;color:var(--brand)}
h1{font-size:118px;line-height:1.18;font-weight:900;letter-spacing:-3px;white-space:pre-line}
h2{font-size:88px;line-height:1.22;font-weight:900;letter-spacing:-2px;white-space:pre-line}
em{font-style:normal;color:var(--hi)}
.sub{font-size:48px;line-height:1.45;color:var(--muted);white-space:pre-line}
.body{font-size:54px;line-height:1.5;white-space:pre-line}
.brand .body{color:#E6EEFF}
.num{font-size:170px;font-weight:900;color:var(--accent);line-height:1}
ul{list-style:none;display:flex;flex-direction:column;gap:30px}
li{background:var(--card);border-radius:28px;padding:34px 40px;font-size:50px;line-height:1.35;display:flex;gap:24px}
li::before{content:"✓";color:var(--accent);font-weight:900}
.stat{background:rgba(255,255,255,.1);border-left:14px solid var(--hi);border-radius:28px;padding:40px 46px;display:flex;flex-direction:column;gap:12px}
.stat b{font-size:76px;font-weight:900;letter-spacing:-1.5px}
.stat span{font-size:42px;line-height:1.45;color:#D6E4F5;white-space:pre-line}
.handle{align-self:flex-start;background:#fff;color:var(--brand);font-size:52px;font-weight:900;padding:22px 46px;border-radius:999px}
.brandmark{position:absolute;left:96px;bottom:150px;font-size:40px;font-weight:900;letter-spacing:-.5px;color:#fff;opacity:.9}
.bar{position:absolute;left:96px;right:96px;bottom:110px;height:8px;border-radius:8px;background:rgba(255,255,255,.18);overflow:hidden}
.bar i{display:block;height:100%;width:0;background:var(--hi)}
</style></head><body><div class="bg"></div>${scenes.map(sceneHtml).join('')}
<div class="brandmark">VibePay</div><div class="bar"><i id="bar"></i></div>
<script>
const D=${JSON.stringify(scenes.map(s => s.dur))}, T=${total};
const starts=D.reduce((a,d,i)=>(a.push(i?a[i-1]+D[i-1]:0),a),[]);
const ease=x=>1-Math.pow(1-Math.min(Math.max(x,0),1),3);
window.setT=t=>{
  D.forEach((d,i)=>{
    const el=document.getElementById('s'+i), lt=t-starts[i];
    const fadeIn=ease(lt/0.35), fadeOut=i<D.length-1?ease((d-lt)/0.3):1;
    const vis=lt>=0&&lt<d+(i===D.length-1?1:0);
    el.style.opacity=vis?Math.min(fadeIn,fadeOut):0;
    el.querySelectorAll('.a').forEach(a=>{const k=+a.style.getPropertyValue('--k');const p=ease((lt-0.12-k*0.22)/0.5);
      a.style.opacity=p;a.style.transform='translateY('+(60*(1-p))+'px)';});
  });
  document.getElementById('bar').style.width=(100*Math.min(t/T,1))+'%';
};
</script></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.setContent(html, { waitUntil: 'load' });
  const overflow = await page.evaluate(() => [...document.querySelectorAll('.scene')].map((s, i) => [i, s.scrollHeight > 1920]).filter(x => x[1]).map(x => x[0]));
  if (overflow.length) console.warn('WARN overflow in scenes', overflow.map(i => i + 1).join(','));
  const n = Math.round(total * fps);
  for (let f = 0; f < n; f++) {
    await page.evaluate(t => window.setT(t), f / fps);
    await page.screenshot({ path: path.join(frameDir, String(f).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 90 });
  }
  // previews: each scene at 85% of its duration; cover = chosen scene
  let t0 = 0;
  for (let i = 0; i < scenes.length; i++) {
    await page.evaluate(t => window.setT(t), t0 + scenes[i].dur * 0.85);
    await page.screenshot({ path: path.join(outDir, `preview_${String(i + 1).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 88 });
    if (i === (spec.cover_scene || 0)) fs.copyFileSync(path.join(outDir, `preview_${String(i + 1).padStart(2, '0')}.jpg`), path.join(outDir, 'cover.jpg'));
    t0 += scenes[i].dur;
  }
  await browser.close();
  const mp4 = path.join(outDir, 'reel.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(frameDir, '%05d.jpg'),
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-shortest', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(fps), '-crf', '20',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', mp4]);
  fs.rmSync(frameDir, { recursive: true, force: true });
  const mb = (fs.statSync(mp4).size / 1048576).toFixed(1);
  console.log(`rendered ${mp4} (${total}s, ${n} frames, ${mb}MB) + cover.jpg + ${scenes.length} previews`);
})();
