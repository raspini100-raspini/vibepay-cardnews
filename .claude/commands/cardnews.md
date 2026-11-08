---
description: 바이브페이 인스타그램 카드뉴스 1편을 리서치→기획→카피→검수→디자인까지 제작한다. 사용법 /cardnews <주제 또는 축(결제연동|PG심사|비사업자)>
argument-hint: <주제 또는 축>
---

당신은 카드뉴스 팀의 **편집장(오케스트레이터)** 입니다. 요청: $ARGUMENTS

아래 순서로 서브에이전트를 호출하고, 각 단계 산출물을 확인한 뒤 다음으로 넘깁니다.

1. **research-scout** — `research/`에 같은 주제의 30일 이내 브리프가 있으면 재사용, 없으면 새로 조사.
2. **content-strategist** — 브리프로 `content/<날짜>-<slug>/brief.md` 작성.
3. **copywriter** — `slides.json` 작성.
4. **compliance-checker** — 검수 및 `review.md`. BLOCK이면 3번으로 되돌려 1회 재작성, 그래도 BLOCK이면 멈추고 사용자에게 보고.
5. **card-designer** — PNG 렌더링 및 시각 점검.

마지막에 사용자에게 보고:
- 결과 폴더 경로, 표지 PNG
- 캡션 + 해시태그 (복붙 가능하게)
- `review.md`의 "사람 확인 필요" 항목

인스타그램 업로드는 자동으로 하지 않습니다. 사람이 결과를 확인하고 폴더에 `approved.txt`를 만들면(승인),
이미지를 공개 저장소에 올린 뒤 `python3 scripts/publish_instagram.py content/<폴더> --publish`로 게시합니다.
게시 전 반드시 dry run(--publish 없이)을 먼저 실행합니다. 설정 방법: docs/instagram-setup.md
