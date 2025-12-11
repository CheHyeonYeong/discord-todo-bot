# Discord Todo Bot

Discord 슬래시 커맨드로 할 일을 관리할 수 있는 봇입니다. 날짜별 스레드로 자동 정리되고 주간 리포트를 제공합니다.

## ✨ 주요 기능

### 📅 스레드 기반 일일 Todo 관리
- 첫 할 일 추가 시 자동으로 날짜별 스레드 생성 (예: "📅 12월 11일 (수) Todo")
- 모든 todo 활동이 해당 날짜 스레드 내에서 진행
- 24시간 후 자동 보관

### 🔔 채널 멤버 알림
- `/todo add` 명령어에 `알림` 옵션으로 채널 멤버에게 알림
- @here 멘션과 임베드로 깔끔하게 표시

### ⏰ 일일 자동 정리
- 매일 자정(00:00) 어제 스레드 자동 보관
- `/todo yesterday` - 어제 미완료 항목 확인
- `/todo carry` - 선택적으로 오늘로 이월 (특정 번호 또는 all)

### 📊 주간 성과 리포트
- 매주 일요일 밤 9시 DM으로 주간 리포트 발송
- `/todo weekly` - 언제든 즉시 확인 가능
- 날짜별 완료 항목, 완료율 표시

### ⚙️ 사용자 설정
- 하루 시작 시간 설정 가능
- 주간 리포트 요일 설정 가능
- 사용자별 개별 관리

## 📋 슬래시 커맨드

```
/todo add 할일:[내용] 알림:[true/false]
  - 할 일 추가 (쉼표로 구분하여 여러 개 가능)
  - 알림 옵션으로 채널 멤버에게 알림 전송

/todo list
  - 오늘의 할 일 목록 보기

/todo done 번호:[숫자]
  - 할 일 완료 처리

/todo delete 번호:[숫자]
  - 할 일 삭제

/todo yesterday
  - 어제의 미완료 항목 확인

/todo carry 번호들:[1,2,3 또는 all]
  - 어제의 미완료 항목을 오늘로 이월

/todo weekly
  - 주간 리포트 즉시 확인

/todo settings 하루시작시간:[0-23] 주간리포트요일:[0-6]
  - 봇 설정 (하루 시작 시간, 주간 리포트 요일)

/todo help
  - 도움말 보기
```

## 🚀 Discord Bot 설정

### 1. Bot Token 및 Client ID 얻기

1. https://discord.com/developers/applications 접속
2. "New Application" 클릭
3. 봇 이름 입력 후 생성
4. **General Information** 탭에서 **APPLICATION ID** 복사 (이것이 CLIENT_ID)
5. 왼쪽 메뉴에서 "Bot" 클릭
6. "Reset Token" 클릭하여 토큰 복사
7. Privileged Gateway Intents에서 다음 항목 활성화:
   - ✅ MESSAGE CONTENT INTENT
   - ✅ SERVER MEMBERS INTENT (선택사항)
8. 왼쪽 메뉴에서 "OAuth2" → "URL Generator" 클릭
9. Scopes: `bot`, `applications.commands` 체크
10. Bot Permissions:
    - `Send Messages`
    - `Read Messages/View Channels`
    - `Create Public Threads`
    - `Send Messages in Threads`
    - `Manage Threads`
11. 생성된 URL로 봇을 서버에 초대

### 2. 슬래시 커맨드 등록

봇을 처음 설정할 때 **한 번만** 실행:

```bash
# config.json 파일 생성 (로컬 테스트용)
{
    "token": "YOUR_BOT_TOKEN",
    "clientId": "YOUR_CLIENT_ID"
}

# 슬래시 커맨드 등록
node deploy-commands.js
```

성공 메시지가 보이면 Discord에서 `/todo`를 입력했을 때 자동완성이 나타납니다!

## 🌐 Koyeb 배포 방법 (무료 24시간 실행)

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

### 4. Persistent Storage 설정 (데이터 유지를 위해 필수!) ⚠️

재배포 시 데이터가 날아가는 것을 방지하기 위해 **Persistent Volume**을 설정합니다:

1. **Volumes** 탭으로 이동
2. **Add Volume** 클릭
3. 설정:
   - **Mount path**: `/data`
   - **Size**: `1 GB` (무료)
