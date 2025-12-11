// 1. 주요 클래스 가져오기
const { Client, Events, GatewayIntentBits } = require('discord.js');
const fs = require('fs').promises;
const express = require('express');
const axios = require('axios');

// 환경 변수 또는 config.json에서 토큰 가져오기
let token;
if (process.env.DISCORD_TOKEN) {
    token = process.env.DISCORD_TOKEN;
} else {
    const config = require('./config.json');
    token = config.token;
}

// 2. 클라이언트 객체 생성 (Guilds관련, 메시지관련 인텐트 추가)
const client = new Client({ intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
]});

// 3. 봇이 준비됐을때 한번만(once) 표시할 메시지
client.once(Events.ClientReady, readyClient => {
console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Todo 파일 경로
const TODO_FILE = './todos.json';

// Todo 데이터 로드
async function loadTodos() {
    try {
        const data = await fs.readFile(TODO_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Todo 데이터 저장
async function saveTodos(todos) {
    await fs.writeFile(TODO_FILE, JSON.stringify(todos, null, 2));
}

// 4. 메시지 명령어 처리
client.on('messageCreate', async (message) => {
    // 봇 자신의 메시지는 무시
    if (message.author.bot) return;

    const userId = message.author.id;
    const content = message.content.trim();

    // !todo 명령어로 시작하는지 확인
    if (!content.startsWith('!todo')) return;

    const args = content.slice(5).trim().split(' ');
    const command = args[0]?.toLowerCase();

    const todos = await loadTodos();

    // 사용자별 todo 리스트 초기화
    if (!todos[userId]) {
        todos[userId] = [];
    }

    try {
        switch (command) {
            case 'add':
            case '추가': {
                const todoText = args.slice(1).join(' ');
                if (!todoText) {
                    return message.reply('할 일을 입력해주세요! 예: `!todo add 숙제하기` 또는 `!todo add 숙제하기, 장보기, 운동하기`');
                }

                // 쉼표로 구분하여 여러 할 일 추가
                const todoItems = todoText.split(',').map(item => item.trim()).filter(item => item);

                if (todoItems.length === 0) {
                    return message.reply('할 일을 입력해주세요!');
                }

                const addedTodos = [];
                for (const item of todoItems) {
                    const newTodo = {
                        id: Date.now() + Math.random(), // 고유 ID 생성
                        text: item,
                        completed: false,
                        createdAt: new Date().toISOString()
                    };
                    todos[userId].push(newTodo);
                    addedTodos.push(item);
                    await new Promise(resolve => setTimeout(resolve, 1)); // ID 중복 방지
                }

                await saveTodos(todos);

                if (addedTodos.length === 1) {
                    message.reply(`✅ 할 일이 추가되었습니다: ${addedTodos[0]}`);
                } else {
                    message.reply(`✅ ${addedTodos.length}개의 할 일이 추가되었습니다:\n${addedTodos.map(t => `• ${t}`).join('\n')}`);
                }
                break;
            }

            case 'list':
            case '목록': {
                if (todos[userId].length === 0) {
                    return message.reply('📝 등록된 할 일이 없습니다.');
                }

                let list = '📋 **나의 할 일 목록**\n\n';
                todos[userId].forEach((todo, index) => {
                    const status = todo.completed ? '✅' : '⬜';
                    list += `${index + 1}. ${status} ${todo.text}\n`;
                });

                message.reply(list);
                break;
            }

            case 'done':
            case '완료': {
                const todoNumber = parseInt(args[1]);
                if (isNaN(todoNumber) || todoNumber < 1 || todoNumber > todos[userId].length) {
                    return message.reply('올바른 번호를 입력해주세요! 예: `!todo done 1`');
                }

                const todo = todos[userId][todoNumber - 1];
                todo.completed = true;
                await saveTodos(todos);
                message.reply(`✅ 완료 처리되었습니다: ${todo.text}`);
                break;
            }

            case 'delete':
            case '삭제': {
                const todoNumber = parseInt(args[1]);
                if (isNaN(todoNumber) || todoNumber < 1 || todoNumber > todos[userId].length) {
                    return message.reply('올바른 번호를 입력해주세요! 예: `!todo delete 1`');
                }

                const deleted = todos[userId].splice(todoNumber - 1, 1)[0];
                await saveTodos(todos);
                message.reply(`🗑️ 삭제되었습니다: ${deleted.text}`);
                break;
            }

            case 'help':
            case '도움말': {
                const helpMessage = `
📚 **Todo Bot 사용법**

\`!todo add [할 일]\` - 할 일 추가 (쉼표로 구분하여 여러 개 추가 가능)
\`!todo list\` - 할 일 목록 보기
\`!todo done [번호]\` - 할 일 완료 처리
\`!todo delete [번호]\` - 할 일 삭제
\`!todo help\` - 도움말 보기

**예시:**
\`!todo add 숙제하기\`
\`!todo add 숙제하기, 장보기, 운동하기\` (여러 개 추가)
\`!todo list\`
\`!todo done 1\`
\`!todo delete 2\`
`;
                message.reply(helpMessage);
                break;
            }

            default:
                message.reply('알 수 없는 명령어입니다. `!todo help`로 사용법을 확인하세요.');
        }
    } catch (error) {
        console.error('Error handling todo command:', error);
        message.reply('❌ 오류가 발생했습니다. 다시 시도해주세요.');
    }
})

// 5. Express 서버 설정 (Health Check API)
const app = express();
const PORT = process.env.PORT || 8000;

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Health check server running on port ${PORT}`);
});

// 6. Self-ping 메커니즘 (3분마다)
const SELF_PING_INTERVAL = 3 * 60 * 1000; // 3분
const appUrl = process.env.APP_URL; // Koyeb 앱 URL

if (appUrl) {
    setInterval(async () => {
        try {
            const response = await axios.get(`${appUrl}/health`);
            console.log(`[Self-ping] Status: ${response.status} at ${new Date().toISOString()}`);
        } catch (error) {
            console.error('[Self-ping] Error:', error.message);
        }
    }, SELF_PING_INTERVAL);
    console.log('Self-ping mechanism activated');
}

// 7. 시크릿키(토큰)을 통해 봇 로그인 실행
client.login(token);