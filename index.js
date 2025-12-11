// 1. 주요 클래스 가져오기
const { Client, Events, GatewayIntentBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs').promises;
const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

// 환경 변수 또는 config.json에서 토큰 가져오기
let token;
if (process.env.DISCORD_TOKEN) {
    token = process.env.DISCORD_TOKEN;
} else {
    const config = require('./config.json');
    token = config.token;
}

// 2. 클라이언트 객체 생성
const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
]});

// 3. 봇이 준비됐을때 한번만 표시할 메시지
client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    setupCronJobs();
});

// Todo 파일 경로 (환경 변수로 설정 가능, 기본값은 현재 디렉토리)
const TODO_FILE = process.env.TODO_FILE_PATH || './todos.json';
const SETTINGS_FILE = process.env.SETTINGS_FILE_PATH || './settings.json';

// 기본 설정
const DEFAULT_SETTINGS = {
    dayStartHour: 0, // 자정
    weeklyReportDay: 0, // 일요일
    timezone: 'Asia/Seoul'
};

// 날짜 헬퍼 함수
function getToday() {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}

function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

function getDateString(date) {
    const d = new Date(date);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dayOfWeek = days[d.getDay()];
    return `${month}월 ${day}일 (${dayOfWeek})`;
}

// Todo 데이터 로드
async function loadTodos() {
    try {
        const data = await fs.readFile(TODO_FILE, 'utf8');
        const parsed = JSON.parse(data);
        console.log(`[DEBUG] Loaded todos from ${TODO_FILE}:`, JSON.stringify(parsed, null, 2));
        return parsed;
    } catch (error) {
        console.log(`[DEBUG] No existing todos file at ${TODO_FILE}, returning empty object`);
        return {};
    }
}

// Todo 데이터 저장
async function saveTodos(todos) {
    try {
        await fs.writeFile(TODO_FILE, JSON.stringify(todos, null, 2));
        console.log(`[DEBUG] Saved todos to ${TODO_FILE}:`, JSON.stringify(todos, null, 2));
    } catch (error) {
        console.error(`[ERROR] Failed to save todos to ${TODO_FILE}:`, error);
        throw error;
    }
}

// 설정 데이터 로드
async function loadSettings() {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (error) {
        return DEFAULT_SETTINGS;
    }
}

