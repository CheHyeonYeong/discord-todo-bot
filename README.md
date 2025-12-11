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

## Replit 배포 방법

### 1. Replit 계정 생성
1. https://replit.com 접속
2. 계정 생성 또는 로그인

### 2. 새 Repl 만들기
1. "Create Repl" 클릭
2. Template: "Node.js" 선택
3. Title: 원하는 이름 입력 (예: discord-todo-bot)
4. "Create Repl" 클릭

### 3. 파일 업로드
다음 파일들을 Replit에 복사:
- `index.js`
- `package.json`
- `todos.json`
- `.replit`

### 4. config.json 파일 생성
Replit에서 새 파일 `config.json` 생성 후 다음 내용 입력:
```json
{
  "token": "YOUR_DISCORD_BOT_TOKEN"
}
```

**중요:** `YOUR_DISCORD_BOT_TOKEN`을 실제 Discord 봇 토큰으로 교체하세요.

### 5. Discord Bot Token 얻기
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

### 6. 환경 변수 설정 (권장)
보안을 위해 토큰을 환경 변수로 설정:
1. Replit 왼쪽 하단 "Secrets" 클릭
2. Key: `DISCORD_TOKEN`, Value: 봇 토큰 입력
3. `config.json` 대신 환경 변수 사용하려면 `index.js` 수정 필요

### 7. 실행
1. Replit 상단의 "Run" 버튼 클릭
2. 콘솔에 "Ready! Logged in as [봇이름]" 표시되면 성공

### 8. 24시간 실행 유지 (선택사항)
Replit 무료 플랜은 비활성 시 슬립 모드로 전환됩니다.
24시간 실행을 원하면:
- Replit의 "Always On" 기능 사용 (유료)
- 또는 UptimeRobot 같은 서비스로 주기적으로 ping

## 로컬 실행

```bash
npm install
node index.js
```

## 필요한 것

- Discord Bot Token
- Node.js (v16 이상)
- discord.js 라이브러리
