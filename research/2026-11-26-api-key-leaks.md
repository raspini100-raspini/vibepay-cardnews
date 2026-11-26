# 환경변수와 API 키, AI(바이브코딩) 코드에서 새는 곳 (릴스용, '키 유출 지점' 각도)

작성: 2026-11-26 / 중복 회피: 2026-11-10 ai-payment-code-check(AI 결제코드 점검), 11-15 ai-payment-prompt(프롬프트), 11-23 test-vs-live(테스트/라이브 키) 와 달리 "키가 어디로 새는가"에 집중.

> 조사 한계: 이 세션에서 nextjs.org, vite.dev, docs.github.com 직접 열람이 막혀(도메인 허용 필요) 공식 문서 본문 대신 **검색 결과에 노출된 공식 문서 발췌/요약**으로 확인함. 아래 "확인된 사실" 중 해당 건은 `(검색 요약 확인)`으로 표시. 컴플라이언스·제작 전 원문 재확인 권장. 토스페이먼츠 개발자 문서 본문도 직접 확인하지 못함.

## 핵심 요약 (3줄)
1. 키는 코드 안 하드코딩, 프론트 번들(NEXT_PUBLIC_/VITE_), Git 히스토리, 로그·스크린샷·AI 대화 순으로 새고, 결제에서는 시크릿 키가 서버 밖으로 나가면 곧 계정 권한 노출이다.
2. 새는 순간 "지우기"가 아니라 "폐기·재발급"이 1순위다(파일/히스토리 삭제만으로는 이미 복사된 키가 무효화되지 않음).
3. 결제 키는 클라이언트 키(공개용)와 시크릿 키(서버 전용)를 구분하고, 승인·검증은 서버에서 하는 구조가 안전하다. 바이브페이는 연동문서·AI 프롬프트 제공 + 개인·비사업자도 PG 연동 가능(심사·계약 후 이용), 심사 D+1(영업일 기준)로 연결.

## 페인포인트 TOP 5
- [P1] AI가 연결을 빨리 끝내려고 키를 코드에 직접 박는다 | 빈도 상 / 강도 상 | "AI에게 API 연결을 부탁하면 편의상 키를 코드 안에 직접 넣는 경우가 많다"(요약 표현, 원문 아님) | https://www.gpters.org/nocode/post/how-manage-your-api-rziFRp3MlGojE8v , https://platform.flow.team/blog/vibe-coding-api-key-security-guide
- [P2] NEXT_PUBLIC_/VITE_ 접두사를 붙이면 되는 줄 알고 시크릿 키까지 붙여서 브라우저에 공개 | 빈도 중상 / 강도 상 | (공식) VITE_ 변수는 빌드 시 소스에 번들되어 클라이언트에서 읽힘 | https://vite.dev/guide/env-and-mode , https://nextjs.org/docs/app/guides/environment-variables
- [P3] .env를 커밋/푸시하고 "나중에 지우면 되겠지" | 빈도 상 / 강도 상 | 파일을 나중에 지워도 키는 Git 기록에 남는다 | https://wikidocs.net/blog/@openwiki/28006/ , https://www.freecodecamp.org/news/how-to-fix-a-leaked-api-key
- [P4] 지우기만 하고 키 폐기를 안 함 | 빈도 중 / 강도 상 | TruffleHog 조사 요약: GitHub에서 제거된 뒤에도 키가 유효한 경우가 50% 초과(2차 출처, 검색 요약) | https://socket.dev/blog/github-activates-push-protection-by-default
- [P5] 에러 메시지·로그·스크린샷·질문글/AI 채팅에 키가 그대로 노출 | 빈도 중 / 강도 중상 | 토스페이먼츠 블로그: 기술 지원 문의 때도 시크릿 키 등 민감 정보 노출 주의(검색 요약) | https://www.tosspayments.com/blog/articles/54511