4. Volume 생성 완료!

### 5. 환경 변수 설정 ⚠️ 중요!

Build and deployment 섹션에서 Environment Variables 추가:

```bash
DISCORD_TOKEN         # Discord 봇 토큰
CLIENT_ID             # Discord Application ID
PORT                  # 8000
APP_URL               # https://your-app-name.koyeb.app (앱 생성 후 확인 가능)

# Persistent Storage 경로 (Volume 설정 후)
TODO_FILE_PATH        # /data/todos.json
SETTINGS_FILE_PATH    # /data/settings.json
```

**중요**:
- `config.json`이 Git에 포함되지 않으므로, Koyeb에서는 **반드시** 환경 변수로 설정해야 합니다!
- Volume을 설정하지 않으면 **재배포 시 모든 할 일 데이터가 삭제**됩니다!

### 6. 빌드 설정
- Build command: `npm install`
- Run command: `npm start`
- Port: `8000`

### 7. Health Check 설정
- Health check path: `/health`
- Port: `8000`

### 8. 배포 단계

1. "Deploy" 버튼 클릭
2. 배포 완료 후 앱 URL 확인 (예: `https://your-app-name.koyeb.app`)
3. Settings → Environment Variables에서 `APP_URL` 업데이트
4. 앱 재배포 (자동 또는 수동)

### 9. 슬래시 커맨드 등록 (재배포 시)

**방법 1: 로컬에서 등록 (추천)**
```bash
# 로컬에서 한 번만 실행
node deploy-commands.js
```

**방법 2: Koyeb 콘솔에서**
- Koyeb 대시보드 → 앱 → Terminal 탭
- `node deploy-commands.js` 실행

슬래시 커맨드는 Discord에 등록되므로 **한 번만** 실행하면 됩니다!

### 10. 작동 확인
- 브라우저에서 `https://your-app-name.koyeb.app/health` 접속
- `{"status":"healthy","uptime":...}` 응답이 보이면 성공
- Discord에서 `/todo` 입력 시 자동완성 확인
- `/todo help` 명령어로 전체 기능 확인

### ⚠️ 재배포 시 주의사항

**Persistent Volume 설정 시 (권장):**
- ✅ `todos.json` - Volume에 저장되어 재배포 후에도 유지
- ✅ `settings.json` - Volume에 저장되어 재배포 후에도 유지
- ✅ 슬래시 커맨드 등록 (Discord에 저장)
- ✅ 환경 변수 (Koyeb에 저장)

**Volume 미설정 시:**
- ❌ `todos.json` - 재배포 시 모든 할 일 데이터 삭제
- ❌ `settings.json` - 재배포 시 설정 초기화
- ⚠️ **반드시 위의 "4. Persistent Storage 설정" 참고!**

### Self-Ping 메커니즘
이 봇은 3분마다 자동으로 `/health` 엔드포인트에 요청을 보내 Koyeb의 scale-to-zero 정책으로 인한 슬립 모드를 방지합니다. 이를 통해 24시간 무료로 실행됩니다.

## 💻 로컬 실행

```bash
# 패키지 설치
npm install

# config.json 파일 생성
{
    "token": "YOUR_BOT_TOKEN",
    "clientId": "YOUR_CLIENT_ID"
}

# 슬래시 커맨드 등록 (최초 1회)
node deploy-commands.js

# 봇 실행
node index.js
```

## 📦 필요한 것

- Discord Bot Token
- Discord Application ID (Client ID)
- Node.js (v16 이상)
- 의존성:
  - discord.js (v14+)
  - express
  - axios
  - node-cron

## 🗂️ 데이터 구조

```json
{
  "userId": {
    "2024-12-11": {
      "threadId": "123456789",
      "todos": [
        {
          "id": 1234567890,
          "text": "할 일 내용",
          "completed": false,
          "createdAt": "2024-12-11T00:00:00.000Z",
          "completedAt": null
        }
      ]
    }
  }
}
```

## 🤖 자동화 기능

- **매일 00:00**: 어제 스레드 자동 보관
- **매주 일요일 21:00**: 주간 리포트 DM 발송

## 📝 라이센스

ISC

## 👥 기여

이슈나 풀 리퀘스트는 언제든지 환영합니다!
