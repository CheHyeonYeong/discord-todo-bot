# Discord Todo Bot

Discord에서 할 일을 관리할 수 있는 간단한 봇입니다.

## 기능

- 할 일 추가 (단일 또는 여러 개)
- 할 일 목록 조회
- 할 일 완료 처리
- 할 일 삭제
- 사용자별 개별 관리

## 명령어

- `!todo add [할 일]` - 할 일 추가
- `!todo add [할 일1], [할 일2], [할 일3]` - 여러 할 일 추가
- `!todo list` - 할 일 목록 보기
- `!todo done [번호]` - 할 일 완료 처리
- `!todo delete [번호]` - 할 일 삭제
- `!todo help` - 도움말 보기

## Discord Bot Token 얻기

1. https://discord.com/developers/applications 접속
2. "New Application" 클릭
3. 봇 이름 입력 후 생성
4. 왼쪽 메뉴에서 "Bot" 클릭
5. "Reset Token" 클릭하여 토큰 복사
6. Privileged Gateway Intents에서 다음 항목 활성화:
   - MESSAGE CONTENT INTENT
   - SERVER MEMBERS INTENT (선택사항)
7. 왼쪽 메뉴에서 "OAuth2" → "URL Generator" 클릭
8. Scopes: `bot` 체크
9. Bot Permissions: `Send Messages`, `Read Messages/View Channels` 체크
10. 생성된 URL로 봇을 서버에 초대

## Koyeb 배포 방법 (무료 24시간 실행)

### 1. GitHub 레포지토리 준비
1. 코드를 GitHub에 push
2. **중요:** `config.json` 파일은 `.gitignore`에 포함되어 있어 push되지 않습니다

### 2. Koyeb 계정 생성
1. https://www.koyeb.com 접속
2. GitHub 계정으로 가입

### 3. 새 앱 생성
1. Koyeb 대시보드에서 "Create App" 클릭
2. "GitHub" 선택
3. 레포지토리 선택
4. Branch: `main` 선택

### 4. 환경 변수 설정
Build and deployment 섹션에서 Environment Variables 추가:
- `DISCORD_TOKEN`: Discord 봇 토큰
- `APP_URL`: Koyeb 앱 URL (예: `https://your-app-name.koyeb.app`)
  - 앱 생성 후 URL을 확인하고, 다시 설정에서 업데이트 필요

### 5. 빌드 설정
- Build command: `npm install`
- Run command: `npm start`
- Port: `8000`

### 6. Health Check 설정
- Health check path: `/health`
- Port: `8000`

### 7. 배포
1. "Deploy" 버튼 클릭
2. 배포 완료 후 앱 URL 확인
3. 환경 변수에 `APP_URL` 추가 (앱 URL 복사하여 추가)
4. 앱 재배포

### 8. 작동 확인
- 브라우저에서 `https://your-app-name.koyeb.app/health` 접속
- `{"status":"healthy","uptime":...}` 응답이 보이면 성공
- Discord에서 봇 명령어 테스트

### Self-Ping 메커니즘
이 봇은 3분마다 자동으로 `/health` 엔드포인트에 요청을 보내 Koyeb의 scale-to-zero 정책으로 인한 슬립 모드를 방지합니다. 이를 통해 24시간 무료로 실행됩니다.

## 로컬 실행

```bash
npm install
node index.js
```

## 필요한 것

- Discord Bot Token
- Node.js (v16 이상)
- discord.js 라이브러리
