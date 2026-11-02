# Cloudflare Pages 배포 안내

기본 배포 방식은 **GitHub 저장소 연동 자동 배포**입니다. 현재 프로젝트를 그대로 사용하며 게임 로직·디자인·Vite 빌드와 모바일 최적화를 유지합니다. 이번 로컬 준비에서는 계정 연결·원격 Push·공개 배포를 수행하지 않습니다.

## 배포 설정

| 항목 | 값 |
| --- | --- |
| 서비스 | Cloudflare Pages (Workers 앱 생성과 구분) |
| Framework | Vite. 바닐라 Vite 프리셋이 없으면 None을 선택하고 아래 값을 직접 설정 |
| Build command | npm run build |
| Build output directory | dist |
| Root directory | package.json이 있는 루트. 이 폴더 자체를 저장소로 올리면 비움 또는 / |
| Production branch | main |
| Node.js | .nvmrc의 24 사용. 필요하면 Pages의 Production/Preview NODE_VERSION=24로 동일하게 지정 |
| 앱 환경 변수·비밀 키 | 없음 |

Cloudflare의 지원 빌드 이미지에서 .nvmrc 또는 NODE_VERSION으로 Node를 지정할 수 있습니다. package-lock.json은 커밋하며 자동 설치 로그를 확인하세요. 로컬 재현 검증은 npm ci를 사용합니다. 원격 빌드 설정은 요청한 npm run build와 Pages 자동 설치를 사용합니다. 원격 로그에서 선택한 Node 버전과 lockfile 기반 의존성 설치를 확인하세요.

Vite base './'와 기존 정적 자산 경로를 유지합니다. dist에는 HTML, 해시 JS/CSS, 아이콘과 소개 페이지가 포함됩니다. 서버·Functions·DB·Workers·Wrangler 설정 파일은 필요 없습니다. 존재하지 않는 경로는 루트 404.html로 처리하도록 준비합니다. /about.html은 정적 페이지이며 클라이언트 라우터가 아닙니다.

## 1. 로컬 검증

Windows PowerShell은 npm.ps1 보안 정책 변경 없이 npm.cmd / npx.cmd를 사용합니다.

```powershell
cd "C:\Users\82106\OneDrive\바탕 화면\block tower\block-tower-challenge"
npm.cmd ci
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run qa
npm.cmd run preview
```

npm ci 전에는 이 프로젝트 dev/preview 서버를 Ctrl+C로 종료하세요. 실행 중인 Vite의 native binding이 Windows에서 파일 잠금 오류를 일으킬 수 있습니다. 관련 없는 Node 프로세스를 종료하지 마세요. QA는 4173/4174 포트를 쓰며 테스트 서버를 종료합니다. 이후 npm.cmd run preview의 Local 주소를 엽니다. 같은 Wi-Fi 모바일 접속은 npm.cmd run preview -- --host 0.0.0.0 출력의 Network 주소를 사용합니다.

## 2. GitHub 연동 — 기본 방식

이번 전환에서 로컬 main 저장소만 초기화했습니다. 원격과 커밋은 없으며, 이 상태에서는 아래 git init을 생략해도 됩니다. 다른 복사본에 Git 저장소가 없다면 아래처럼 준비할 수 있습니다. GitHub 계정 연결·저장소 생성·원격 Push·공개 배포는 각각 사용자 인증/승인이 필요한 외부 작업입니다. 아래 외부 단계는 절차 설명이며 자동 실행하지 않습니다.

```powershell
git init -b main
git add .
git status --short
git diff --cached --stat
```

node_modules, dist, .qa, 환경 파일과 로컬 공급자 상태가 포함되지 않았는지 확인하세요. 비밀 키를 브라우저의 VITE_ 환경 변수로 넣지 마세요.

```powershell
git commit -m "Prepare Cloudflare Pages deployment"
```

사용자가 GitHub에 빈 저장소를 생성한 뒤 실제 저장소 URL을 사용합니다. 원격 Push 승인 후 git remote add origin <실제-저장소-URL> 및 git push -u origin main을 실행합니다. 예시 URL이나 사용자명을 임의로 입력하지 마세요. 저장소 생성·Push를 Codex에 맡기려면 명시적으로 승인해 주세요.

1. Cloudflare 로그인 → Workers & Pages → Create application → Pages → Connect to Git(또는 Import repository).
2. GitHub 인증 후 필요한 저장소만 연결하고 대상 저장소를 선택합니다.
3. 위 표의 main, 루트, Build command, dist, Node 버전을 확인합니다.
4. **Save and Deploy는 외부 공개 배포입니다. 사용자 승인 후 실행합니다.**
5. 빌드 로그의 Node/의존성 설치/빌드 종료와 성공 상태를 확인하고 실제 발급된 HTTPS *.pages.dev 주소를 기록합니다.
6. 다른 브랜치/PR의 Preview를 확인한 뒤, 승인받아 main에 병합합니다. main 변경은 자동 Production 배포를 유발할 수 있습니다.

아직 Pages 프로젝트·공개 URL은 생성하지 않았습니다. 공개 후 아래 검증을 완료해야 다른 사람에게 공유 가능한 상태를 확인할 수 있습니다.

## 3. 직접 업로드 — 대안

로컬에서 npm.cmd run build 후 생성된 **dist의 내용**을 Pages Direct Upload로 업로드합니다. 루트에 index.html이 있어야 하며 node_modules나 소스 폴더를 업로드하지 않습니다. Pages Direct Upload 프로젝트를 선택한 뒤 dist 폴더 또는 해당 내용을 루트로 담은 ZIP을 업로드할 수 있습니다. 로그인과 업로드/공개 배포 승인이 필요합니다.

