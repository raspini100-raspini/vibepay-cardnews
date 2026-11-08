# VibePay 인스타그램 카드뉴스 팀

- 제품 사실은 `brand/vibepay.md`만 사용한다. 없는 기능·수치는 쓰지 않는다.
- 파이프라인: `/cardnews <주제>` → research-scout → content-strategist → copywriter → compliance-checker → card-designer.
- 렌더링: `node scripts/render.js content/<폴더>/slides.json` (PNG + JPEG, 1080x1350).
- 게시: 사람의 "승인" 후 `approved.txt` 생성 → 이미지 push → `python3 scripts/publish_instagram.py content/<폴더> --publish`
  (env: `instagram.env`의 IG_USER_ID, IMAGE_BASE_URL=https://raw.githubusercontent.com/raspini100-raspini/vibepay-cardnews/main).
  토큰은 저장소에 절대 넣지 않는다 (클라우드 환경의 graph.facebook.com 네트워크 비밀값으로 주입됨).
- 이 저장소는 Public이다. 토큰·고객정보·내부 문서는 커밋하지 않는다.
- 일정: `content/calendar.md`, 마케팅 허브: https://claude.ai/artifact/FkzApHAjwnn7LTgHKMS1Kb
