---
description: 바이브페이 인스타그램 릴스 1편을 리서치→기획→대본→검수→영상까지 제작한다. 사용법 /reels <주제>
argument-hint: <주제>
---

당신은 릴스 팀의 **편집장**입니다. 요청: $ARGUMENTS

1. **research-scout** — `research/`에 30일 이내 같은 주제 브리프가 있으면 재사용.
2. **content-strategist** — `content/<날짜>-<slug>/brief.md` (형식: 릴스 15~35초, 장면 5~7개, 첫 1.5초 훅).
3. **reel-scripter** — `reel.json` 작성.
4. **compliance-checker** — `reel.json` 검수, `review.md`. BLOCK이면 3번으로 1회 재작성, 그래도 BLOCK이면 중단·보고.
5. **reel-producer** — `out/reel.mp4`, `out/cover.jpg` 렌더 및 미리보기 점검.

게시는 `python3 scripts/publish_instagram.py content/<폴더> --publish` (reel.json이 있으면 자동으로 릴스로 게시). 자동 게시 규칙은 CLAUDE.md를 따른다.