// 설정 데이터 저장
async function saveSettings(settings) {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// 데이터 초기화 (스레드 생성과 분리)
async function initializeTodoData(userId, date) {
    const todos = await loadTodos();

    // 사용자 데이터 초기화
    if (!todos[userId]) {
        todos[userId] = {};
    }

    // 해당 날짜 데이터 초기화
    if (!todos[userId][date]) {
        todos[userId][date] = {
            threadId: null,
            todos: []
        };
    }

    await saveTodos(todos);
    return todos;
}

// 스레드 찾기 또는 생성
async function getOrCreateThread(channel, userId, date) {
    // 1. 먼저 데이터 초기화 (스레드 생성 전에 반드시!)
    const todos = await initializeTodoData(userId, date);

    // 2. 현재 위치가 이미 스레드인지 확인
    if (channel.isThread()) {
        // 스레드 내부에서 호출된 경우, 해당 스레드 반환
        // threadId를 저장 (나중에 참조용)
        if (!todos[userId][date].threadId) {
            todos[userId][date].threadId = channel.id;
            await saveTodos(todos);
        }
        return channel;
    }

    // 3. 기존 스레드가 있으면 찾기
    if (todos[userId][date].threadId) {
        try {
            // Guild에서 스레드 찾기
            const thread = await channel.guild.channels.fetch(todos[userId][date].threadId);
            if (thread && thread.isThread()) {
                // 스레드가 보관되었거나 잠겼으면 재활성화
                if (thread.archived) {
                    await thread.setArchived(false);
                }
                return thread;
            }
        } catch (error) {
            console.log('기존 스레드를 찾을 수 없음, 새로 생성합니다.');
        }
    }

    // 4. 새 스레드 생성 - 텍스트/뉴스 채널에서만 가능
    if (!channel.isTextBased() || channel.isDMBased()) {
        throw new Error('스레드는 서버의 텍스트 채널에서만 생성할 수 있습니다.');
    }

    const dateStr = getDateString(date);
    const starterMessage = await channel.send(`📅 **${dateStr} Todo 리스트**\n할 일을 추가하려면 \`/todo add\` 명령어를 사용하세요!`);

    // 메시지로부터 스레드 생성
    const thread = await starterMessage.startThread({
        name: `📅 ${dateStr} Todo`,
        autoArchiveDuration: 1440, // 24시간
        reason: `${date}의 할 일 관리`
    });

    todos[userId][date].threadId = thread.id;
    await saveTodos(todos);

    return thread;
}

// 4. 슬래시 커맨드 처리
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'todo') return;

    // ⚠️ 즉시 defer로 응답 (3초 타임아웃 방지) - 맨 처음에!
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    } catch (error) {
        console.error('Failed to defer reply:', error);
        return; // defer 실패 시 조기 종료
    }

    const userId = interaction.user.id;
    const subcommand = interaction.options.getSubcommand();
    const today = getToday();
    const yesterday = getYesterday();

    try {
        switch (subcommand) {
            case 'add': {

                const todoText = interaction.options.getString('할일');
                const notify = interaction.options.getBoolean('알림') || false;

                if (!todoText) {
                    return interaction.editReply({ content: '할 일을 입력해주세요!' });
                }

                // 쉼표로 구분하여 여러 할 일 추가
                const todoItems = todoText.split(',').map(item => item.trim()).filter(item => item);

                if (todoItems.length === 0) {
                    return interaction.editReply({ content: '할 일을 입력해주세요!' });
                }

                // 1. 먼저 데이터 초기화 (스레드 생성 전에!)
                const todos = await initializeTodoData(userId, today);

                // 2. 할 일 추가
                const addedTodos = [];
                for (const item of todoItems) {
                    const newTodo = {
                        id: Date.now() + Math.random(),
                        text: item,
                        completed: false,
                        createdAt: new Date().toISOString(),
                        completedAt: null
                    };
                    todos[userId][today].todos.push(newTodo);
                    addedTodos.push(item);
                    await new Promise(resolve => setTimeout(resolve, 1));
                }

                await saveTodos(todos);

                // 3. 스레드 생성 또는 가져오기 (데이터가 이미 초기화된 상태)
                const thread = await getOrCreateThread(interaction.channel, userId, today);

                // 4. 스레드에 응답
                let replyMessage;
                if (addedTodos.length === 1) {
                    replyMessage = `✅ 할 일이 추가되었습니다: ${addedTodos[0]}`;
                } else {
                    replyMessage = `✅ ${addedTodos.length}개의 할 일이 추가되었습니다:\n${addedTodos.map(t => `• ${t}`).join('\n')}`;
                }

                await thread.send(replyMessage);
                await interaction.editReply({ content: `스레드에 할 일을 추가했습니다! ${thread}` });

                // 알림 기능
                if (notify) {
                    const embed = new EmbedBuilder()
                        .setColor(0x00AE86)
                        .setTitle('🔔 새로운 할 일이 추가되었습니다!')
                        .setDescription(`**${interaction.user.username}**님이 오늘의 할 일을 추가했습니다!`)
                        .addFields({
                            name: '추가된 할 일',
                            value: addedTodos.map(t => `• ${t}`).join('\n')
                        })
                        .setTimestamp();

                    await interaction.channel.send({
                        content: '@here',
                        embeds: [embed]
                    });
                }
                break;
            }

            case 'list': {
                const todos = await loadTodos();

                console.log(`[DEBUG] list command - userId: ${userId}, today: ${today}`);
                console.log(`[DEBUG] todos[userId]:`, todos[userId]);
                console.log(`[DEBUG] todos[userId][today]:`, todos[userId]?.[today]);

                if (!todos[userId] || !todos[userId][today] || todos[userId][today].todos.length === 0) {
                    console.log(`[DEBUG] No todos found for user ${userId} on ${today}`);
                    return interaction.editReply({ content: '📝 오늘 등록된 할 일이 없습니다.' });
                }

                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle(`📋 ${getDateString(today)} 할 일 목록`)
                    .setDescription(
                        todos[userId][today].todos.map((todo, index) => {
                            const status = todo.completed ? '✅' : '⬜';
                            return `${index + 1}. ${status} ${todo.text}`;
                        }).join('\n')
                    )
                    .setFooter({ text: `총 ${todos[userId][today].todos.length}개` })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'done': {
                const todoNumber = interaction.options.getInteger('번호');
                const todos = await loadTodos();

                if (!todos[userId] || !todos[userId][today] || todos[userId][today].todos.length === 0) {
                    return interaction.editReply({ content: '오늘 등록된 할 일이 없습니다.' });
                }

                if (todoNumber < 1 || todoNumber > todos[userId][today].todos.length) {
                    return interaction.editReply({ content: '올바른 번호를 입력해주세요!' });
                }

                const todo = todos[userId][today].todos[todoNumber - 1];
                todo.completed = true;
                todo.completedAt = new Date().toISOString();
                await saveTodos(todos);

                const thread = await getOrCreateThread(interaction.channel, userId, today);
                await thread.send(`✅ 완료 처리되었습니다: ${todo.text}`);
                await interaction.editReply({ content: '완료 처리되었습니다!' });
                break;
            }

            case 'delete': {
                const todoNumber = interaction.options.getInteger('번호');
                const todos = await loadTodos();

                if (!todos[userId] || !todos[userId][today] || todos[userId][today].todos.length === 0) {
                    return interaction.editReply({ content: '오늘 등록된 할 일이 없습니다.' });
                }

                if (todoNumber < 1 || todoNumber > todos[userId][today].todos.length) {
                    return interaction.editReply({ content: '올바른 번호를 입력해주세요!' });
                }

                const deleted = todos[userId][today].todos.splice(todoNumber - 1, 1)[0];
                await saveTodos(todos);

                const thread = await getOrCreateThread(interaction.channel, userId, today);
                await thread.send(`🗑️ 삭제되었습니다: ${deleted.text}`);
                await interaction.editReply({ content: '삭제되었습니다!' });
                break;
            }

            case 'yesterday': {
                const todos = await loadTodos();

                if (!todos[userId] || !todos[userId][yesterday]) {
                    return interaction.editReply({ content: '어제 등록된 할 일이 없습니다.' });
                }

                const incompleteTodos = todos[userId][yesterday].todos.filter(t => !t.completed);

                if (incompleteTodos.length === 0) {
                    return interaction.editReply({ content: '✅ 어제의 모든 할 일을 완료했습니다!' });
                }

                const embed = new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setTitle(`⚠️ ${getDateString(yesterday)} 미완료 항목`)
                    .setDescription(
                        incompleteTodos.map((todo, index) => {
                            return `${index + 1}. ${todo.text}`;
                        }).join('\n')
                    )
                    .setFooter({ text: `총 ${incompleteTodos.length}개 | /todo carry 명령어로 오늘로 이월할 수 있습니다` })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'carry': {
                const numbersInput = interaction.options.getString('번호들') || 'all';
                const todos = await loadTodos();

                if (!todos[userId] || !todos[userId][yesterday]) {
                    return interaction.editReply({ content: '어제 등록된 할 일이 없습니다.' });
                }

                const incompleteTodos = todos[userId][yesterday].todos.filter(t => !t.completed);

                if (incompleteTodos.length === 0) {
                    return interaction.editReply({ content: '어제의 미완료 항목이 없습니다.' });
                }

                let todosToCarry = [];

                if (numbersInput.toLowerCase() === 'all') {
                    todosToCarry = incompleteTodos;
                } else {
                    const numbers = numbersInput.split(',').map(n => parseInt(n.trim()));
                    for (const num of numbers) {
                        if (num >= 1 && num <= incompleteTodos.length) {
                            todosToCarry.push(incompleteTodos[num - 1]);
                        }
                    }
                }

                if (todosToCarry.length === 0) {
                    return interaction.editReply({ content: '올바른 번호를 입력해주세요!' });
                }

                // 오늘로 이월
                if (!todos[userId][today]) {
                    todos[userId][today] = {
                        threadId: null,
                        todos: []
                    };
                }

                for (const todo of todosToCarry) {
                    const newTodo = {
                        id: Date.now() + Math.random(),
                        text: `[어제 이월] ${todo.text}`,
                        completed: false,
                        createdAt: new Date().toISOString(),
                        completedAt: null
                    };
                    todos[userId][today].todos.push(newTodo);
                    await new Promise(resolve => setTimeout(resolve, 1));
                }

                await saveTodos(todos);

                const thread = await getOrCreateThread(interaction.channel, userId, today);
                await thread.send(`📥 어제의 ${todosToCarry.length}개 항목을 오늘로 이월했습니다:\n${todosToCarry.map(t => `• ${t.text}`).join('\n')}`);
                await interaction.editReply({ content: `${todosToCarry.length}개 항목을 오늘로 이월했습니다!` });
                break;
            }

            case 'weekly': {
                const report = await generateWeeklyReport(userId);
                await interaction.editReply({ embeds: [report] });
                break;
            }

            case 'settings': {
                const settings = await loadSettings();
                const dayStartHour = interaction.options.getInteger('하루시작시간');
                const weeklyReportDay = interaction.options.getInteger('주간리포트요일');

                if (dayStartHour !== null) {
                    settings.dayStartHour = dayStartHour;
                }

                if (weeklyReportDay !== null) {
                    settings.weeklyReportDay = weeklyReportDay;
                }

                await saveSettings(settings);

                const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('⚙️ 봇 설정')
                    .addFields(
                        { name: '하루 시작 시간', value: `${settings.dayStartHour}시`, inline: true },
                        { name: '주간 리포트 요일', value: days[settings.weeklyReportDay], inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'help': {
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('📚 Todo Bot 사용법')
                    .setDescription('Discord 슬래시 커맨드로 할 일을 관리하세요!')
                    .addFields(
                        {
                            name: '/todo add',
                            value: '할 일 추가 (쉼표로 구분하여 여러 개 가능)\n`알림` 옵션으로 채널 멤버에게 알림 가능'
                        },
                        { name: '/todo list', value: '오늘의 할 일 목록 보기' },
                        { name: '/todo done', value: '할 일 완료 처리' },
                        { name: '/todo delete', value: '할 일 삭제' },
                        { name: '/todo yesterday', value: '어제의 미완료 항목 확인' },
                        { name: '/todo carry', value: '어제의 미완료 항목을 오늘로 이월\n`번호들` 옵션: 1,2,3 또는 all' },
                        { name: '/todo weekly', value: '주간 리포트 즉시 확인' },
                        { name: '/todo settings', value: '봇 설정 (하루 시작 시간, 주간 리포트 요일)' }
                    )
                    .setFooter({ text: '매일 스레드가 자동 생성되어 날짜별로 관리됩니다!' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                break;
            }

            default:
                await interaction.editReply({ content: '알 수 없는 명령어입니다. `/todo help`로 사용법을 확인하세요.' });
        }
    } catch (error) {
        console.error('Error handling todo command:', error);

        // 안전한 에러 응답 처리
        try {
            if (interaction.deferred) {
                // defer했으면 editReply 사용
                await interaction.editReply({ content: '❌ 오류가 발생했습니다. 다시 시도해주세요.' });
            } else if (!interaction.replied) {
                // 아직 응답 안했으면 reply
                await interaction.editReply({ content: '❌ 오류가 발생했습니다. 다시 시도해주세요.' });
            }
            // 이미 replied면 아무것도 하지 않음 (에러 로그만)
        } catch (replyError) {
            console.error('Failed to send error message:', replyError);
            // 에러 응답도 실패 - 조용히 무시
        }
    }
});

// 주간 리포트 생성
async function generateWeeklyReport(userId) {
    const todos = await loadTodos();
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6); // 7일 전부터

    let totalCompleted = 0;
    let totalTodos = 0;
    const dailyReports = [];

    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        if (todos[userId] && todos[userId][dateStr]) {
            const dayTodos = todos[userId][dateStr].todos;
            const completed = dayTodos.filter(t => t.completed);

            totalTodos += dayTodos.length;
            totalCompleted += completed.length;

            if (dayTodos.length > 0) {
                dailyReports.push({
                    date: dateStr,
                    dateStr: getDateString(dateStr),
                    completed: completed.length,
                    total: dayTodos.length,
                    items: completed.map(t => t.text)
                });
            }
        }
    }

    const completionRate = totalTodos > 0 ? Math.round((totalCompleted / totalTodos) * 100) : 0;

    const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('📊 주간 성과 리포트')
        .setDescription(`**총 완료: ${totalCompleted}개 / ${totalTodos}개 (${completionRate}%)**`)
        .setTimestamp();

    if (dailyReports.length === 0) {
        embed.addFields({ name: '이번 주 활동', value: '등록된 할 일이 없습니다.' });
    } else {
        for (const report of dailyReports) {
            if (report.items.length > 0) {
                embed.addFields({
                    name: `✅ ${report.dateStr} (${report.completed}/${report.total})`,
                    value: report.items.slice(0, 5).map(t => `• ${t}`).join('\n') +
                           (report.items.length > 5 ? `\n... 외 ${report.items.length - 5}개` : '')
                });
            }
        }
    }

    return embed;
}

// Cron 작업 설정
function setupCronJobs() {
    // 매일 자정에 스레드 정리 (완료된 항목이 있는 스레드는 보관)
    cron.schedule('0 0 * * *', async () => {
        console.log('Daily cleanup running...');
        const todos = await loadTodos();

        for (const userId in todos) {
            const yesterday = getYesterday();
            if (todos[userId][yesterday] && todos[userId][yesterday].threadId) {
                try {
                    const channel = await client.channels.fetch(todos[userId][yesterday].threadId);
                    if (channel && channel.isThread()) {
                        await channel.setArchived(true);
                        console.log(`Archived thread for ${yesterday}`);
                    }
                } catch (error) {
                    console.error('Error archiving thread:', error);
                }
            }
        }
    }, {
        timezone: "Asia/Seoul"
    });

    // 매주 일요일 밤 9시에 주간 리포트 발송
    cron.schedule('0 21 * * 0', async () => {
        console.log('Sending weekly reports...');
        const todos = await loadTodos();

        for (const userId in todos) {
            try {
                const user = await client.users.fetch(userId);
                const report = await generateWeeklyReport(userId);
                await user.send({
                    content: '이번 주 수고하셨습니다! 주간 리포트를 확인해보세요 😊',
                    embeds: [report]
                });
            } catch (error) {
                console.error(`Error sending weekly report to ${userId}:`, error);
            }
        }
    }, {
        timezone: "Asia/Seoul"
    });

    console.log('Cron jobs setup complete');
}

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
