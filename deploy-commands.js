const { REST, Routes, SlashCommandBuilder } = require('discord.js');

// 환경 변수 또는 config.json에서 토큰과 클라이언트 ID 가져오기
let token, clientId;
if (process.env.DISCORD_TOKEN && process.env.CLIENT_ID) {
    token = process.env.DISCORD_TOKEN;
    clientId = process.env.CLIENT_ID;
} else {
    const config = require('./config.json');
    token = config.token;
    clientId = config.clientId;
}

// 슬래시 커맨드 정의
const commands = [
    new SlashCommandBuilder()
        .setName('todo')
        .setDescription('할 일 관리')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('할 일 추가 (쉼표로 구분하여 여러 개 추가 가능)')
                .addStringOption(option =>
                    option
                        .setName('할일')
                        .setDescription('추가할 할 일 (예: 숙제하기 또는 숙제하기, 장보기, 운동하기)')
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option
                        .setName('알림')
                        .setDescription('채널 멤버들에게 알림을 보낼까요?')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('오늘의 할 일 목록 보기')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('done')
                .setDescription('할 일 완료 처리')
                .addIntegerOption(option =>
                    option
                        .setName('번호')
                        .setDescription('완료할 할 일 번호')
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('할 일 삭제')
                .addIntegerOption(option =>
                    option
                        .setName('번호')
                        .setDescription('삭제할 할 일 번호')
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('yesterday')
                .setDescription('어제의 미완료 항목 확인')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('carry')
                .setDescription('어제의 미완료 항목을 오늘로 이월')
                .addStringOption(option =>
                    option
                        .setName('번호들')
                        .setDescription('이월할 항목 번호 (예: 1,2,3 또는 all)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('weekly')
                .setDescription('주간 리포트 즉시 확인')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('봇 설정 (하루 시작 시간, 주간 리포트 요일 등)')
                .addIntegerOption(option =>
                    option
                        .setName('하루시작시간')
                        .setDescription('하루가 시작되는 시간 (0-23)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(23)
                )
                .addIntegerOption(option =>
                    option
                        .setName('주간리포트요일')
                        .setDescription('주간 리포트를 보낼 요일 (0:일요일 ~ 6:토요일)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(6)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('help')
                .setDescription('도움말 보기')
        )
].map(command => command.toJSON());

const rest = new REST().setToken(token);

// 슬래시 커맨드 등록
(async () => {
    try {
        console.log(`${commands.length}개의 슬래시 커맨드를 등록하는 중...`);

        // 전역 커맨드로 등록 (모든 서버에 적용)
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log(`✅ ${data.length}개의 슬래시 커맨드가 성공적으로 등록되었습니다!`);
    } catch (error) {
        console.error('슬래시 커맨드 등록 중 오류 발생:', error);
    }
})();
