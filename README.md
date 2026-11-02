# Block Tower Challenge

Cloudflare Pages의 GitHub 자동 배포·로그인·도메인·재배포·장애 점검은 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요. Windows PowerShell에서 `npm.ps1` 실행이 차단되면 아래 문서의 `npm`/`npx` 명령 대신 `npm.cmd`/`npx.cmd`를 사용하세요. 광고 준비는 [MONETIZATION.md](./MONETIZATION.md), 사이트 소개는 `/about.html`에 있습니다.

배포 준비 변경과 프로덕션 Preview 검증 결과는 [DEPLOYMENT_QA.md](./DEPLOYMENT_QA.md)에 정리했습니다.

설치 없이 브라우저에서 즐기는 세로형 3D 타이밍 게임입니다. 움직이는 블록을 탭으로 쌓고, 겹치지 않는 부분은 잘려 떨어집니다. 서버나 계정 없이 브라우저에 개인 최고 기록을 저장합니다.

## 환경과 기술

- Node.js **22.12 이상** 권장. 개발 및 검증 환경: Node.js 24.18.0, npm 11.16.0, Windows.
- TypeScript strict, Three.js, Vite, HTML/CSS, Pointer Events, localStorage.
- 검증: Vitest, Playwright + Chromium. React, 외부 물리엔진, 백엔드는 사용하지 않습니다.
- 정확한 설치 버전은 `package-lock.json`으로 고정됩니다. 실제 게임 런타임 의존성은 `three` 하나입니다.
- 시스템 글꼴을 사용하며 외부 폰트/CDN/이미지 요청이 없습니다.

## 설치 및 실행

```powershell
cd "block-tower-challenge"
npm ci
npm run dev
```

기본 접속 주소: **http://localhost:5173/**

모바일 접속:

```powershell
npm run dev -- --host 0.0.0.0
```

PC와 스마트폰을 같은 Wi-Fi/LAN에 연결하고 Vite가 출력한 `Network` 주소로 접속합니다. 예: `http://192.168.0.2:5173`. IP는 PC/네트워크에 따라 바뀌므로 개발 서버의 실제 출력을 확인하세요. 필요하면 Windows 방화벽에서 개인 네트워크의 Node.js 접속을 허용하세요. PC의 `localhost` 주소를 스마트폰에 입력하면 연결되지 않습니다.

프로덕션 빌드의 로컬 확인:

```powershell
npm run build
npm run preview
```

## 조작과 규칙

1. **START**로 새 게임을 시작합니다. 기초 블록은 점수에 포함하지 않습니다.
2. 게임 화면을 탭하거나 마우스로 클릭하면 현재 위치에서 블록을 배치합니다. **Space**도 지원합니다.
3. 첫 번째 블록은 X축, 다음 블록은 Z축으로 움직이며 이후 교대합니다.
4. 겹친 면적이 남으면 성공입니다. 남은 블록과 같은 크기로 다음 블록이 생성됩니다.
5. 완전히 빗나갔거나 경계가 닿기만 해 면적이 0이면 게임이 끝납니다.
6. 결과 화면의 **RETRY**로 즉시 재시작합니다. Space로 시작/재시작도 가능합니다.

빠른 연속 입력, 보조 터치, 누르고 있는 Space의 반복 입력은 중복 배치를 만들지 않습니다. START/RETRY는 캔버스와 별도 요소여서 해당 입력이 배치로 전달되지 않습니다. 배치 중 0.18초 동안 입력을 잠급니다. 탭을 숨기면 게임 진행을 멈추고, 돌아오면 누적 시간을 건너뜁니다.

## 겹침 및 절단

`CollisionSystem.ts`는 이동 축의 두 AABB 구간에 대해 다음을 계산합니다.

```text
overlapMin = max(movingCenter - movingSize/2, targetCenter - targetSize/2)
overlapMax = min(movingCenter + movingSize/2, targetCenter + targetSize/2)
overlapSize = max(0, overlapMax - overlapMin)
retainedCenter = (overlapMin + overlapMax) / 2
```

`overlapSize > 0`이면 그 실제 크기와 위치로 고정합니다. 이동하지 않는 축의 크기·위치는 그대로 유지합니다. 남은 구간 바깥의 조각들은 각각 실제 구간의 중심과 크기로 생성합니다. 일반 플레이에서는 크기가 같은 블록끼리 비교하므로 한쪽 조각만 생기지만, 알고리즘은 크기가 다른 블록의 양쪽 절단도 처리합니다.

임의의 최소 너비를 두고 게임을 종료하지 않습니다. 아주 좁더라도 양수인 교집합은 유효합니다. 조각은 중력과 약한 회전·수평 드리프트로 낙하하며, 화면 아래나 수명 3초를 넘으면 제거됩니다. 고정된 탑에는 물리 시뮬레이션을 적용하지 않습니다.