주: 한국어 커뮤니티의 1인칭 사고 후기는 검색에서 적게 나옴(대부분 가이드 글). 위 "목소리"는 가이드·후기성 글 기반이라 빈도/강도는 정성 추정.

## 확인된 사실
- Next.js: `NEXT_PUBLIC_` 접두사 변수는 `next build` 때 JS 번들에 값이 박혀(inline) 브라우저로 전달됨. 접두사 없는 변수는 Node.js(서버) 환경에서만 사용 가능. `next.config.js`의 `env` 키 값은 접두사와 무관하게 번들에 포함됨 (검색 요약 확인) | https://nextjs.org/docs/app/guides/environment-variables , https://nextjs.org/docs/app/api-reference/config/next-config-js/env | 2026-11-26
- Vite: `VITE_` 접두사 변수만 `import.meta.env`로 클라이언트 코드에 노출, 그 외(예: DB_PASSWORD)는 노출 안 됨. 값은 빌드 시 소스에 번들되므로 VITE_ 변수에 민감 정보(API 키)를 넣지 말라고 안내. `envPrefix`를 빈 문자열로 바꾸면 전부 노출될 위험은 2차 출처 (검색 요약 확인) | https://vite.dev/guide/env-and-mode | 2026-11-26
- Stripe 공식: 시크릿/제한 키를 소스코드나 클라이언트 앱에 넣지 말 것, 공개 저장소를 스캔하는 사기범이 있으므로 키를 커밋하지 말 것, 시크릿 볼트·암호화된 환경변수 사용, 제한(restricted) 키 권장, 유출 시 대시보드에서 즉시 롤(교체) 후 구 키 폐기. Stripe는 모든 유출 키를 탐지한다고 보장하지 않음 (검색 요약 확인) | https://docs.stripe.com/keys-best-practices | 2026-11-26
- GitHub: 푸시 보호는 지원되는 시크릿이 담긴 푸시를 차단. 이는 이후 푸시만 막고 이미 푸시된 시크릿은 해결하지 않음. 유출 대응은 의존 서비스 영향 확인 후 키 폐기/교체 우선, 히스토리 재작성은 잔여 위험을 따져 판단. 공개 저장소에 유출된 GitHub PAT는 자동 폐기 (검색 요약 확인) | https://docs.github.com/en/code-security/tutorials/remediate-leaked-secrets/remediating-a-leaked-secret , https://docs.github.com/en/code-security/concepts/secret-security/secret-leakage-risks | 2026-11-26
- OWASP Secrets Management Cheat Sheet: 시크릿 수명주기(생성·보관·접근통제·교체·폐기·감사) 다룸, 노출 즉시 교체 권고는 2차 요약 기준. 원문 직접 확인 못함 | https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html | 2026-11-26
- 토스페이먼츠 블로그: 클라이언트 키는 SDK용, 시크릿 키는 API 호출 인증용이며 한 세트로 맞춰 사용. 시크릿 키는 사용자 ID처럼 쓰이고 별도 비밀번호가 없음(검색 요약). "시크릿 키를 프론트에 두지 말라"는 명시 문구는 검색에서 확인 못함 | https://www.tosspayments.com/blog/articles/54511 | 2026-11-26
- 바이브페이: 결제 연동은 연동문서와 함께, AI 명령문(프롬프트) 생성 제공, 제작 도구가 외부 API·서버 기능을 지원해야 함, 개인·비사업자 신청 가능(심사·계약·연동 테스트 후 이용), 심사 접수 후 D+1(영업일 기준, 보완 시 연장 가능) | brand/vibepay.md | 2026-11-08 확인(브랜드 문서 기준)

