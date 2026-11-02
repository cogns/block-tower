# Cloudflare Pages 전환 검증 — 2026-11-02

## 최종 결과

| 항목 | 결과 |
| --- | --- |
| 타입 검사 | strict 유지, 통과 |
| 단위 테스트 | 기존 30개 통과 |
| 프로덕션 빌드 | 성공, 엔진 청크 경고 유지 |
| 전체 QA | npm.cmd run qa 종료 코드 0 |
| 브라우저 | 48개 통과, 약 8.5분 |
| 프로덕션 Preview | 네 규격 × 5개 시나리오 = 20개 통과 |
| 정상 플레이·복원·정적 콘텐츠 | JS 예외 및 정적 자산 오류 0건 |

기존 44개 브라우저 테스트에 정적 콘텐츠/광고 미삽입 확인 4개를 추가했습니다. 의도적인 WebGL 미지원 시나리오의 예상 초기화 오류 로그는 별도로 검사합니다. QA가 기존 4173 포트의 프로덕션 서버를 개발 서버로 오인해 재사용하지 않도록 reuseExistingServer=false로 강화했습니다. 테스트 조건과 시간 제한은 완화하지 않았습니다.

소개 페이지의 모바일/데스크톱 실화면 캡처는 .qa/screenshots/content/에 있습니다. 기존 게임 및 프로덕션 캡처도 유지했습니다. 검증용 서버는 종료했으며 직접 확인하려면 npm.cmd run preview를 실행하세요.

## 작업 범위

기존 프로젝트를 그대로 전환했습니다. src/의 게임 로직, 디자인, 밸런스, 입력, 점수 저장 및 카메라는 변경하지 않았습니다. 게임 JS(index-DEtXOQQh.js), CSS(index-CTlf51s7.css), Three.js(three-B2gk0Ykd.js)의 빌드 해시도 기존과 동일합니다.

유지: strict TypeScript, Vite base './', .nvmrc Node 24, 메타데이터와 favicon, 모바일 safe-area/DPR/자원 관리, 기존 30개 단위 및 44개 브라우저 검증.

정리: 사용되지 않는 .vercelignore를 검토 후 제거하고, README와 DEPLOYMENT.md를 Cloudflare Pages/GitHub 자동 배포 안내로 변경했습니다. 로컬 .vercel/나 vercel.json, 앱 .env는 없습니다. 이 대화에서 외부 Vercel 프로젝트를 생성하지 않았으며 외부 계정의 프로젝트 삭제·요금제 변경도 하지 않았습니다. 사용자 계정에 별도로 존재하는 리소스는 조사하지 않았습니다. .vercel/ 제외 규칙은 로컬 상태/인증정보 유입 방지용으로 유지했습니다.

추가: /about.html 소개·이용 방법, Pages의 알 수 없는 경로를 위한 /404.html, MONETIZATION.md, 비공개 정책 초안 docs/privacy-policy.template.md, 향후 광고 로더를 넣을 HTML 주석 위치. 광고 코드·게시자 ID·ads.txt·가짜 공개 정책은 없습니다. 소개 페이지 접근은 HTML rel=help와 직접 URL로 제공하며 게임 UI는 그대로입니다.

## GitHub 배포 준비

로컬 main 저장소만 초기화했습니다. 커밋·스테이징·remote·원격 Push는 하지 않았습니다. git check-ignore로 node_modules, dist, .qa, .vercel, .wrangler, .env, .dev.vars 제외를 확인했습니다. 계정 연결, GitHub 저장소 생성, Push 및 Pages 공개 배포는 사용자 인증과 승인이 필요합니다.

설정: Cloudflare Pages / Vite 또는 바닐라 프리셋이 없으면 None+수동 값 / npm run build / dist / 프로젝트 루트 / main / Node 24(.nvmrc 또는 NODE_VERSION).

## 검증 방법과 증거

npm.cmd run qa는 타입 검사 → 기존 단위 테스트 → 빌드 → 기존 브라우저 시나리오와 추가 정적 콘텐츠 검증을 수행합니다. 기대 조건을 삭제하거나 완화하지 않았습니다. 프로덕션 검증은 npm run preview의 dist를 사용합니다. 소개 페이지·아이콘·404 파일·게임으로 복귀, 광고 스크립트와 ads.txt 미삽입도 네 규격에서 검증합니다.

브라우저 검증에는 START → 정확 배치/PERFECT → 부분 절단/낙하 → 12층 → 완전 실패 → 결과 → 최고 기록 → RETRY → 새로고침 유지, 실제 WebGL 유실/복구와 미지원 안내가 포함됩니다. 기존 개발 서버 검증은 128층/반복 재시작/매우 좁은 블록/멀티터치·Space 중복 방지/가시성·저장소 오류도 포함합니다.

규격: 375×812, 390×844, 430×932, 1280×720. 실제 Chromium WebGL과 터치 에뮬레이션, SwiftShader를 사용합니다. 실제 휴대폰/Safari/FPS 결과는 아닙니다.

증거: .qa/report/index.html, .qa/screenshots/production*/ 및 기존 게임 상태 캡처, .qa/loading-production*.json의 요청/오류 기록. 시계를 제어한 테스트의 Performance resource 목록은 비어 있을 수 있습니다. 정상 플레이/복구는 콘솔 오류·JS 예외·정적 자산 실패를 검사하며, 의도적으로 WebGL을 차단한 미지원 모의 시나리오는 예상 초기화 오류만 허용합니다.

## 성능과 원격 검증 한계

Three.js 534.75kB/gzip 132.02kB, 게임 JS 19.39kB/gzip 6.71kB, CSS 5.59kB/gzip 1.90kB. 청크 경고와 기본 임계값을 유지했습니다. 첫 화면에 필요한 엔진의 동적 import나 불필요한 의존성은 추가하지 않았습니다. 이번 전환에서 기존 네트워크 로딩 측정을 반복하지 않았으며 과거 로컬 모의 측정은 Cloudflare CDN 측정이 아닙니다.

Pages의 Git 빌드, 리디렉션(/about.html → /about), 404 응답 코드, HTTPS/DNS/캐시 헤더, 공개 광고/정책 경로와 실제 스마트폰 동작은 인증·승인 후 발급된 URL에서 확인해야 합니다. 로컬 Vite Preview는 Pages의 확장자 제거 리디렉션이나 모든 미존재 경로의 엣지 동작을 재현하지 않습니다. 공개 배포는 아직 수행하지 않았습니다.

광고 승인·게시자 정보·운영자 연락처·공개 개인정보처리방침은 운영자가 별도로 준비해야 합니다. 광고로 게임 입력을 가리지 않는 배치는 MONETIZATION.md에 정리했습니다. 이 작업은 AdSense 승인 보장이 아닙니다.