## PERFECT

이동 축 중심 오차가 아래 범위 이내이고 크기가 같을 때 아래 블록의 중심으로 정확히 정렬합니다.

```text
허용 오차 = min(0.08 world unit, 해당 축 블록 크기 × 0.10)
```

크기를 유지하고 조각을 만들지 않습니다. PERFECT 텍스트와 얇은 윗면 하이라이트를 짧게 보여줍니다. 교집합이 0인 경우는 PERFECT로 구제하지 않습니다.

## 난이도 및 카메라

주요 밸런스는 `src/game/GameConfig.ts`에서 조절합니다. 거리·크기 단위는 world unit, 시간은 초입니다.

| 설정 | 기본값 | 의미 |
| --- | --- | --- |
| initialBlockWidth / initialBlockDepth | 4 / 4 | 초기 크기 |
| blockHeight | 0.5 | 모든 층의 높이 |
| initialSpeed | 2.8 | 초기 이동 속도 |
| speedIncreasePerFloor | 0.08 | 성공한 층당 속도 증가 |
| maxSpeed | 6 | 이동 속도 상한 |
| movementRange | 6 | 중심 기준 최대 편도 이동 거리 |
| movementMargin | 0.12 | 현재 크기보다 조금 더 벗어나는 이동 여유 |
| perfectTolerance / perfectSizeRatio | 0.08 / 0.10 | 절대·상대 PERFECT 범위 |
| gravity | -15 | 조각의 중력 가속도 |
| placementDelay / gameOverDelay | 0.18 / 0.65 | 배치 잠금·실패 연출 시간 |
| cameraFollowSpeed | 3.5 | 카메라 지수 보간 속도 |
| maxPixelRatio | 1.75 | 렌더링 DPR 상한 |

실제 이동 반경은 `min(movementRange, 현재 이동 축 크기 + movementMargin)`입니다. 좁은 블록이 불필요하게 먼 거리를 왕복하지 않으면서 모든 층에서 완전히 빗맞출 가능성이 있습니다. 경계 반사 시 초과 이동량을 보존하고, delta time을 사용해 FPS에 독립적으로 이동합니다.

카메라는 고정된 3/4 방향의 OrthographicCamera입니다. 낮은 층은 전체 탑이 보이며, 높아지면 이동 블록과 상단 층을 부드럽게 따라갑니다. 축 밖으로 누적되는 탑의 중심 이동도 추적합니다. 화면 비율에 맞춰 frustum을 조정하며 게임 중 줌 애니메이션은 없습니다. 재시작 시 카메라를 초기화합니다.

## 프로젝트 구조

```text
src/
  game/
    Game.ts                 루프, 입력, 게임 진행 조율
    GameConfig.ts           밸런스, 공통 타입
    GameState.ts            ready/moving/placing/gameover 전환
    objects/
      Block.ts              공유 베벨 Geometry와 Material 팔레트
      Tower.ts              고정된 블록, 초기화, 하단 컬링
      FallingPiece.ts       조각 운동
    systems/
      MovementSystem.ts     경계 반사 이동
      PlacementSystem.ts    PERFECT·절단·실패 계산
      CollisionSystem.ts    AABB 교집합
      FallingSystem.ts      낙하 조각 수명
      ScoreSystem.ts        점수와 안전한 localStorage 접근
    rendering/
      Scene.ts              렌더러, 배경, 바닥
      Camera.ts             화면 비율과 자동 추적
      Lighting.ts           조명·그림자
  ui/                       StartScreen, GameHUD, ResultScreen
  main.ts                   부팅, WebGL 안내, 개발 QA 연결
  style.css                 모바일 화면 및 safe-area
tests/                      순수 로직 및 리소스 단위 테스트
e2e/                        실제 Chromium 브라우저 테스트
public/assets/              프로젝트 아이콘
```

## 테스트

개발 시 실제 수행한 검증 결과, 리소스 측정값, 스크린샷 목록 및 검증 한계는 [QA_REPORT.md](./QA_REPORT.md)에 정리했습니다.

최초 한 번 Chromium 테스트 브라우저를 설치합니다.

```powershell
npx playwright install chromium
npm run typecheck
npm run test
npm run build
npm run qa
```

`npm run qa`는 타입 검사 → 단위 테스트 → 프로덕션 빌드 → Playwright 검증 순으로 실행합니다. Playwright가 개발용 4173 포트와 프로덕션 확인용 4174 포트 서버를 자동으로 실행/종료합니다. 충돌 시 해당 포트를 비우세요.

