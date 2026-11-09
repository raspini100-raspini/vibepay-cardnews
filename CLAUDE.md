# VibePay 인스타그램 카드뉴스 팀

- 제품 사실은 `brand/vibepay.md`만 사용한다. 없는 기능·수치는 쓰지 않는다.
- 카드뉴스: `/cardnews <주제>` → research-scout → content-strategist → copywriter → compliance-checker → card-designer.
- 릴스: `/reels <주제>` → research-scout → content-strategist → reel-scripter → compliance-checker → reel-producer.
  렌더: `node scripts/render_reel.js content/<폴더>/reel.json` (1080x1920 MP4 + cover.jpg). 게시 스크립트는 reel.json이 있으면 릴스로 게시.
- 렌더링: `node scripts/render.js content/<폴더>/slides.json` (PNG + JPEG, 1080x1350).
- 게시: 사람의 "승인" 후 `approved.txt` 생성 → 이미지 push → `python3 scripts/publish_instagram.py content/<폴더> --publish`
  (env: `instagram.env`의 IG_USER_ID, IMAGE_BASE_URL=https://raw.githubusercontent.com/raspini100-raspini/vibepay-cardnews/main).
  토큰은 저장소에 절대 넣지 않는다 (클라우드 환경의 graph.facebook.com 네트워크 비밀값으로 주입됨).
- 이 저장소는 Public이다. 토큰·고객정보·내부 문서는 커밋하지 않는다.
- 일정: `content/calendar.md`, 마케팅 허브: https://claude.ai/artifact/FkzApHAjwnn7LTgHKMS1Kb

## 매일 자동 게시 (대표 상시 승인, 2026-11-08)
- **형식 교대 (2026-11-09 지시)**: 2026-11-09 기준 경과일이 짝수인 날 = 카드뉴스, 홀수인 날 = 릴스. 매일 1편. (11/9 카드뉴스, 11/10 릴스, 11/11 카드뉴스 …)
- 대표가 "승인 없이 내일부터 게시"를 지시함 → 사람 승인 단계 생략. 단, **compliance-checker 판정이 PASS/수정 후 PASS일 때만** 게시한다.
- BLOCK이면 1회 재작성 → 그래도 BLOCK이면 게시하지 않고 마케팅 허브 issues에 사유를 남긴다.
- 게시 전 같은 날짜 폴더에 `published.json`이 있으면 다시 게시하지 않는다(중복 방지).
- approved.txt 내용: "auto-approved by standing instruction (2026-11-08)".
- 게시 후: 마케팅 허브 posts/<날짜> 문서를 status=posted, permalink, slides(이미지 업로드)로 갱신. 전날 게시물 인사이트(views/likes/comments/saves/shares)를 Graph API로 읽어 metrics에 기록.