## 불확실/상충 정보
- "AI 코딩 도구 사용 저장소의 시크릿 유출률 40% 높음", "ChatGPT API 키 8,000개 노출" 등 수치는 벤더 블로그 2차 인용 -> 릴스에 수치로 쓰지 말 것. https://www.vicarius.io/articles/8-000-chatgpt-api-keys-exposed-across-github-production-sites
- "GitHub이 매일 100개 이상 키 해지" 등 단일 수치도 1차 확인 못함 -> 사용 금지.
- 유출 후 "몇 시간 내 수천 달러 청구" 류는 사례성 주장, 결제 PG 키와는 다른 클라우드 키 맥락 -> 일반화 금지.
- 히스토리 정리(git filter-repo 등)의 필요성은 상황별(GitHub 자체 글도 "판단 사항"). "반드시 히스토리 삭제"로 단정 금지.
- 클라이언트 키(공개용)로 가능한 범위, 키 재발급 절차는 PG사마다 다름. 바이브페이 키 체계/재발급 방법은 brand/vibepay.md에 없음 -> 언급 금지.
- Next.js/Vite 문서는 버전별로 문구 변동 가능(확인일 2026-11-26, 검색 요약 기준).

## 릴스용 핵심 포인트 (4~5개)
1. 새는 곳 1, 코드 안 하드코딩: AI가 연결을 빨리 끝내려고 키를 코드에 박는 경우 -> 환경변수로 분리.
2. 새는 곳 2, 프론트 번들: NEXT_PUBLIC_/VITE_ 가 붙은 값은 브라우저에서 읽힘 -> 결제 시크릿 키에는 붙이지 않기, 승인·검증은 서버에서.
3. 새는 곳 3, Git: .env는 .gitignore, 공유는 값 비운 .env.example. 한 번 푸시했다면 유출로 간주.
4. 새는 곳 4, 로그·에러·스크린샷·질문글/AI 채팅: 올리기 전 키 가리기.
5. 새면: 지우기 전에 폐기·재발급 먼저(삭제만으로는 무효화 안 됨). 바이브페이 장면은 stat/CTA에서 "개인도 PG 연동으로 온라인 결제(심사·계약 후 이용)" + "심사 D+1(영업일 기준, 보완 시 연장 가능)", "연동문서 + AI 프롬프트 제공".

## 주의 단서 (컴플라이언스)
- 겁주기보다 "순서대로" 톤. "100% 안전", "이것만 하면 유출 없음" 금지.
- 수치(40%, 8,000개, 일 100개, 청구액) 사용 금지.
- 바이브페이 키 관리·보안 기능(키 자동 탐지, 재발급 등)을 홍보하지 말 것: brand/vibepay.md에 없음. 바이브페이 키 이름·발급 방식도 쓰지 말 것.
- "시크릿 키는 서버에만"은 Stripe 공식 및 프레임워크 문서 근거의 일반 원칙으로 표기, PG마다 키 체계가 다를 수 있다는 단서 병기.
- '사업자등록 없이' 표현이 강조되면 "사업자등록·신고 의무는 판매 상황에 따라 별도 확인" 캡션 필수.
- 제작 시 Next.js/Vite/GitHub 공식 문서 원문 재확인 권장(이번엔 열람 불가).

## 카드뉴스/릴스 주제 후보 (5개+)
- "내 결제 키, 어디로 새고 있을까? 4곳 점검" | P1~P5 | 4개 유출 지점 체크 후 CTA에 연동문서 + 심사 D+1(영업일 기준)
- "NEXT_PUBLIC_ 붙이는 순간 모두에게 공개" | P2 | 서버에서 승인 검증 구조 + 개인도 PG 연동(심사·계약 후 이용)
- "키 푸시했다면: 지우기 말고 폐기부터" | P3, P4 | 대응 순서 3단계, 바이브페이는 연동문서 제공 정도만
- "AI에게 키를 맡기기 전 한 줄 규칙" | P1 | AI 명령문 제공 기능과 연결(키는 환경변수, 서버 전용 요청)
- "스크린샷·에러로그에 찍힌 시크릿 키" | P5 | 질문 올리기 전 가리기 체크리스트
- "시크릿 키 vs 클라이언트 키 1분 정리" | 키 혼동 | 결제 맥락 교육, 개인도 결제 붙이기 흐름으로 연결