- 375×812, 390×844, 430×932, 1280×720에서 시작/정확 배치/부분 절단/낙하/5·10·25층/게임 오버/RETRY/최고 기록 유지.
- X/Z 교대 및 절단하지 않은 축 보존, 빠른 입력·멀티터치 필터·Space 반복 방지.
- 128층 자동 적층, 카메라 범위, 낙하 조각 회수, GPU geometry 수, 반복 RETRY.
- 매우 좁은 블록의 80층 브라우저 적층 및 160회 단위 테스트.
- 회전/리사이즈, 스크롤 없음, JavaScript 및 콘솔 오류 검사.
- visibilitychange 일시정지·복귀 처리, 최고 기록 저장 차단 시 게임 진행.
- 프로덕션 빌드에서 실제 터치 플레이 및 QA API 미노출.

결과물:

```text
.qa/screenshots/<viewport>/    게임 상태별 PNG
.qa/metrics-<viewport>.json    자동 적층 및 재시작 리소스 기록
.qa/report/index.html         Playwright HTML 보고서
.qa/test-results/             실패 시 스크린샷과 trace
```

개별 브라우저 검증은 먼저 `npm run build`를 실행한 후 `npm run test:browser`로 수행합니다. 보고서는 `npx playwright show-report .qa/report`로 열 수 있습니다.

개발 중에만 `http://localhost:5173/?qa=1`에서 `window.__BLOCK_TOWER_QA__`를 사용할 수 있습니다. 이동 고정, 오프셋 지정, 시간 진행, 상태 조회를 제공하며 테스트도 실제 Pointer Events 입력 경로를 사용합니다. 일반 접속과 프로덕션에는 API를 연결하지 않습니다.

## 모바일 및 리소스 처리

- 100dvh, safe-area, Pointer Events, DPR 상한, ResizeObserver.
- 블록과 조각은 **베벨 Geometry 하나**를 공유하며 색상 Material은 **32개 팔레트 + 기초 블록 1개**로 제한합니다. 각 조각을 없앨 때 공유 자원을 파괴하지 않고 Mesh 참조를 제거합니다.
- 높은 탑은 화면 아래 블록의 렌더링을 생략합니다. 논리 층수 제한은 없습니다.
- 재시작 시 블록, 조각, 피드백, 카메라, 이동 방향을 초기화합니다. 종료 시 공유 GPU 자원, 조명, 이벤트, ResizeObserver, RAF를 정리합니다.
- 저장소 차단/용량 오류/잘못된 저장값을 처리합니다. 저장이 불가능해도 해당 세션의 최고 기록으로 플레이합니다.
- WebGL 2 미지원은 안내 화면으로 전환합니다. GPU context 유실 시 일시정지하고 복원되면 재개합니다.
- 실제 스마트폰에서 측정한 FPS/전력/열 성능 결과는 포함하지 않습니다. 브라우저 검증은 데스크톱 Chromium의 모바일 뷰포트 에뮬레이션입니다.

## Cloudflare Pages 배포 방법

이 작업에서는 외부 배포를 수행하지 않습니다. 직접 배포할 때:

1. 로컬 Git 변경을 확인하고 사용자 인증·승인 후 GitHub 저장소 생성 및 Push를 진행합니다. `node_modules`, `.qa`, `dist`, 환경 파일은 제외합니다.
2. Cloudflare → Workers & Pages → Pages → Connect to Git에서 해당 GitHub 저장소를 선택합니다.
3. Framework: **Vite**(해당 프리셋이 없으면 None과 수동 값), Build Command: **npm run build**, Output Directory: **dist**, Root: 프로젝트 루트, Production branch: **main**.
4. `.nvmrc`의 Node 24를 사용하며 필요하면 Pages의 `NODE_VERSION=24`를 지정합니다. 앱 비밀 키나 서버는 필요 없습니다.
5. 사용자 승인 후 Save and Deploy를 실행하고 실제 발급된 HTTPS `pages.dev` 주소에서 게임과 `/about.html`을 검증합니다. 이후 main 변경이 자동 배포됩니다.

기본은 GitHub 자동 배포입니다. Direct Upload는 별도 대안이며 같은 프로젝트를 나중에 Git 연동으로 전환할 수 없으므로 처음 선택에 주의하세요. 실제 기기·공개 URL 검증, 단계별 승인과 직접 업로드 절차는 DEPLOYMENT.md에 있습니다. AdSense 신청/심사는 호스팅 배포와 별개이며 현재 광고 코드와 ads.txt는 없습니다.

공식 문서: [Vite 시작](https://vite.dev/guide/), [Three.js RoundedBoxGeometry](https://threejs.org/docs/pages/RoundedBoxGeometry.html), [Playwright](https://playwright.dev/docs/intro), [Cloudflare Pages Git 연동](https://developers.cloudflare.com/pages/get-started/git-integration/).