CLI 대안을 선택할 때도 사용자 승인 후 아래를 실행합니다.

```powershell
npx.cmd wrangler login
npx.cmd wrangler pages deploy dist --project-name <실제-Pages-프로젝트명>
```

이 명령은 절차 설명이며 이번 작업에서 실행하지 않습니다. CLI를 프로젝트 의존성으로 추가할 필요는 없습니다.

**처음부터 Git 연동을 선택하세요.** Direct Upload 프로젝트는 나중에 같은 프로젝트를 Git 연동으로 바꿀 수 없어 새 프로젝트가 필요합니다. Git 연동 프로젝트도 대시보드 드래그앤드롭 방식으로 전환되지 않습니다. 기존 Git 프로젝트에 대한 Wrangler 수동 배포는 지원되지만 이번 기본 운영은 Git 자동 배포입니다. 기존 프로젝트를 임의로 삭제하거나 전환하지 마세요.

## 4. 배포 후 확인

- HTTPS, 첫 화면, JS/CSS/아이콘/소개 페이지의 성공 응답과 MIME, 콘솔 오류를 확인합니다.
- START가 배치로 전달되지 않음 → 탭/클릭/Space → PERFECT → 부분 절단·낙하 → X/Z 교대 → 10층 이상 → 완전 실패 → 결과 → RETRY를 확인합니다.
- 새로고침 후 최고 기록, 저장소 차단, 백그라운드 복귀와 WebGL 복구를 확인합니다.
- 375×812, 390×844, 430×932, 데스크톱 및 실제 스마트폰 주소창 변화·세로모드·화면 회전을 확인합니다.
- /about.html은 소개 페이지, 알 수 없는 경로는 404인지 확인합니다. 실제 ads.txt를 추가한 후에는 /ads.txt가 HTML이 아닌 올바른 원문을 반환해야 합니다.
- 로그인하지 않은 다른 기기에서 접근 권한을 확인하고 PC를 꺼도 Pages HTTPS 주소가 접속되는지 확인합니다.

최고 기록은 브라우저·기기·origin별 localStorage입니다. Preview, pages.dev 주소, 사용자 도메인은 기록을 공유하지 않습니다. 온라인 공용 랭킹은 없습니다.

## 5. 도메인·업데이트·복구

사용자 승인 후 Pages 프로젝트 → Custom domains에서 소유 도메인을 연결하고 대시보드가 제시하는 현재 DNS 설정과 인증서 상태를 확인합니다. DNS 값은 추측하지 마세요. 실제 URL이 확정되면 canonical/og:url과 실제 공유 이미지 URL을 검토합니다.

업데이트는 코드 수정 → npm.cmd run qa → 변경 브랜치 Push 승인 → Preview 검증 → main 병합 및 공개 반영 승인 순서입니다. 장애 시 빌드 로그와 배포된 해시 파일, Node 버전, 루트/dist 설정을 확인하고 사용자 승인 후 이전 정상 배포의 롤백을 검토합니다. 저장 기록을 유지하려면 localStorage 키를 불필요하게 변경하지 마세요.

## 6. 비용·광고 범위

무료 정적 Pages를 기본으로 준비했습니다. Functions·Workers·KV·R2 등 추가 서비스를 설정하지 않았습니다. 무료도 빌드/파일 한도와 서비스 약관이 적용됩니다. 현재 공식 문서의 Free 빌드는 월 500회, 개별 파일 최대 25MiB이며 실제 계정의 최신 제한을 배포 시 확인하세요. 무제한 비용 보장이나 광고 사업의 적격성/승인을 의미하지 않습니다.

광고·개인정보 준비는 MONETIZATION.md를 참고하세요. 게시자 ID 없이 광고 스크립트·가짜 ads.txt를 추가하지 않습니다. AdSense 승인은 별도 신청·심사 절차입니다.

## 7. 전환 및 장애 점검

Vercel CLI 절차와 사용하지 않는 .vercelignore를 제거했습니다. 로컬 .vercel/와 vercel.json은 없으며 이전 작업에서도 외부 프로젝트를 생성하지 않았습니다. 사용자 계정에 별도로 존재하는 Vercel 프로젝트는 이 로컬 조사로 확인할 수 없고 삭제/요금제 변경을 수행하지 않았습니다. .gitignore의 .vercel/ 제외는 향후 로컬 상태 유입 방지용으로 유지합니다.

npm.ps1 오류는 npm.cmd를 사용하고, EPERM은 해당 프로젝트 서버/파일 잠금을 확인합니다. 원격 빌드 실패는 Node 24, lockfile, 빌드 로그, 루트/dist를 확인합니다. Three.js 약 535kB(gzip 132kB) 경고는 임계값 변경 없이 유지했습니다. 엔진은 첫 3D 화면부터 필요해 불필요한 동적 import는 도입하지 않았습니다. DPR/공유 자원/조각 회수는 유지합니다. 로컬 Preview는 Cloudflare CDN·원격 빌드·실기기 성능을 보장하지 않습니다.

공식 문서: [Git 연동](https://developers.cloudflare.com/pages/get-started/git-integration/), [빌드 설정](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Node 빌드 이미지](https://developers.cloudflare.com/pages/configuration/build-image/), [직접 업로드](https://developers.cloudflare.com/pages/get-started/direct-upload/), [한도](https://developers.cloudflare.com/pages/platform/limits/).

