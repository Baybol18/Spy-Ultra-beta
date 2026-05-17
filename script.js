/**
 * SPY ULTRA: CHAOS THEORY — EVOLUTION
 * script.js — Full Game Engine v6.0
 * Senior Full-Stack implementation
 */

'use strict';

/* ════════════════════════════════════════════════════
   §1  DEBUG & RECOVERY SYSTEM
════════════════════════════════════════════════════ */
const SU_DEBUG = {
    log: (m) => console.log(`[Spy-Ultra-Debug]: ${m}`),
    warn: (m) => console.warn(`[Spy-Ultra-Debug]: ${m}`),
    error: (m) => console.error(`[Spy-Ultra-Debug]: ${m}`),
};

window.onerror = (msg, src, line, col, err) => {
    SU_DEBUG.error(`Runtime error: ${msg} @ ${src}:${line}`);
    try { emergencyRecovery(); } catch (e) { SU_DEBUG.error('Recovery failed: ' + e); }
};
window.addEventListener('unhandledrejection', (e) => {
    SU_DEBUG.error('Unhandled promise: ' + e.reason);
});

function emergencyRecovery() {
    SU_DEBUG.log('Recovery mode activated.');
    try {
        ['su_session', 'su_game_state'].forEach(k => sessionStorage.removeItem(k));
        Object.assign(G, makeEmptyGameState());
    } catch (e) { SU_DEBUG.warn('State reset failed: ' + e); }
    try {
        showScreen('menu');
        showTab('tab-game');
        showPopup('⚠ Система восстановлена', 'danger');
    } catch (e) { }
}

/* ════════════════════════════════════════════════════
   §2  CONSTANTS — 22 CHAOS ROLES
════════════════════════════════════════════════════ */
const CHAOS_ROLES = [
    {
        id: 'sheriff', name: 'Шериф', emoji: '🤠', type: 'active',
        desc: 'Проверь игрока. Угадал шпиона — победа. Ошибся — выбываешь.',
        tiers: {
            1: { passive: 'Можешь обвинить 1 игрока без штрафа' },
            2: { active: 'Проверка игрока (1 раз): открыть его роль только тебе' },
            3: { ult: 'Если угадал 2 раза подряд — мгновенная победа всей команды' }
        }
    },
    {
        id: 'bodyguard', name: 'Телохранитель', emoji: '🛡', type: 'passive',
        desc: 'При вылете выбранной цели — вылетаешь сам вместо неё.',
        tiers: {
            1: { passive: 'Защищаешь 1 игрока за игру' },
            2: { passive: 'Защита неограниченно + знаешь есть ли второй шпион' },
            3: { ult: 'Раскрыть роль подопечного всем (1 раз)' }
        }
    },
    {
        id: 'judas', name: 'Иуда', emoji: '🐍', type: 'passive',
        desc: 'Видишь шпиона. Если шпион называет тебя — шпион победил.',
        tiers: {
            1: { passive: 'Видишь первую букву имени шпиона' },
            2: { passive: 'Видишь полное имя шпиона' },
            3: { ult: 'Один раз можешь перейти на сторону шпиона' }
        }
    },
    {
        id: 'witness', name: 'Свидетель', emoji: '👁', type: 'active',
        desc: 'Знаешь кусочек секретного слова.',
        tiers: {
            1: { passive: 'Видишь первую букву слова' },
            2: { active: 'Кнопка «Подсказка»: первая + последняя буква' },
            3: { ult: 'Видишь всё слово на 5 секунд' }
        }
    },
    {
        id: 'hacker', name: 'Хакер', emoji: '💻', type: 'active',
        desc: 'Накладывает глитч-эффект на экраны всех на 30 секунд.',
        tiers: {
            1: { passive: 'Видишь количество слов в теме' },
            2: { active: 'Кнопка «Взлом»: глитч у всех на 10 сек' },
            3: { ult: 'Полный глитч 30 сек + смена мутатора' }
        }
    },
    {
        id: 'psych', name: 'Псих', emoji: '🤪', type: 'passive',
        desc: 'Каждые 60 сек появляется безумное задание.',
        phrases: [
            'Зелёная лошадь согласна!', 'Пицца смотрит на тебя.', 'Квадратный пингвин летит.',
            'Я видел это в холодильнике.', 'Лайк если нравится небо.', 'Кролик знает правду.',
            'Синий понедельник слева.', 'Угол 47 говорит нет.', 'Шнурки плавятся завтра.',
        ],
        tiers: {
            1: { passive: 'Бонус XP если никто не засмеётся над фразой' },
            2: { passive: 'Можешь обвинить фразой из своего списка' },
            3: { ult: 'Все обязаны говорить твоими фразами 1 минуту' }
        }
    },
    {
        id: 'mayor', name: 'Мэр', emoji: '👑', type: 'passive',
        desc: 'Голос при голосовании × 1.5. Решает ничью.',
        tiers: {
            1: { passive: 'Голос × 1.2' },
            2: { passive: 'Голос × 1.5 + решение ничьи' },
            3: { ult: 'Голос × 3 один раз за игру' }
        }
    },
    {
        id: 'ninja', name: 'Ниндзя', emoji: '🥷', type: 'passive',
        desc: 'Иммунитет к способностям и проверкам Шерифа.',
        tiers: {
            1: { passive: 'Иммунитет к галлюцинациям' },
            2: { passive: 'Иммунитет ко всем активным способностям' },
            3: { ult: 'Исчезнуть из списка голосования 1 раз' }
        }
    },
    {
        id: 'doctor', name: 'Доктор', emoji: '⚕️', type: 'active',
        desc: 'Даёт иммунитет игроку на один раунд.',
        tiers: {
            1: { passive: 'Знаешь кто уже вылетал за 3 игры' },
            2: { active: 'Кнопка «Щит»: иммунитет выбранному игроку' },
            3: { ult: 'Воскресить уже выбывшего (1 раз)' }
        }
    },
    {
        id: 'sensei', name: 'Сенсей', emoji: '🧘', type: 'active',
        desc: 'Повышает Tier выбранному игроку на 1 раунд.',
        tiers: {
            1: { passive: 'Знаешь количество активных ролей в сессии' },
            2: { active: 'Повысить Tier случайному игроку на 1 раунд' },
            3: { ult: 'Видишь все роли на 3 секунды' }
        }
    },
    {
        id: 'journalist', name: 'Журналист', emoji: '📰', type: 'active',
        desc: 'Проверяет одинаковые ли фракции у двух игроков.',
        tiers: {
            1: { passive: 'Намёк: шпион ли кто-то (да/нет, случайная точность)' },
            2: { active: 'Сравнить фракции двух игроков' },
            3: { ult: 'Опубликовать роль любого — все видят' }
        }
    },
    {
        id: 'thief', name: 'Вор', emoji: '🦊', type: 'active',
        desc: 'Лишает выбранного игрока его активной способности на раунд.',
        tiers: {
            1: { passive: 'Знаешь использована ли чужая активка' },
            2: { active: 'Украсть активную способность у игрока' },
            3: { ult: 'Украсть + мгновенно использовать украденную' }
        }
    },
    {
        id: 'agent007', name: 'Агент 007', emoji: '🔫', type: 'passive',
        desc: 'Перехватывает победу шпиона — нажми кнопку за 3 секунды.',
        tiers: {
            1: { passive: '1 попытка перехвата' },
            2: { passive: '2 попытки + бонус XP при успехе' },
            3: { ult: 'При перехвате — двойной XP для всей команды' }
        }
    },
    {
        id: 'medium', name: 'Медиум', emoji: '🔮', type: 'active',
        desc: 'Узнаёт роль уже выбывшего игрока.',
        tiers: {
            1: { passive: 'Роль последнего выбывшего' },
            2: { active: 'Посмотреть роль любого выбывшего' },
            3: { ult: 'Выбывший может дать подсказку через интерфейс' }
        }
    },
    {
        id: 'chameleon', name: 'Хамелеон', emoji: '🦎', type: 'active',
        desc: 'Меняет свой цвет интерфейса на цвет другого игрока.',
        tiers: {
            1: { passive: 'Смена аватара 1 раз' },
            2: { active: 'Сменить цвет на цвет другого игрока' },
            3: { ult: 'Полная смена внешности + копирование отображения' }
        }
    },
    {
        id: 'diplomat', name: 'Дипломат', emoji: '🤝', type: 'active',
        desc: 'Блокирует возможность голосовать против выбранного игрока.',
        tiers: {
            1: { passive: 'Добавить 1 минуту к обсуждению' },
            2: { active: 'Защитить игрока от голосования (1 раунд)' },
            3: { ult: 'Отменить текущее голосование полностью' }
        }
    },
    {
        id: 'provocateur', name: 'Провокатор', emoji: '😈', type: 'passive',
        desc: 'Заставляет двух игроков голосовать друг против друга.',
        tiers: {
            1: { passive: '+5 XP за каждый голос против тебя (если выжил)' },
            2: { passive: '+10 XP + узнать кто голосовал против' },
            3: { ult: 'Принудить двух игроков голосовать друг за друга' }
        }
    },
    {
        id: 'analyst', name: 'Аналитик', emoji: '📊', type: 'passive',
        desc: 'Видит лог: кто и когда применял способности.',
        tiers: {
            1: { passive: 'Количество букв в слове' },
            2: { passive: 'Видит лог способностей без указания цели' },
            3: { ult: 'Полный лог: кто, что, когда, против кого' }
        }
    },
    {
        id: 'trader', name: 'Торговец', emoji: '💰', type: 'active',
        desc: 'Тратит XP для покупки буста.',
        tiers: {
            1: { passive: 'Видит XP всех игроков' },
            2: { active: 'Купить +1 к силе голоса за 30 XP' },
            3: { ult: 'Купить иммунитет за 100 XP' }
        }
    },
    {
        id: 'technician', name: 'Техник', emoji: '🔧', type: 'active',
        desc: 'Снимает эффект глитча от Хакера со всех.',
        tiers: {
            1: { passive: 'Уведомление когда шпион открыл роль' },
            2: { active: 'Снять глитч-эффект со всех' },
            3: { ult: 'Заблокировать одно следующее действие шпиона' }
        }
    },
    {
        id: 'peacemaker', name: 'Миротворец', emoji: '☮️', type: 'active',
        desc: 'Отменяет текущее голосование.',
        tiers: {
            1: { passive: 'Знает будет ли шпион в следующем раунде (50% точность)' },
            2: { active: 'Отменить голосование — все остаются' },
            3: { ult: 'Запретить конкретное слово на весь раунд' }
        }
    },
    {
        id: 'kamikaze', name: 'Камикадзе', emoji: '💥', type: 'passive',
        desc: 'При вылете забирает последнего, кто отдал за него голос.',
        tiers: {
            1: { passive: '+5 XP при вылете' },
            2: { passive: 'Забрать 1 случайного при вылете' },
            3: { ult: 'Выбрать кого забрать с собой' }
        }
    },
];

const GAME_MODES = [
    { id: 'classic', name: 'Классический', emoji: '🕵', desc: 'Шпион не знает слово. Обсуждение и голосование.' },
    { id: 'chaos', name: 'Chaos Theory', emoji: '⚡', desc: '22 роли, мини-голосования, аномалии, улики.' },
    { id: 'double', name: 'Двойной агент', emoji: '🎭', desc: 'Шпион знает слово и блефует.' },
    { id: 'blind', name: 'Слепой шпион', emoji: '🙈', desc: 'Шпион не знает ни слово, ни категорию.' },
    { id: 'detective', name: 'Детектив', emoji: '🔎', desc: 'Один мирный знает слово и шпиона.' },
    { id: 'traitor', name: 'Предатель', emoji: '🗡', desc: 'Среди мирных скрытый союзник шпиона.' },
    { id: 'lastchance', name: 'Последний шанс', emoji: '🎯', desc: 'Пойманный шпион может назвать слово.' },
    { id: 'blitz', name: 'Викторина', emoji: '⚡', desc: 'Пойманный шпион отвечает за 15 секунд.' },
    { id: 'mirror', name: 'Зеркало', emoji: '🪞', desc: 'Шпион видит другое слово из той же темы.' },
    { id: 'silencer', name: 'Молчун', emoji: '🤫', desc: 'Один мирный не может говорить.' },
    { id: 'maniac', name: 'Маньяк', emoji: '🔪', desc: 'Шпион назначает жертву — её голос не считается.' },
    { id: 'duel', name: 'Дуэль', emoji: '⚔️', desc: 'Двое подозреваемых задают вопросы друг другу.' },
];

const ANOMALIES = [
    { id: 'groundhog', name: 'День сурка', emoji: '🔄', desc: 'Таймер сбрасывается! Обсуждение заново.' },
    { id: 'matrix', name: 'Сбой матрицы', emoji: '🌀', desc: 'Роли перераспределяются случайно!' },
    { id: 'silent', name: 'Тихий час', emoji: '🤫', desc: 'Все молчат 30 секунд!' },
    { id: 'amnesia', name: 'Амнезия', emoji: '💨', desc: 'Слово исчезает через 5 сек — запомни!' },
    { id: 'broken', name: 'Сломанный тлф', emoji: '📵', desc: 'Шпион видит только согласные!' },
    { id: 'blitz', name: 'Блиц ×2', emoji: '⚡', desc: 'Таймер ×2 быстрее, XP ×2!' },
];

const QUESTIONS = [
    'Опиши это одним словом.', 'Где это встречается?', 'Большое или маленькое?',
    'Какой цвет ассоциируется?', 'Можно потрогать?', 'Это живое?', 'Это дорогое?',
    'Какой звук издаёт?', 'Лучше зимой или летом?', 'Ты видел это сегодня?',
    'Это можно купить в магазине?', 'Это опасно?', 'Ты бы взял это в путешествие?',
];

const THEME_Q = {
    'ШКОЛА': ['Это в расписании?', 'Боится директора?', 'Можно с этим играть?'],
    'MINECRAFT': ['Это крафтится?', 'Встречается в Незере?', 'Это ест траву?'],
    'ЕДА': ['Едят горячим?', 'Это сладкое?', 'Можно купить в столовой?'],
};

const QUICK_CHAT_PHRASES = [
    'Я не шпион!', 'Проверь его/её!', 'У меня алиби.',
    'Очень подозрительно!', 'Я думаю это...', 'Согласен с обвинением.',
    'Не трогайте меня!', 'Это явно мирный.', 'Шпион среди нас точно!',
];

const LEVELS = [
    { min: 0, name: 'Новобранец', emoji: '🥚', tier: 1 },
    { min: 15, name: 'Агент', emoji: '🔍', tier: 1 },
    { min: 35, name: 'Следователь', emoji: '🕵', tier: 2 },
    { min: 65, name: 'Инспектор', emoji: '🎖', tier: 2 },
    { min: 100, name: 'Детектив', emoji: '🔎', tier: 2 },
    { min: 150, name: 'Комиссар', emoji: '⭐', tier: 3 },
    { min: 220, name: 'Мастер теней', emoji: '🌑', tier: 3 },
    { min: 300, name: 'Призрак', emoji: '👻', tier: 3 },
    { min: 400, name: 'Легенда', emoji: '💎', tier: 3 },
    { min: 500, name: 'Призрак Кочкора', emoji: '🏆', tier: 3 },
];

const BASE_ACHIEVEMENTS = [
    { id: 'first_win', name: 'Первый бой', emoji: '🥊', desc: 'Выиграй раунд', f: p => p.wins >= 1 },
    { id: 'spy5', name: 'Теневой агент', emoji: '🕵', desc: 'Будь шпионом 5 раз', f: p => p.spyCount >= 5 },
    { id: 'xp100', name: 'Сотня', emoji: '💯', desc: 'Набери 100 XP', f: p => p.score >= 100 },
    { id: 'win20', name: 'Ветеран', emoji: '🎖', desc: '20 побед', f: p => p.wins >= 20 },
    { id: 'tier3', name: 'Tier 3', emoji: '🏆', desc: 'Достичь Tier 3', f: p => (p.tier || 1) >= 3 },
    { id: 'chaos1', name: 'Хаос', emoji: '⚡', desc: 'Сыграть в Chaos Theory', f: p => (p.chaosGames || 0) >= 1 },
    { id: 'xp500', name: 'Легенда', emoji: '💎', desc: '500 XP', f: p => p.score >= 500 },
    { id: 'rep80', name: 'Дипломат', emoji: '🤝', desc: 'Репутация 80+', f: p => (p.rep || 50) >= 80 },
];

const THEME_LIST = [
    { id: 'matrix', name: 'Матрица', emoji: '💚' },
    { id: 'cyber', name: 'Киберпанк', emoji: '🔮' },
    { id: 'blood', name: 'Кровавая', emoji: '🔴' },
    { id: 'gold', name: 'Золотая', emoji: '✨' },
    { id: 'ice', name: 'Лёд', emoji: '❄️' },
];

const AVATARS = ['😎', '🦊', '🐺', '🐱', '🤖', '👽', '🦁', '🐸', '🦅', '🐙', '🦋', '🎃', '🐲', '🦄', '🐯', '🦸'];
const COLORS = ['#00ff41', '#bc13fe', '#ff003c', '#ffd700', '#00cfff', '#ff8800', '#ff00aa', '#88ff00'];

/* ════════════════════════════════════════════════════
   §3  STATE
════════════════════════════════════════════════════ */
let players = [];
let themes = {};
let history = [];
let settings = { theme: 'matrix', r: 8, shadow: {} };
let clans = [];

let selectedMode = 'classic';
let roundsPlayed = 0;

/** Game runtime state */
function makeEmptyGameState() {
    return {
        cur: 0, session: [], votes: {}, voteStep: 0, pick: null,
        tieList: [], voteCount: {}, blockedVote: '', doubleVote: '',
        immune: '', maniacVictim: '', anomaly: null,
        miniVoteRound: 0, miniVotes: {}, miniVotePick: null, miniVoterIdx: 0,
        sleeperAgents: [], artifacts: {}, protected: new Set(),
        spyVisionActive: false, stealthVoter: '', lastConfig: null,
        chaosMode: false, analystLog: [], eliminatedPlayers: [],
        provocateurForced: {}, xpMultiplier: 1, forbiddenWord: '',
        ultUsedMap: {}, abilityUsedMap: {}, bodyguardTarget: {},
        sheriffChecks: {}, doctorShields: new Set(), stolenAbility: {},
        timerFreeze: false,
    };
}
let G = makeEmptyGameState();

/* ════════════════════════════════════════════════════
   §4  SAFE INIT + LOCALSTORAGE SYNC
════════════════════════════════════════════════════ */
function safeInit() {
    try {
        const rawPl = localStorage.getItem('su_pl');
        players = rawPl ? JSON.parse(rawPl) : makeDefaultPlayers();
        if (!Array.isArray(players) || players.length === 0) players = makeDefaultPlayers();
        players.forEach(normalizePlayer);
    } catch (e) { SU_DEBUG.error('Players load: ' + e); players = makeDefaultPlayers(); }

    try {
        const rawTh = localStorage.getItem('su_th');
        themes = rawTh ? JSON.parse(rawTh) : makeDefaultThemes();
        if (!themes || Object.keys(themes).length === 0) themes = makeDefaultThemes();
    } catch (e) { SU_DEBUG.error('Themes load: ' + e); themes = makeDefaultThemes(); }

    try { history = JSON.parse(localStorage.getItem('su_hi')) || []; } catch (e) { history = []; }
    try {
        settings = JSON.parse(localStorage.getItem('su_se')) || { theme: 'matrix', r: 8, shadow: {} };
        if (settings.theme === 'default') settings.theme = 'matrix';
        if (!settings.shadow) settings.shadow = {};
    } catch (e) { settings = { theme: 'matrix', r: 8, shadow: {} }; }
    try { clans = JSON.parse(localStorage.getItem('su_cl')) || []; } catch (e) { clans = []; }

    // Restore photos separately
    try {
        const ph = JSON.parse(localStorage.getItem('su_photos') || '{}');
        Object.entries(ph).forEach(([name, photo]) => {
            const p = players.find(pl => pl.name === name);
            if (p) p.photo = photo;
        });
    } catch (e) { }

    applySettings();
    bindAllEvents();
    startLoader();
    setupStorageListener();
    setupAutoSave();
    setupAntiAFK();
    setupPanicButton();
    setupBatteryMonitor();

    SU_DEBUG.log('Safe init completed. Players: ' + players.length + ', Themes: ' + Object.keys(themes).length);
}

function normalizePlayer(p) {
    if (!p.perks) p.perks = {};
    if (!p.achievements) p.achievements = [];
    if (p.rep === undefined) p.rep = 50;
    if (!p.tier) p.tier = 1;
    if (!p.chaosGames) p.chaosGames = 0;
    if (!p.spyCount) p.spyCount = 0;
    if (!p.wins) p.wins = 0;
    if (!p.losses) p.losses = 0;
    if (!p.spyStreak) p.spyStreak = 0;
    if (!p.blitzWins) p.blitzWins = 0;
    if (!p.photo) p.photo = null;
    if (!p.color) p.color = COLORS[0];
    if (!p.avatar) p.avatar = AVATARS[0];
    if (!p.score) p.score = 0;
    if (!p.active && p.active !== false) p.active = true;
    if (!p.vip) p.vip = false;
}

function makeDefaultPlayers() {
    return [
        { name: 'Игрок 1', score: 0, wins: 0, losses: 0, spyCount: 0, spyStreak: 0, active: true, vip: false, avatar: '😎', color: '#00ff41', photo: null, achievements: [], rep: 50, tier: 1, chaosGames: 0, blitzWins: 0 },
        { name: 'Игрок 2', score: 0, wins: 0, losses: 0, spyCount: 0, spyStreak: 0, active: true, vip: false, avatar: '🦊', color: '#bc13fe', photo: null, achievements: [], rep: 50, tier: 1, chaosGames: 0, blitzWins: 0 },
        { name: 'Игрок 3', score: 0, wins: 0, losses: 0, spyCount: 0, spyStreak: 0, active: true, vip: false, avatar: '🐺', color: '#ff003c', photo: null, achievements: [], rep: 50, tier: 1, chaosGames: 0, blitzWins: 0 },
    ];
}

function makeDefaultThemes() {
    return {
        "ШКОЛА": ["Директор", "Физрук", "Завуч", "Дневник", "Столовая", "Перемена", "Урок", "Доска", "Мел", "Рюкзак", "Тетрадь", "Ручка", "Парта", "Звонок", "Ластик", "Линейка", "Шпаргалка", "Журнал", "Секундомер", "Мусорка"],
        "MINECRAFT": ["Крипер", "Стив", "Алмаз", "Эндермен", "Бедрок", "Незер", "Дракон", "Зомби", "Скелет", "Паук", "Фермер", "Кузнец", "Тотем", "Маяк", "Уголь", "Изумруд", "Пшеница", "Тыква", "Торт", "Порошок"],
        "МЕМЫ": ["Доге", "Гигачад", "Рик Ролл", "Хасбик", "Ждун", "Pepe", "Trollface", "Shrek", "Among Us", "Stonks", "Котик", "Лайк", "Вайб", "Краш", "Скибиди", "Рофл", "Кринж", "Бро", "NPC", "Сигма"],
        "ИГРЫ": ["Dota 2", "Roblox", "CS2", "Minecraft", "GTA 5", "Fortnite", "Valorant", "Elden Ring", "Cyberpunk", "Genshin", "LoL", "PUBG", "Apex", "Overwatch", "FIFA", "Terraria", "Stardew", "Portal", "Undertale", "Celeste"],
        "ЕДА": ["Лагман", "Манты", "Плов", "Боорсок", "Шашлык", "Нарын", "Курут", "Айран", "Самса", "Долма", "Чебурек", "Баурсак", "Шурпа", "Кумыс", "Бешбармак", "Борщ", "Пицца", "Суши", "Бургер", "Паста"],
        "КИБЕРПАНК": ["Нейросеть", "Импланты", "Хакер", "Матрица", "Дрон", "Корпорация", "Репликант", "Мегаполис", "Нано", "Взлом", "Андроид", "Сигнал", "Глитч", "Протокол", "Данные", "Чип", "Апгрейд", "Симуляция", "Код", "Вирус"],
    };
}

/** §4.1 LocalStorage Sync — реакция на команды из другой вкладки */
function setupStorageListener() {
    window.addEventListener('storage', (e) => {
        if (e.key === 'su_pl') {
            try { players = JSON.parse(e.newValue) || players; players.forEach(normalizePlayer); renderAgents(); } catch (err) { }
        }
        if (e.key === 'su_admin_cmd') {
            try { handleExternalAdminCmd(JSON.parse(e.newValue)); } catch (err) { }
        }
        if (e.key === 'su_anomaly_cmd') {
            try { const a = JSON.parse(e.newValue); applyAnomaly(a.id); } catch (err) { }
        }
    });
}

function handleExternalAdminCmd(cmd) {
    if (!cmd || !cmd.type) return;
    if (cmd.type === 'setTier') {
        const p = players.find(pl => pl.name === cmd.player);
        if (p) { p.tier = cmd.tier; saveAll(); updateAbilityButtonsIfNeeded(); }
    }
    if (cmd.type === 'injectXP') {
        const p = players.find(pl => pl.name === cmd.player);
        if (p) { p.score = Math.max(0, p.score + cmd.amount); p.tier = getTier(p.score); saveAll(); }
    }
    if (cmd.type === 'injectImmunity') {
        G.protected.add(cmd.player);
        showPopup('🛡 ' + cmd.player + ' — иммунитет!');
    }
    SU_DEBUG.log('External admin cmd: ' + cmd.type + ' → ' + cmd.player);
}

/** §4.2 Auto-Save every 5 seconds */
function setupAutoSave() {
    setInterval(() => {
        try {
            sessionStorage.setItem('su_session', JSON.stringify({
                round: roundsPlayed,
                timerSec: tSec,
                sessionNames: G.session.map(s => s.name),
                mode: selectedMode,
                ts: Date.now(),
            }));
        } catch (e) { }
    }, 5000);
}

function saveAll() {
    try {
        const plNoPhoto = players.map(({ photo, ...rest }) => rest);
        localStorage.setItem('su_pl', JSON.stringify(plNoPhoto));
        localStorage.setItem('su_th', JSON.stringify(themes));
        localStorage.setItem('su_hi', JSON.stringify(history.slice(-50)));
        localStorage.setItem('su_se', JSON.stringify(settings));
        localStorage.setItem('su_cl', JSON.stringify(clans));
    } catch (e) { SU_DEBUG.error('Save error: ' + e); }
}

/* ════════════════════════════════════════════════════
   §5  LOADER ANIMATION
════════════════════════════════════════════════════ */
function startLoader() {
    const STATUS = [
        'ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ...',
        'ЗАГРУЗКА БАЗЫ АГЕНТОВ...',
        'ДЕШИФРОВАНИЕ ЛОКАЦИЙ...',
        'АКТИВАЦИЯ РОЛЕЙ...',
        'БИОМЕТРИЧЕСКИЙ СКАН...',
        'СИСТЕМА ГОТОВА.',
    ];
    const bar = document.getElementById('loader-bar');
    const status = document.getElementById('loader-status');
    const log = document.getElementById('loader-log');
    let step = 0;

    const advance = () => {
        if (step >= STATUS.length) {
            setTimeout(() => showScreen('menu'), 400);
            showTab('tab-game');
            renderAll();
            return;
        }
        if (status) status.textContent = STATUS[step];
        if (bar) bar.style.width = ((step + 1) / STATUS.length * 100) + '%';
        if (log) log.innerHTML += `<div>> ${STATUS[step]}</div>`;
        step++;
        setTimeout(advance, 320 + Math.random() * 200);
    };
    advance();
}

/* ════════════════════════════════════════════════════
   §6  SCREEN / TAB MANAGEMENT
════════════════════════════════════════════════════ */
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.toggle('active', s.id === 'screen-' + id);
    });
    currentScreen = id;
}
let currentScreen = 'loader';

function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const tc = document.getElementById(id);
    if (tc) tc.classList.add('active');
    const btn = document.querySelector(`[data-tab="${id}"]`);
    if (btn) btn.classList.add('active');
}

function showStage(id) {
    document.querySelectorAll('.game-stage').forEach(s => s.classList.add('hidden'));
    const el = document.getElementById('stage-' + id);
    if (el) el.classList.remove('hidden');
}

/* ════════════════════════════════════════════════════
   §7  SETTINGS & THEMES
════════════════════════════════════════════════════ */
function themeToAttr(id) {
    if (!id || id === 'default') return 'matrix';
    return id;
}

function applySettings() {
    document.documentElement.setAttribute('data-theme', themeToAttr(settings.theme));
    document.documentElement.style.setProperty('--r', (settings.r || 8) + 'px');
    if (settings.theme === 'default') settings.theme = 'matrix';
}

function setTheme(id) {
    settings.theme = themeToAttr(id);
    saveAll();
    applySettings();
    renderThemeButtons();
    renderAdminThemeBtns();
}

function renderThemeButtons() {
    const el = document.getElementById('theme-btns');
    if (!el) return;
    el.innerHTML = THEME_LIST.map(t =>
        `<button class="btn-sm ${settings.theme === t.id ? 'btn-primary' : 'btn-sec'}" onclick="setTheme('${t.id}')">${t.emoji} ${t.name}</button>`
    ).join('');
}

function renderAdminThemeBtns() {
    const el = document.getElementById('adm-theme-btns');
    if (!el) return;
    el.innerHTML = THEME_LIST.map(t =>
        `<button class="btn-sm btn-sec" onclick="setTheme('${t.id}');showPopup('🎨 ${t.name}')">${t.emoji} ${t.name}</button>`
    ).join('');
}

/* ════════════════════════════════════════════════════
   §8  RENDER FUNCTIONS
════════════════════════════════════════════════════ */
function renderAll() {
    renderModes();
    renderThemeChips();
    renderAgents();
    renderClans();
    renderThemeEdits();
    renderRolesShowcase();
    renderStats();
    renderAchievements();
    renderRep();
    renderHistory();
    renderThemeButtons();
    renderAdminThemeBtns();
    renderQuickChat();
    populateShadowSelects();
    populateZeroSelects();
}

/** MODES */
function renderModes() {
    const el = document.getElementById('mode-list');
    if (!el) return;
    el.innerHTML = GAME_MODES.map(m =>
        `<div class="mode-card${selectedMode === m.id ? ' active' : ''}" onclick="selectedMode='${m.id}';renderModes()">
      <h3>${m.emoji} ${m.name}</h3><p>${m.desc}</p>
    </div>`
    ).join('');
}

/** THEME CHIPS */
function renderThemeChips() {
    const el = document.getElementById('theme-chips');
    if (!el) return;
    const keys = Object.keys(themes);
    if (keys.length === 0) { themes = makeDefaultThemes(); saveAll(); }
    el.innerHTML = Object.keys(themes).map(k =>
        `<div class="chip active" onclick="this.classList.toggle('active')">${k}</div>`
    ).join('');
}

/** AGENTS */
function getLevel(score) {
    const sorted = [...LEVELS].sort((a, b) => b.min - a.min);
    return sorted.find(l => score >= l.min) || LEVELS[0];
}
function getTier(score) { return getLevel(score).tier || 1; }

function renderAgents() {
    const el = document.getElementById('agent-list');
    if (!el) return;
    el.innerHTML = players.map((p, i) => {
        const lv = getLevel(p.score);
        const nextLv = LEVELS.find(l => l.min > p.score);
        const pct = nextLv ? Math.min(100, ((p.score - lv.min) / (nextLv.min - lv.min)) * 100) : 100;
        const isVip = p.vip;
        const t3Class = lv.tier >= 3 ? 'tier-3-glow' : '';
        return `
    <div class="agent-row ${t3Class}" id="agent-row-${i}">
      <div class="agent-avatar ${t3Class}" style="background:${p.color}" onclick="triggerPhotoUpload(${i})">
        ${p.photo ? `<img src="${p.photo}" alt="">` : `<span style="font-size:16px;line-height:34px">${p.avatar}</span>`}
      </div>
      <div class="agent-info">
        <input class="agent-name-input" value="${escHtml(p.name)}" onchange="players[${i}].name=this.value;saveAll()" />
        <div class="lvl-name">${lv.emoji} ${lv.name}<span class="tier-badge t${lv.tier}">T${lv.tier}</span>${isVip ? ' ⭐' : ''}</div>
        <div class="agent-xp-bar-wrap"><div class="agent-xp-bar" style="width:${pct}%"></div></div>
      </div>
      <button class="btn-sm" style="width:22px;height:22px;padding:0;border-radius:50%;background:${p.color};flex-shrink:0" onclick="cycleColor(${i})"></button>
      <button class="btn-sm ${p.active ? 'btn-primary' : 'btn-sec'}" style="width:28px;padding:4px" onclick="toggleActive(${i})">${p.active ? '✓' : '✗'}</button>
      <button class="btn-sm btn-danger" style="width:24px;padding:4px" onclick="removeAgent(${i})">✕</button>
    </div>
    <input type="file" id="ph-${i}" accept="image/*" style="display:none" onchange="loadPhoto(${i},this)">`;
    }).join('');
}

function triggerPhotoUpload(i) {
    const el = document.getElementById('ph-' + i);
    if (el) el.click();
}
function loadPhoto(i, inp) {
    const f = inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
        players[i].photo = e.target.result;
        const ph = JSON.parse(localStorage.getItem('su_photos') || '{}');
        ph[players[i].name] = e.target.result;
        localStorage.setItem('su_photos', JSON.stringify(ph));
        renderAgents();
    };
    r.readAsDataURL(f);
}
function cycleColor(i) { players[i].color = COLORS[(COLORS.indexOf(players[i].color) + 1) % COLORS.length]; saveAll(); renderAgents(); }
function toggleActive(i) { players[i].active = !players[i].active; saveAll(); renderAgents(); }
function removeAgent(i) { if (players.length <= 3) { showPopup('Минимум 3 агента!', 'danger'); return; } players.splice(i, 1); saveAll(); renderAgents(); }
function addAgent() {
    const idx = players.length % AVATARS.length;
    players.push({ name: 'Агент ' + (players.length + 1), score: 0, wins: 0, losses: 0, spyCount: 0, spyStreak: 0, active: true, vip: false, avatar: AVATARS[idx], color: COLORS[idx % COLORS.length], photo: null, achievements: [], rep: 50, tier: 1, chaosGames: 0, blitzWins: 0 });
    saveAll(); renderAgents();
}
function resetAllXP() {
    if (!confirm('Сбросить всю статистику?')) return;
    players.forEach(p => { p.score = 0; p.wins = 0; p.losses = 0; p.spyCount = 0; p.spyStreak = 0; p.achievements = []; p.rep = 50; p.tier = 1; p.chaosGames = 0; p.blitzWins = 0; });
    saveAll(); renderAgents(); renderStats();
}

/** CLANS */
function renderClans() {
    const el = document.getElementById('clan-list');
    if (!el) return;
    el.innerHTML = clans.map((c, i) =>
        `<div class="clan-item"><span>${escHtml(c.name)}</span><button class="btn-sm btn-danger" onclick="clans.splice(${i},1);saveAll();renderClans()" style="width:auto;padding:4px 8px">✕</button></div>`
    ).join('') || '<p class="hint-text">Нет кланов</p>';
}
function addClan() {
    const n = document.getElementById('clan-input')?.value?.trim();
    if (!n) return;
    clans.push({ name: n });
    saveAll(); renderClans();
    document.getElementById('clan-input').value = '';
}

/** THEMES (content) */
function renderThemeEdits() {
    const el = document.getElementById('theme-edit-list');
    if (!el) return;
    el.innerHTML = Object.keys(themes).map(k =>
        `<div class="theme-edit-card">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
        <input class="su-input" style="flex:1;margin:0" value="${escHtml(k)}" onchange="renameTheme('${k}',this.value)" />
        <button class="btn-sm btn-danger" onclick="deleteTheme('${k}')" style="width:auto;padding:4px 8px">✕</button>
      </div>
      <textarea class="su-textarea" id="tw-${CSS.escape(k)}" style="height:50px;font-size:9px">${themes[k].join(', ')}</textarea>
      <button class="btn-sm btn-primary" onclick="saveThemeWords('${k}')" style="width:100%;padding:7px;margin-top:3px">Сохранить слова</button>
    </div>`
    ).join('');
}
function renameTheme(old, nw) { nw = nw.trim().toUpperCase(); if (!nw || nw === old || themes[nw]) return; themes[nw] = themes[old]; delete themes[old]; saveAll(); renderThemeEdits(); renderThemeChips(); }
function saveThemeWords(k) { const el = document.getElementById('tw-' + CSS.escape(k)); if (!el) return; themes[k] = el.value.split(',').map(w => w.trim()).filter(Boolean); saveAll(); showPopup('Слова сохранены!'); }
function deleteTheme(k) { if (Object.keys(themes).length <= 1) return; if (!confirm('Удалить?')) return; delete themes[k]; saveAll(); renderThemeEdits(); renderThemeChips(); }
function saveNewTheme() {
    const n = document.getElementById('new-theme-name')?.value?.trim()?.toUpperCase();
    const w = document.getElementById('new-theme-words')?.value?.split(',').map(x => x.trim()).filter(Boolean);
    if (!n || !w || w.length < 5) { showPopup('Мин. 5 слов!', 'danger'); return; }
    themes[n] = w; saveAll();
    document.getElementById('new-theme-name').value = '';
    document.getElementById('new-theme-words').value = '';
    renderThemeEdits(); renderThemeChips(); showPopup('Локация «' + n + '» создана!');
}
function exportThemes() {
    const data = JSON.stringify(Object.entries(themes).map(([name, words]) => ({ name, words })), null, 2);
    document.getElementById('theme-import-box').value = data;
    if (navigator.clipboard) navigator.clipboard.writeText(data).then(() => showPopup('📋 Локации скопированы!'));
}
function importThemes() {
    try {
        const arr = JSON.parse(document.getElementById('theme-import-box')?.value?.trim() || '[]');
        arr.forEach(t => { if (t.name && Array.isArray(t.words) && t.words.length >= 5) themes[t.name.toUpperCase()] = t.words; });
        saveAll(); renderThemeEdits(); renderThemeChips(); showPopup('✅ Локации импортированы!');
    } catch (e) { showPopup('❌ Ошибка JSON', 'danger'); }
}

/** ROLES SHOWCASE */
function renderRolesShowcase() {
    const el = document.getElementById('roles-showcase');
    if (!el) return;
    el.innerHTML = CHAOS_ROLES.map(r =>
        `<div class="role-showcase-item">
      <div class="rsi-emoji">${r.emoji}</div>
      <div class="rsi-body">
        <div class="rsi-name">${r.name}<span class="rsi-type ${r.type === 'active' ? 'type-active' : 'type-passive'}">${r.type === 'active' ? 'АКТИВ' : 'ПАССИВ'}</span></div>
        <div class="rsi-desc">${r.desc}</div>
        <div class="rsi-tiers">T1: ${r.tiers[1].passive || r.tiers[1].active || ''} | T2: ${r.tiers[2].active || r.tiers[2].passive || ''} | T3⚡: ${r.tiers[3].ult || ''}</div>
      </div>
    </div>`
    ).join('');
}

/** STATS */
function renderStats() {
    const el = document.getElementById('stat-list');
    if (!el) return;
    el.innerHTML = [...players].sort((a, b) => b.score - a.score).map((p, i) => {
        const lv = getLevel(p.score);
        return `<div class="stat-item ${lv.tier >= 3 ? 'tier-3-glow' : ''}">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:30px;height:30px;border-radius:50%;background:${p.color};display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
          ${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover">` : `<span style="font-size:14px">${p.avatar}</span>`}
        </div>
        <div>
          <div style="font-weight:800;font-size:11px;${p.vip ? 'color:var(--gold)' : ''}">${['🥇', '🥈', '🥉'][i] || ''}${p.name}<span class="tier-badge t${lv.tier}">T${lv.tier}</span></div>
          <div style="font-size:8px;opacity:.5">${lv.emoji} ${lv.name} · 🏆${p.wins} 💀${p.losses} 🕵${p.spyCount}</div>
        </div>
      </div>
      <span class="xpb" style="background:var(--neon);color:#000;padding:2px 8px;border-radius:6px;font-size:9px;font-weight:900">${p.score} XP</span>
    </div>`;
    }).join('') || '<p class="hint-text">Нет данных</p>';
}

function renderAchievements() {
    const el = document.getElementById('ach-grid');
    if (!el) return;
    el.innerHTML = BASE_ACHIEVEMENTS.map(a => {
        const unlocked = players.some(p => { try { return a.f(p); } catch (e) { return false; } });
        return `<div class="ach-item ${unlocked ? 'unlocked' : ''}">
      <div class="ach-emoji">${unlocked ? a.emoji : '🔒'}</div>
      <div class="ach-name">${a.name}</div>
      <div class="ach-desc">${a.desc}</div>
    </div>`;
    }).join('');
}

function renderRep() {
    const el = document.getElementById('rep-list');
    if (!el) return;
    el.innerHTML = players.map(p =>
        `<div class="rep-item">
      <div style="display:flex;justify-content:space-between;font-size:10px">
        <span>${p.avatar} ${p.name}</span>
        <span style="color:${(p.rep || 50) >= 50 ? 'var(--neon)' : 'var(--neon3)'}">${p.rep || 50}/100</span>
      </div>
      <div class="rep-bar-wrap"><div class="rep-fill" style="width:${p.rep || 50}%"></div></div>
    </div>`
    ).join('');
}

function renderHistory() {
    const el = document.getElementById('hist-list');
    if (!el) return;
    el.innerHTML = history.slice().reverse().slice(0, 20).map(h =>
        `<div class="hist-item">
      <div style="font-weight:800;margin-bottom:3px">${h.mode || ''} · ${h.cat} · <span style="color:var(--neon)">${h.word}</span></div>
      <div style="font-size:9px;opacity:.5">🕵 ${(h.spies || []).join(', ')} · 👑 ${h.winner || ''} · ${h.date || ''}</div>
    </div>`
    ).join('') || '<p class="hint-text">История пуста</p>';
}

function checkAchievements(p) {
    if (!p.achievements) p.achievements = [];
    BASE_ACHIEVEMENTS.forEach(a => {
        if (p.achievements.includes(a.id)) return;
        try { if (a.f(p)) { p.achievements.push(a.id); showPopup('🏆 ' + a.name, 'gold'); } } catch (e) { }
    });
}

/** Quick Chat */
function renderQuickChat() {
    const el = document.getElementById('quick-chat-panel');
    if (!el) return;
    el.innerHTML = QUICK_CHAT_PHRASES.map(ph =>
        `<span class="qchat-btn" onclick="navigator.clipboard&&navigator.clipboard.writeText('${ph}');showPopup('📋 Скопировано!')">${ph}</span>`
    ).join('');
}

/* ════════════════════════════════════════════════════
   §9  POPUP SYSTEM
════════════════════════════════════════════════════ */
function showPopup(text, type = '') {
    const cont = document.getElementById('popup-container');
    if (!cont) return;
    const el = document.createElement('div');
    el.className = 'su-popup' + (type ? ' ' + type : '');
    el.textContent = text;
    cont.appendChild(el);
    setTimeout(() => el.remove(), 2800);
}

/* ════════════════════════════════════════════════════
   §10  LOG CONSOLE
════════════════════════════════════════════════════ */
const analystActions = [];
function logConsole(msg, level = 'info') {
    analystActions.push({ msg, time: Date.now() });
    const el = document.getElementById('log-output');
    if (!el) return;
    const line = document.createElement('div');
    line.className = 'log-line log-' + level;
    line.textContent = '> ' + new Date().toLocaleTimeString('ru') + ' · ' + msg;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
}
function showLogConsole() {
    const el = document.getElementById('log-console');
    if (el) el.classList.toggle('hidden');
}

/* ════════════════════════════════════════════════════
   §11  AUDIO ENGINE (Web Audio API)
════════════════════════════════════════════════════ */
let audioCtx = null;
let heartbeatInterval = null;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playHeartbeat() {
    try {
        const ctx = getAudioCtx();
        const beat = () => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 60;
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            osc.start(); osc.stop(ctx.currentTime + 0.2);
        };
        beat();
        setTimeout(beat, 300);
    } catch (e) { }
}

function startHeartbeat() {
    stopHeartbeat();
    heartbeatInterval = setInterval(playHeartbeat, 900);
}
function stopHeartbeat() {
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
}

function playSfx(type) {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        if (type === 'reveal') {
            osc.frequency.value = 440;
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(); osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'vote') {
            osc.frequency.value = 220;
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.start(); osc.stop(ctx.currentTime + 0.15);
        } else if (type === 'end') {
            osc.frequency.value = 880;
            osc.type = 'sawtooth';
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            osc.start(); osc.stop(ctx.currentTime + 0.6);
        }
    } catch (e) { }
}

/* ════════════════════════════════════════════════════
   §12  TIMER
════════════════════════════════════════════════════ */
let tSec = 180, tTotal = 180, tInt = null, tRunning = false;
let timerTapCount = 0, timerTapTimer = null;

function updateTimerDisplay() {
    const m = Math.floor(tSec / 60);
    const s = tSec % 60;
    const el = document.getElementById('timer-num');
    if (!el) return;
    el.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    el.style.color = tSec < 20 ? 'var(--neon3)' : tSec < 45 ? 'var(--gold)' : 'var(--neon)';
    const arc = document.getElementById('timer-arc');
    if (arc) {
        const circumference = 263.9;
        arc.style.strokeDashoffset = circumference * (1 - tSec / tTotal);
        arc.style.stroke = tSec < 20 ? 'var(--neon3)' : tSec < 45 ? 'var(--gold)' : 'var(--neon)';
    }
    const wrap = document.getElementById('timer-wrap');
    if (wrap) {
        if (tSec <= 15) { wrap.classList.add('timer-heartbeat'); if (!heartbeatInterval) startHeartbeat(); }
        else { wrap.classList.remove('timer-heartbeat'); stopHeartbeat(); }
    }
}

function toggleTimer() {
    if (G.timerFreeze) return;
    tRunning = !tRunning;
    const btn = document.getElementById('tbtn') || document.getElementById('btn-timer-toggle');
    if (btn) btn.textContent = tRunning ? '⏸' : '▶';
    if (tRunning) {
        tInt = setInterval(() => {
            if (G.timerFreeze) return;
            tSec--;
            updateTimerDisplay();
            if (tSec <= 0) {
                clearInterval(tInt); tRunning = false; stopHeartbeat();
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                playSfx('end');
                if (document.getElementById('cfg-minivote')?.checked) {
                    G.miniVoteRound++;
                    initMiniVote();
                } else {
                    goVote();
                }
            }
        }, 1000);
    } else {
        clearInterval(tInt);
    }
}

function resetTimer() {
    clearInterval(tInt); tRunning = false; stopHeartbeat();
    tSec = document.getElementById('cfg-chaos')?.checked ? 120 : 180;
    tTotal = tSec;
    updateTimerDisplay();
    const btn = document.getElementById('btn-timer-toggle');
    if (btn) btn.textContent = '▶';
}

/** 5-tap on timer → Zero Panel */
function handleTimerTap() {
    timerTapCount++;
    const el = document.getElementById('timer-tap-count');
    if (el) { el.textContent = timerTapCount + '/5'; el.style.opacity = '1'; }
    clearTimeout(timerTapTimer);
    timerTapTimer = setTimeout(() => {
        timerTapCount = 0;
        if (el) el.style.opacity = '0';
    }, 2000);
    if (timerTapCount >= 5) {
        timerTapCount = 0;
        if (el) { el.textContent = ''; el.style.opacity = '0'; }
        openZeroPanel();
    }
}

/** Dynamic time: players × 30 sec */
function calcDynamicTime() {
    return Math.max(60, players.filter(p => p.active).length * 30);
}

/* ════════════════════════════════════════════════════
   §13  ANOMALIES
════════════════════════════════════════════════════ */
function triggerRandomAnomaly() {
    const a = ANOMALIES[Math.floor(Math.random() * ANOMALIES.length)];
    applyAnomaly(a.id);
}
function applyAnomaly(id) {
    const a = ANOMALIES.find(x => x.id === id) || ANOMALIES[0];
    G.anomaly = a;
    const banner = document.getElementById('anomaly-banner');
    if (banner) { banner.textContent = a.emoji + ' ' + a.name + ': ' + a.desc; banner.classList.remove('hidden'); setTimeout(() => banner.classList.add('hidden'), 5000); }
    showPopup(a.emoji + ' ' + a.name + '!', 'danger');
    logConsole('Аномалия: ' + a.name, 'warn');

    switch (id) {
        case 'groundhog':
            clearInterval(tInt); tRunning = false; tSec = tTotal; updateTimerDisplay();
            showPopup('🔄 Таймер сброшен!', 'danger'); break;
        case 'matrix':
            if (G.chaosMode || selectedMode === 'chaos') assignChaosRoles();
            document.body.style.filter = 'invert(1)';
            setTimeout(() => document.body.style.filter = '', 3000);
            showPopup('🌀 Роли перераспределены!', 'danger'); break;
        case 'silent':
            showPopup('🤫 ТИШИНА 30 СЕКУНД!', 'danger');
            setTimeout(() => showPopup('🔊 Можно говорить!'), 30000); break;
        case 'amnesia':
            showPopup('💨 Слово исчезает через 5 сек!', 'danger');
            setTimeout(() => {
                document.querySelectorAll('.role-word').forEach(el => el.textContent = '???');
            }, 5000); break;
        case 'broken':
            G.session.filter(p => p.isSpy).forEach(p => { p.brokenWord = p.word.replace(/[аеёиоуыьъэюяАЕЁИОУЫЬЪЭЮЯ]/g, '_'); });
            showPopup('📵 Шпион видит только согласные!', 'danger'); break;
        case 'blitz':
            tSec = Math.floor(tSec / 2); tTotal = Math.floor(tTotal / 2); G.xpMultiplier = 2;
            updateTimerDisplay(); showPopup('⚡ БЛИЦ! Таймер ×2 быстрее, XP ×2!', 'danger'); break;
    }
}

/* ════════════════════════════════════════════════════
   §14  GAME START
════════════════════════════════════════════════════ */
function shuffle(a) {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
}

function startGame() {
    try {
        const active = players.filter(p => p.active);
        if (active.length < 3) { showPopup('⚠ Минимум 3 агента!', 'danger'); return; }

        // Auto-select theme if none chosen
        let selTh = Array.from(document.querySelectorAll('.chip.active')).map(c => c.textContent.trim());
        if (selTh.length === 0) {
            selTh = [Object.keys(themes)[0]];
            SU_DEBUG.log('Auto-selected theme: ' + selTh[0]);
        }

        const cat = selTh[Math.floor(Math.random() * selTh.length)];
        const wArr = themes[cat] || Object.values(themes)[0];
        const word = wArr[Math.floor(Math.random() * wArr.length)];
        const shuffled = shuffle(active);

        G = makeEmptyGameState();
        G.session = shuffled.map(p => ({
            ...JSON.parse(JSON.stringify({ ...p, photo: null })),
            isSpy: false, isDouble: false, isDetective: false, isTraitor: false,
            isSilencer: false, isManiacVictim: false, isSleeper: false,
            mirrorWord: '', chainTarget: '', cat, word,
            chaosRole: null, roleUsed: false, ultUsed: false, voteWeight: 1,
            immunity: false, brokenWord: '',
        }));

        G.blockedVote = document.getElementById('sh-block-vote')?.value || '';
        G.doubleVote = document.getElementById('sh-double-vote')?.value || '';
        G.immune = document.getElementById('sh-immune')?.value || '';
        G.chaosMode = document.getElementById('cfg-chaos')?.checked || selectedMode === 'chaos';
        G.xpMultiplier = 1;
        G.analystLog = [];
        G.eliminatedPlayers = [];
        G.protected = new Set();

        // Assign spies
        const chaosMode = document.getElementById('sh-chaos-mode')?.value || 'normal';
        const forced = document.getElementById('sh-spy')?.value || 'none';
        assignSpies(forced, chaosMode);

        // Chaos roles
        if (G.chaosMode) assignChaosRoles();

        // Mode specifics
        if (selectedMode === 'double') G.session.filter(p => p.isSpy).forEach(p => p.isDouble = true);
        if (selectedMode === 'detective') { const ns = shuffle(G.session.filter(p => !p.isSpy)); if (ns.length) ns[0].isDetective = true; }
        if (selectedMode === 'traitor') { const ns = shuffle(G.session.filter(p => !p.isSpy)); if (ns.length > 1) ns[0].isTraitor = true; }
        if (selectedMode === 'silencer') { const ns = shuffle(G.session.filter(p => !p.isSpy)); if (ns.length) ns[0].isSilencer = true; }
        if (selectedMode === 'maniac') {
            const spy = G.session.find(p => p.isSpy);
            const ns = G.session.filter(p => !p.isSpy);
            if (spy && ns.length) { const vic = ns[Math.floor(Math.random() * ns.length)]; vic.isManiacVictim = true; G.maniacVictim = vic.name; }
        }
        if (selectedMode === 'mirror') {
            const spy = G.session.find(p => p.isSpy);
            if (spy) { const oth = wArr.filter(w => w !== word); spy.mirrorWord = oth.length ? oth[Math.floor(Math.random() * oth.length)] : word; }
        }
        if (selectedMode === 'paranoia') {
            const sp = G.session.filter(p => p.isSpy);
            if (sp.length < 2) shuffle(G.session.filter(p => !p.isSpy)).slice(0, 2 - sp.length).forEach(p => p.isSpy = true);
        }

        // Mayor vote weight
        const mayor = G.session.find(p => p.chaosRole === 'mayor');
        if (mayor) mayor.voteWeight = mayor.tier >= 2 ? 1.5 : 1.2;

        // Anomaly
        if (document.getElementById('cfg-anomaly')?.checked && Math.random() < 0.3) {
            G.anomaly = ANOMALIES[Math.floor(Math.random() * ANOMALIES.length)];
        }

        G.lastConfig = { cat, word, mode: selectedMode };
        roundsPlayed++;
        G.cur = 0;

        // XP multiplier check (spy wins in first minute → ×2)
        G._roundStart = Date.now();

        // Haptic
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

        // Update chaos games stat
        if (G.chaosMode) G.session.forEach(p => { const orig = players.find(pl => pl.name === p.name); if (orig) orig.chaosGames = (orig.chaosGames || 0) + 1; });

        // Dynamic time
        tSec = G.chaosMode ? 120 : calcDynamicTime();
        tTotal = tSec; tRunning = false; clearInterval(tInt);

        // Apply Tier from stats
        G.session.forEach(p => { const orig = players.find(pl => pl.name === p.name); p.tier = orig ? getTier(orig.score) : 1; });

        showScreen('game');
        document.getElementById('round-badge').textContent = 'Раунд ' + roundsPlayed;
        document.getElementById('mode-badge').textContent = (GAME_MODES.find(m => m.id === selectedMode) || {}).name || '';
        document.getElementById('round-badge').style.display = 'inline-block';
        document.getElementById('open-admin-bar').style.display = 'block';

        // Veto for VIP
        initVeto();

        showStage('pass');
        renderPassStage();

        // Psych role timer
        if (G.chaosMode) startPsychTimer();

        logConsole('Игра начата. Шпионов: ' + G.session.filter(p => p.isSpy).length, 'info');
    } catch (e) {
        SU_DEBUG.error('startGame: ' + e);
        showPopup('⚠ Ошибка старта: ' + e.message, 'danger');
        emergencyRecovery();
    }
}

function assignSpies(forced, chaosMode) {
    const count = Math.min(parseInt(document.getElementById('cfg-spies')?.value || '1'), G.session.length - 1);
    G.session.forEach(p => p.isSpy = false);
    if (chaosMode === 'peaceful') return;
    if (chaosMode === 'paranoia') { G.session.forEach(p => p.isSpy = true); return; }
    if (chaosMode === 'chaos' && Math.random() < 0.33) { G.session.forEach(p => p.isSpy = true); return; }
    let useCount = count;
    if (chaosMode === 'custom') {
        const pct = parseInt(document.getElementById('sh-custom-chance')?.value || '30') / 100;
        useCount = Math.max(1, Math.round(G.session.length * pct));
    }
    if (forced && forced !== 'none') {
        const t = G.session.find(p => p.name === forced);
        if (t) {
            t.isSpy = true;
            shuffle(G.session.filter(p => !p.isSpy)).slice(0, Math.max(0, useCount - 1)).forEach(p => p.isSpy = true);
            return;
        }
    }
    shuffle([...G.session]).slice(0, Math.min(useCount, G.session.length - 1)).forEach(p => p.isSpy = true);
}

function assignChaosRoles() {
    const source = typeof getActiveChaosRolePool === 'function' ? getActiveChaosRolePool() : CHAOS_ROLES;
    const pool = shuffle([...source]);
    if (!pool.length) { showPopup('⚠ Нет активных ролей Chaos!', 'danger'); return; }
    G.session.forEach((p, i) => {
        const role = pool[i % pool.length];
        p.chaosRole = role.id;
        p.roleUsed = false;
        p.ultUsed = false;
        p.voteWeight = 1;
    });
    // Mayor override weight
    const mayor = G.session.find(p => p.chaosRole === 'mayor');
    if (mayor) mayor.voteWeight = mayor.tier >= 2 ? 1.5 : 1.2;
}

/* ════════════════════════════════════════════════════
   §15  PASS STAGE
════════════════════════════════════════════════════ */
function renderPassStage() {
    const p = G.session[G.cur];
    if (!p) return;
    const av = document.getElementById('pass-avatar');
    const nm = document.getElementById('pass-name');
    const ti = document.getElementById('pass-tier');
    if (av) av.innerHTML = p.photo ? `<img src="${p.photo}" style="width:58px;height:58px;border-radius:50%;object-fit:cover">` : `<span>${p.avatar}</span>`;
    if (nm) nm.textContent = p.name;
    if (ti) ti.textContent = p.chaosRole ? ('Роль: ???  · Tier ' + p.tier) : 'Tier ' + p.tier;
    triggerHallucination('pass');
    logConsole('Передача: ' + p.name, 'info');
}

/* ════════════════════════════════════════════════════
   §16  ROLE REVEAL
════════════════════════════════════════════════════ */
function viewRole() {
    try {
        const p = G.session[G.cur];
        if (!p) return;
        if (navigator.vibrate) navigator.vibrate(200);
        playSfx('reveal');

        // Anti-cheat: hash role for console obfuscation
        const roleHash = btoa(encodeURIComponent(p.isSpy ? 'SPY' : 'CIVIL'));
        window._suRoleHash = roleHash;

        let html = buildRoleCardHTML(p);
        document.getElementById('role-card-container').innerHTML = html;

        // Evidence
        renderEvidence(p);

        // Abilities
        renderAbilityButtons(p);

        // Role passive effects
        applyPassiveEffects(p);

        showStage('role');
        triggerHallucination('role');

        // Technician notification
        if (p.isSpy) {
            const tech = G.session.find(s => s.chaosRole === 'technician' && !s.isSpy);
            if (tech) { setTimeout(() => showPopup('🔧 Техник: Шпион открыл роль!'), 500); }
        }

        logConsole(p.name + ' открыл роль', 'info');
    } catch (e) { SU_DEBUG.error('viewRole: ' + e); }
}

function buildRoleCardHTML(p) {
    const roleObj = p.chaosRole ? CHAOS_ROLES.find(r => r.id === p.chaosRole) : null;
    const roleHtml = roleObj ? `<div class="chaos-role-box">${roleObj.emoji} <strong>${roleObj.name}</strong> · T${p.tier}<br>${roleObj.tiers[p.tier]?.passive || roleObj.tiers[p.tier]?.active || ''}</div>` : '';

    if (p.isDetective) {
        return `<div class="role-card rc-role">
      <div class="role-tag">ДЕТЕКТИВ</div><div class="role-emoji">🔎</div>
      <div class="role-category">${p.cat}</div>
      <div class="role-word">${p.word}</div>
      <div class="role-hint-box">Ты знаешь слово. Говори последним!</div>${roleHtml}</div>`;
    }
    if (p.isTraitor) {
        return `<div class="role-card rc-role">
      <div class="role-tag">ПРЕДАТЕЛЬ</div><div class="role-emoji">🗡</div>
      <div class="role-category">${p.cat}</div>
      <div class="role-word">${p.word}</div>
      <div class="role-hint-box">Помогаешь шпиону. Победишь вместе с ним.</div>${roleHtml}</div>`;
    }
    if (p.isSilencer) {
        return `<div class="role-card rc-role">
      <div class="role-tag">МОЛЧУН</div><div class="role-emoji">🤫</div>
      <div class="role-category">${p.cat}</div>
      <div class="role-word">${p.word}</div>
      <div class="role-hint-box" style="color:var(--neon3)">⚠ НЕ МОЖЕШЬ ГОВОРИТЬ!</div>${roleHtml}</div>`;
    }
    if (p.isSleeper) {
        return `<div class="role-card rc-sleeper">
      <div class="role-tag">ЗАВЕРБОВАННЫЙ</div><div class="role-emoji">🌙</div>
      <div class="role-category">${p.cat}</div>
      <div class="role-word">${p.word}</div>
      <div class="role-hint-box">Ты завербован шпионом. Помогай незаметно.</div>${roleHtml}</div>`;
    }
    if (p.isSpy && !p.isDouble) {
        const brokenDisp = p.brokenWord || (G.anomaly?.id === 'broken' ? p.word.replace(/[аеёиоуыьъэюяАЕЁИОУЫЬЪЭЮЯ]/g, '_') : null);
        const spyExtra = selectedMode === 'blind' ? '<div class="role-hint-box">Слово и категория неизвестны!</div>'
            : selectedMode === 'mirror' ? `<div class="role-hint-box">Твоё слово (зеркало): <b>${p.mirrorWord}</b></div>`
                : brokenDisp ? `<div class="role-hint-box">Слово (согласные): <b>${brokenDisp}</b></div>`
                    : '';
        const maniacHtml = selectedMode === 'maniac' && G.maniacVictim ? `<div class="role-hint-box">🔪 Твоя жертва: ${G.maniacVictim}</div>` : '';
        const hintHtml = getSpyHint(p) ? `<div class="role-hint-box">💡 ${getSpyHint(p)}</div>` : '';
        return `<div class="role-card rc-spy${G.spyVisionActive ? ' neon-glow' : ''}">
      <div class="role-tag">СЕКРЕТНО</div><div class="role-emoji">🕵</div>
      <div class="role-name-big" style="color:var(--neon3)">ТЫ ШПИОН</div>
      ${spyExtra}${maniacHtml}${hintHtml}${roleHtml}</div>`;
    }
    // Civil
    const isVip = p.vip;
    const cls = isVip ? 'rc-vip' : p.isDouble ? 'rc-spy' : 'rc-civil';
    const clr = isVip ? 'var(--gold)' : p.isDouble ? 'var(--neon3)' : 'var(--neon)';
    const alibi = isVip ? `<div class="role-hint-box">💬 Алиби: «${generateAlibi()}»</div>` : '';
    return `<div class="role-card ${cls}">
    <div class="role-tag">${p.isDouble ? 'ДВОЙНОЙ АГЕНТ' : 'МИРНЫЙ'}</div>
    <div class="role-emoji">${isVip ? '⭐' : p.isDouble ? '🎭' : '✅'}</div>
    <div class="role-category">${p.cat}</div>
    <div class="role-word" style="color:${clr}">${p.word}</div>
    ${p.isDouble ? '<div class="role-hint-box">Ты шпион, но знаешь слово!</div>' : ''}
    ${alibi}${roleHtml}</div>`;
}

function generateAlibi() {
    const alibis = ['Я был дома весь вечер', 'Спросите у соседей', 'Меня там не было', 'Я в этом не участвовал', 'У меня есть свидетели'];
    return alibis[Math.floor(Math.random() * alibis.length)];
}

function getSpyHint(p) {
    if (!p.isSpy || p.isDouble) return '';
    const h = document.querySelector('input[name="spy-hint"]:checked')?.value || 'none';
    if (h === 'letter') return 'Первая буква: «' + p.word[0] + '»';
    if (h === 'length') return 'Длина слова: ' + p.word.length + ' букв';
    if (h === 'type') return 'Тип: ' + ['место', 'предмет', 'человек', 'понятие'][Math.floor(Math.random() * 4)];
    return '';
}

/* ════════════════════════════════════════════════════
   §17  EVIDENCE SYSTEM
════════════════════════════════════════════════════ */
function renderEvidence(p) {
    const el = document.getElementById('evidence-container');
    if (!el) return;
    if (!document.getElementById('cfg-evidence')?.checked) { el.innerHTML = ''; return; }
    if (p.isSpy && !p.isDouble) {
        const all = Object.values(themes).flat();
        const fakes = shuffle(all.filter(w => w !== p.word)).slice(0, 3);
        el.innerHTML = `<div class="evidence-card fake">
      <div class="evidence-tag" style="color:var(--neon3)">🔴 ЛОЖНЫЕ УЛИКИ (только для тебя):</div>
      ${fakes.map(f => `<div>— «${f}»</div>`).join('')}
    </div>`;
    } else if (!p.isSpy) {
        const catQs = THEME_Q[p.cat] || [];
        const clues = [
            `Это в теме «${p.cat}»`,
            `Слово из ${p.word.length} букв`,
            `Начинается на «${p.word[0]}»`,
            ...catQs,
        ];
        const clue = clues[Math.floor(Math.random() * Math.min(3, clues.length))];
        el.innerHTML = `<div class="evidence-card">
      <div class="evidence-tag" style="color:#00cfff">🔵 УЛИКА:</div>
      <div>— ${clue}</div>
    </div>`;
    } else {
        el.innerHTML = '';
    }
}

/* ════════════════════════════════════════════════════
   §18  ABILITY BUTTONS (Tier-based)
════════════════════════════════════════════════════ */
function renderAbilityButtons(p) {
    const el = document.getElementById('ability-buttons-container');
    if (!el) return;
    if (!G.chaosMode && selectedMode !== 'chaos') { el.innerHTML = ''; return; }
    const roleObj = CHAOS_ROLES.find(r => r.id === p.chaosRole);
    if (!roleObj) { el.innerHTML = ''; return; }
    const tier = p.tier || 1;
    let btns = '<div class="ability-wrap">';

    if (tier >= 2 && roleObj.type === 'active' && !p.roleUsed) {
        const label = roleObj.tiers[2]?.active || roleObj.tiers[2]?.passive || 'Активная';
        btns += `<button class="ability-btn" data-tooltip="${label}" onclick="useAbility('${p.chaosRole}')">⚡ ${label.substring(0, 22)}</button>`;
    }
    if (tier >= 3 && !p.ultUsed) {
        const ult = roleObj.tiers[3]?.ult || 'Ульта';
        btns += `<button class="ability-btn ult-btn" data-tooltip="${ult}" onclick="useUlt('${p.chaosRole}')">💥 УЛЬТА</button>`;
    }
    btns += '</div>';
    el.innerHTML = tier >= 2 || (tier >= 3 && !p.ultUsed) ? btns : '';
}

function updateAbilityButtonsIfNeeded() {
    if (G.session.length && G.cur < G.session.length) {
        renderAbilityButtons(G.session[G.cur]);
    }
}

/* ════════════════════════════════════════════════════
   §19  PASSIVE EFFECTS (applied on role reveal)
════════════════════════════════════════════════════ */
function applyPassiveEffects(p) {
    const roleObj = CHAOS_ROLES.find(r => r.id === p.chaosRole);
    if (!roleObj) return;
    const tier = p.tier || 1;

    switch (p.chaosRole) {
        case 'witness':
            if (!p.isSpy) {
                const hint = tier >= 2 ? `«${p.word[0]}»...«${p.word[p.word.length - 1]}»` : `«${p.word[0]}»`;
                setTimeout(() => showPopup('👁 Свидетель: ' + hint), 600);
            }
            break;
        case 'analyst':
            const logEl = document.getElementById('analyst-log');
            if (logEl) {
                logEl.classList.remove('hidden');
                logEl.innerHTML = G.analystLog.slice(-6).map(e => `<div>${e}</div>`).join('') || '<div>Нет действий</div>';
            }
            break;
        case 'judas':
            if (!p.isSpy) {
                const spy = G.session.find(s => s.isSpy);
                if (spy) {
                    const reveal = tier >= 2 ? 'Шпион: ' + spy.name : 'Шпион начинается на «' + spy.name[0] + '»';
                    setTimeout(() => showPopup('🐍 Иуда знает: ' + reveal), 700);
                }
            }
            break;
        case 'sensei':
            const count = G.session.filter(s => s.chaosRole).length;
            const info = tier >= 2 ? CHAOS_ROLES.slice(0, count).map(r => r.name).join(', ') : `Ролей в игре: ${count}`;
            setTimeout(() => showPopup('🧘 Сенсей: ' + info), 600);
            break;
        case 'psych':
            document.getElementById('psych-task-container').innerHTML = '';
            break;
        case 'mayor':
            setTimeout(() => showPopup('👑 Мэр: голос ×' + (tier >= 2 ? '1.5' : '1.2')), 600);
            break;
        case 'ninja':
            if (tier >= 2) G.protected.add(p.name);
            break;
        case 'kamikaze':
            setTimeout(() => showPopup('💥 Камикадзе готов!'), 600);
            break;
        case 'provocateur':
            setTimeout(() => showPopup('😈 Провокатор: +' + (tier >= 2 ? '10' : '5') + ' XP за каждый голос против'), 600);
            break;
        case 'trader':
            if (tier >= 1) {
                const xpList = G.session.map(s => { const o = players.find(pl => pl.name === s.name); return s.name + ':' + (o?.score || 0); }).join(', ');
                setTimeout(() => showPopup('💰 Торговец — XP: ' + xpList), 600);
            }
            break;
    }
}

/* ════════════════════════════════════════════════════
   §20  USE ABILITY (22 roles implementation)
════════════════════════════════════════════════════ */
function useAbility(roleId) {
    const p = G.session[G.cur];
    if (!p || p.roleUsed) { showPopup('Способность уже использована!', 'danger'); return; }
    p.roleUsed = true;
    G.analystLog.push(`[${new Date().toLocaleTimeString('ru')}] ${p.name} (${roleId}) использовал активку`);
    logConsole(p.name + ' → ' + roleId + ' активка', 'info');

    switch (roleId) {
        case 'sheriff': {
            // Show selector for check
            const opts = G.session.filter(s => s.name !== p.name).map(s => `<option value="${s.name}">${s.name}</option>`).join('');
            const container = document.getElementById('ability-buttons-container');
            if (container) container.innerHTML += `<div class="card-sm" style="margin-top:8px">
        <div class="albl">🤠 Шериф: выбери для проверки</div>
        <select class="su-select" id="sheriff-target">${opts}</select>
        <button class="ability-btn" onclick="sheriffCheck()">Проверить</button>
      </div>`;
            break;
        }
        case 'doctor': {
            const opts = G.session.filter(s => s.name !== p.name).map(s => `<option value="${s.name}">${s.name}</option>`).join('');
            const container = document.getElementById('ability-buttons-container');
            if (container) container.innerHTML += `<div class="card-sm" style="margin-top:8px">
        <div class="albl">⚕️ Доктор: кого защитить?</div>
        <select class="su-select" id="doctor-target">${opts}</select>
        <button class="ability-btn" onclick="doctorShield()">🛡 Щит</button>
      </div>`;
            break;
        }
        case 'journalist': {
            const opts = G.session.filter(s => s.name !== p.name).map(s => `<option value="${s.name}">${s.name}</option>`).join('');
            const container = document.getElementById('ability-buttons-container');
            if (container) container.innerHTML += `<div class="card-sm" style="margin-top:8px">
        <div class="albl">📰 Журналист: сравнить двух</div>
        <select class="su-select" id="jour-p1">${opts}</select>
        <select class="su-select" id="jour-p2">${opts}</select>
        <button class="ability-btn" onclick="journalistCheck()">Сравнить</button>
      </div>`;
            break;
        }
        case 'thief': {
            const opts = G.session.filter(s => s.name !== p.name && s.chaosRole && !s.roleUsed).map(s => `<option value="${s.name}">${s.name}</option>`).join('');
            const container = document.getElementById('ability-buttons-container');
            if (container) container.innerHTML += `<div class="card-sm" style="margin-top:8px">
        <div class="albl">🦊 Вор: украсть у кого?</div>
        <select class="su-select" id="thief-target">${opts}</select>
        <button class="ability-btn" onclick="thiefSteal()">Украсть</button>
      </div>`;
            break;
        }
        case 'hacker': {
            document.body.classList.add('glitch-active');
            setTimeout(() => document.body.classList.remove('glitch-active'), 10000);
            showPopup('💻 Хакер: Глитч 10 сек!', 'danger');
            if (navigator.vibrate) navigator.vibrate([50, 50, 50, 50, 50]);
            break;
        }
        case 'chameleon': {
            const opts = G.session.filter(s => s.name !== p.name).map(s => `<option value="${s.name}">${s.name}</option>`).join('');
            const container = document.getElementById('ability-buttons-container');
            if (container) container.innerHTML += `<div class="card-sm" style="margin-top:8px">
        <div class="albl">🦎 Хамелеон: копировать цвет</div>
        <select class="su-select" id="cham-target">${opts}</select>
        <button class="ability-btn" onclick="chameleonCopy()">Копировать</button>
      </div>`;
            break;
        }
        case 'diplomat': {
            G.protected.add(G.session.find(s => s.name !== p.name)?.name || '');
            showPopup('🤝 Дипломат: защита активна!');
            break;
        }
        case 'peacemaker': {
            showPopup('☮️ Миротворец: голосование отменено!');
            showStage('discuss');
            break;
        }
        case 'sensei': {
            const target = G.session.find(s => s.name !== p.name);
            if (target) { const orig = players.find(pl => pl.name === target.name); if (orig) { orig.tier = Math.min(3, (orig.tier || 1) + 1); target.tier = orig.tier; saveAll(); showPopup('🧘 Сенсей: ' + target.name + ' → T' + target.tier); } }
            break;
        }
        case 'medium': {
            const dead = G.eliminatedPlayers[G.eliminatedPlayers.length - 1];
            if (dead) showPopup('🔮 Медиум: ' + dead.name + ' был(а) ' + (dead.isSpy ? 'ШПИОНОМ' : 'Мирным'));
            else showPopup('🔮 Медиум: никто не выбыл');
            break;
        }
        case 'trader': {
            const orig = players.find(pl => pl.name === p.name);
            if (orig && orig.score >= 30) { orig.score -= 30; p.voteWeight = (p.voteWeight || 1) + 1; saveAll(); showPopup('💰 Торговец: -30 XP → +1 к голосу!'); }
            else showPopup('💰 Торговец: мало XP!', 'danger');
            break;
        }
        case 'technician': {
            document.body.classList.remove('glitch-active');
            document.querySelectorAll('.glitch-active').forEach(e => e.classList.remove('glitch-active'));
            showPopup('🔧 Техник: глитч снят!');
            break;
        }
        case 'witness': {
            const p2 = G.session[G.cur];
            if (!p2.isSpy) showPopup('👁 Свидетель: «' + p2.word[0] + '»...«' + p2.word[p2.word.length - 1] + '»');
            break;
        }
        default:
            showPopup('⚡ ' + (CHAOS_ROLES.find(r => r.id === roleId)?.name || roleId) + ' активировал способность!');
    }
    renderAbilityButtons(p);
}

// Sheriff check
function sheriffCheck() {
    const target = document.getElementById('sheriff-target')?.value;
    if (!target) return;
    const p = G.session[G.cur];
    const targetPlayer = G.session.find(s => s.name === target);
    if (!targetPlayer) return;

    // Ninja blocks sheriff
    if (targetPlayer.chaosRole === 'ninja' && (targetPlayer.tier || 1) >= 2) {
        showPopup('🥷 Ниндзя: роль неизвестна!', 'danger'); return;
    }

    G.sheriffChecks[p.name] = (G.sheriffChecks[p.name] || 0) + (targetPlayer.isSpy ? 1 : -1);

    if (targetPlayer.isSpy || targetPlayer.isTraitor) {
        // Sheriff wins if tier 3 and 2nd correct check
        if ((p.tier || 1) >= 3 && G.sheriffChecks[p.name] >= 2) {
            showPopup('🤠 ШЕРИФ: МГНОВЕННАЯ ПОБЕДА! 2 верных проверки!', 'gold');
            setTimeout(() => showFinal(G.session.indexOf(targetPlayer)), 1500);
        } else {
            showPopup('🤠 Шериф: ЭТО ШПИОН! → Победа мирных!', 'gold');
            setTimeout(() => showFinal(G.session.indexOf(targetPlayer)), 1500);
        }
    } else {
        if (active().length <= 3) {
            showPopup('🤠 Шериф ошибся! Поражение мирных!', 'danger');
            setTimeout(() => showFinal(-1, true), 1500);
        } else {
            showPopup('🤠 Шериф ошибся! Выбывает из игры.', 'danger');
            G.eliminatedPlayers.push({ ...p });
            G.session = G.session.filter(s => s.name !== p.name);
            showStage('discuss');
        }
    }
}

// Doctor shield
function doctorShield() {
    const target = document.getElementById('doctor-target')?.value;
    if (!target) return;
    G.doctorShields.add(target);
    showPopup('⚕️ Доктор: ' + target + ' защищён на раунд!');
}

// Journalist
function journalistCheck() {
    const p1 = G.session.find(s => s.name === document.getElementById('jour-p1')?.value);
    const p2 = G.session.find(s => s.name === document.getElementById('jour-p2')?.value);
    if (!p1 || !p2) return;
    const same = (p1.isSpy || p1.isTraitor) === (p2.isSpy || p2.isTraitor);
    showPopup('📰 Журналист: ' + p1.name + ' и ' + p2.name + ' — ' + (same ? 'ОДНА фракция' : 'РАЗНЫЕ фракции'));
}

// Thief
function thiefSteal() {
    const targetName = document.getElementById('thief-target')?.value;
    const target = G.session.find(s => s.name === targetName);
    const p = G.session[G.cur];
    if (!target || !p) return;
    const stolen = target.chaosRole;
    G.stolenAbility[p.name] = stolen;
    target.roleUsed = true;
    showPopup('🦊 Вор украл способность «' + (CHAOS_ROLES.find(r => r.id === stolen)?.name || stolen) + '» у ' + targetName + '!');
    G.analystLog.push(`[${new Date().toLocaleTimeString('ru')}] ${p.name} украл способность у ${targetName}`);
}

// Chameleon
function chameleonCopy() {
    const targetName = document.getElementById('cham-target')?.value;
    const target = G.session.find(s => s.name === targetName);
    const p = G.session[G.cur];
    const orig = players.find(pl => pl.name === p.name);
    const tOrig = players.find(pl => pl.name === targetName);
    if (orig && tOrig) { orig.color = tOrig.color; orig.avatar = tOrig.avatar; saveAll(); renderAgents(); showPopup('🦎 Хамелеон скопировал внешность ' + targetName + '!'); }
}

/* ════════════════════════════════════════════════════
   §21  USE ULT
════════════════════════════════════════════════════ */
function useUlt(roleId) {
    const p = G.session[G.cur];
    if (!p || p.ultUsed) { showPopup('Ульта уже использована!', 'danger'); return; }
    p.ultUsed = true;
    const orig = players.find(pl => pl.name === p.name);
    if (orig) orig.usedUlt = true;
    G.analystLog.push(`[${new Date().toLocaleTimeString('ru')}] ${p.name} (${roleId}) использовал УЛЬТУ`);
    logConsole(p.name + ' → УЛЬТА → ' + roleId, 'warn');

    switch (roleId) {
        case 'sheriff': showPopup('🤠💥 УЛЬТА Шерифа: следующая верная проверка = мгновенная победа!', 'gold'); break;
        case 'bodyguard': { const spy = G.session.find(s => s.isSpy); if (spy) showPopup('🛡💥 УЛЬТА Телохранителя: роль ' + spy.name + ' РАСКРЫТА!'); else showPopup('🛡💥 Нет видимого шпиона'); break; }
        case 'judas': p.isSleeper = true; p.isSpy = true; showPopup('🐍💥 Иуда перешёл на сторону шпиона!', 'danger'); break;
        case 'witness': showPopup('👁💥 Свидетель видит слово: «' + p.word + '» (5 сек)'); setTimeout(() => showPopup('👁 Слово исчезло'), 5000); break;
        case 'hacker': document.body.classList.add('glitch-active'); setTimeout(() => document.body.classList.remove('glitch-active'), 30000); applyAnomaly('matrix'); showPopup('💻💥 Глитч 30 сек + Сбой матрицы!', 'danger'); break;
        case 'psych': showPopup('🤪💥 ПСИХ УЛЬТА: все обязаны говорить его фразами 1 минуту!', 'danger'); setTimeout(() => showPopup('🔊 Обязательство снято'), 60000); break;
        case 'mayor': p.voteWeight = 3; showPopup('👑💥 УЛЬТА Мэра: голос ×3 в этом голосовании!', 'gold'); break;
        case 'ninja': G.protected.add(p.name); showPopup('🥷💥 Ниндзя исчез из списка голосования!'); break;
        case 'doctor': {
            const dead = G.eliminatedPlayers[G.eliminatedPlayers.length - 1];
            if (dead) { G.session.push({ ...dead, isSpy: false }); G.eliminatedPlayers.pop(); showPopup('⚕️💥 Доктор воскресил ' + dead.name + '!', 'gold'); }
            else showPopup('⚕️💥 Некого воскрешать', 'danger');
            break;
        }
        case 'sensei': {
            const roles = G.session.map(s => (CHAOS_ROLES.find(r => r.id === s.chaosRole)?.name || '?')).join(', ');
            showPopup('🧘💥 Сенсей видит все роли: ' + roles);
            break;
        }
        case 'journalist': {
            const spy = G.session.find(s => s.isSpy);
            if (spy) showPopup('📰💥 Журналист публикует: ШПИОН — ' + spy.name + '!', 'danger');
            break;
        }
        case 'thief': {
            const stolen = G.stolenAbility[p.name];
            if (stolen) { G.analystLog.push(`${p.name} использовал украденную ${stolen}`); showPopup('🦊💥 Вор использует украденную способность «' + (CHAOS_ROLES.find(r => r.id === stolen)?.name || stolen) + '»!'); }
            break;
        }
        case 'agent007': {
            const spy = G.session.find(s => s.isSpy);
            if (spy) { showPopup('🔫💥 Агент 007: перехват! XP ×2 для команды!', 'gold'); G.xpMultiplier = 2; setTimeout(() => showFinal(G.session.indexOf(spy)), 1000); }
            break;
        }
        case 'medium': {
            const dead = G.eliminatedPlayers[G.eliminatedPlayers.length - 1];
            if (dead) showPopup('🔮💥 Медиум вызвал дух ' + dead.name + ': «' + (dead.isSpy ? 'Я был шпионом!' : 'Я был мирным!') + '»');
            break;
        }
        case 'chameleon': {
            const target = G.session.find(s => s.name !== p.name);
            if (target) { const t = players.find(pl => pl.name === target.name); const o = players.find(pl => pl.name === p.name); if (t && o) { o.color = t.color; o.avatar = t.avatar; o.name = t.name + '*'; saveAll(); showPopup('🦎💥 Хамелеон полностью скопировал ' + target.name + '!'); } }
            break;
        }
        case 'diplomat': goVote(); showPopup('🤝💥 Дипломат отменил основное голосование!'); break;
        case 'provocateur': {
            const pair = shuffle(G.session.filter(s => s.name !== p.name)).slice(0, 2);
            if (pair.length === 2) {
                G.provocateurForced[pair[0].name] = G.session.indexOf(pair[1]);
                G.provocateurForced[pair[1].name] = G.session.indexOf(pair[0]);
                showPopup('😈💥 Провокатор: ' + pair[0].name + ' и ' + pair[1].name + ' голосуют друг за друга!', 'danger');
            }
            break;
        }
        case 'analyst': {
            const fullLog = G.analystLog.join(' | ');
            showPopup('📊💥 Полный лог: ' + (fullLog || 'нет данных'));
            break;
        }
        case 'trader': {
            const origT = players.find(pl => pl.name === p.name);
            if (origT && origT.score >= 100) { origT.score -= 100; G.protected.add(p.name); saveAll(); showPopup('💰💥 Торговец купил иммунитет за 100 XP!', 'gold'); }
            else showPopup('💰💥 Мало XP (нужно 100)!', 'danger');
            break;
        }
        case 'technician': {
            const spy = G.session.find(s => s.isSpy);
            if (spy) { spy.roleUsed = true; showPopup('🔧💥 Техник блокирует следующее действие шпиона!'); }
            break;
        }
        case 'peacemaker': {
            const forbidden = prompt('Запретное слово:');
            if (forbidden) { G.forbiddenWord = forbidden; showPopup('☮️💥 Слово «' + forbidden + '» запрещено на раунд!'); }
            break;
        }
        case 'kamikaze': {
            const container = document.getElementById('ability-buttons-container');
            if (container) {
                const opts = G.session.filter(s => s.name !== p.name).map(s => `<option value="${s.name}">${s.name}</option>`).join('');
                container.innerHTML += `<div class="card-sm" style="margin-top:8px">
          <div class="albl">💥 Камикадзе: кого забрать?</div>
          <select class="su-select" id="kami-target">${opts}</select>
          <button class="ability-btn" style="background:var(--neon3)" onclick="kamikazeSelect()">💥 ВЗОРВАТЬСЯ</button>
        </div>`;
            }
            break;
        }
        default: showPopup('💥 УЛЬТА ' + (CHAOS_ROLES.find(r => r.id === roleId)?.name || roleId) + '!');
    }
    renderAbilityButtons(p);
}

function kamikazeSelect() {
    const targetName = document.getElementById('kami-target')?.value;
    showPopup('💥 КАМИКАДЗЕ! ' + targetName + ' тоже вылетает!', 'danger');
    G.session = G.session.filter(s => s.name !== targetName);
    showStage('discuss');
}

/* ════════════════════════════════════════════════════
   §22  PSYCH ROLE TIMER
════════════════════════════════════════════════════ */
let psychTimer = null;
function startPsychTimer() {
    clearInterval(psychTimer);
    const psych = G.session.find(p => p.chaosRole === 'psych');
    if (!psych) return;
    const role = CHAOS_ROLES.find(r => r.id === 'psych');
    psychTimer = setInterval(() => {
        const phrase = role.phrases[Math.floor(Math.random() * role.phrases.length)];
        const el = document.getElementById('psych-task-container');
        if (el) { el.innerHTML = `<div class="psych-task">🤪 ПСИХ: скажи сейчас: «${phrase}»</div>`; setTimeout(() => { if (el) el.innerHTML = ''; }, 8000); }
        showPopup('🤪 Псих: «' + phrase + '»');
    }, 60000);
}

/* ════════════════════════════════════════════════════
   §23  NEXT PLAYER
════════════════════════════════════════════════════ */
function nextPlayer() {
    G.cur++;
    if (G.cur < G.session.length) {
        showStage('pass');
        renderPassStage();
    } else {
        showStage('discuss');
        const hint = document.getElementById('discuss-hint');
        if (hint) hint.textContent = (GAME_MODES.find(m => m.id === selectedMode) || {}).name || '';
        if (G.anomaly) applyAnomaly(G.anomaly.id);
        updateTimerDisplay();
        const mvWarn = document.getElementById('minivote-warning');
        if (mvWarn && document.getElementById('cfg-minivote')?.checked) {
            mvWarn.classList.remove('hidden');
            mvWarn.textContent = '⚖ Мини-голосование через ' + Math.floor(tTotal / 60) + ' минуты';
        }
    }
}

/* ════════════════════════════════════════════════════
   §24  MINI VOTE (Interim Vote)
════════════════════════════════════════════════════ */
function initMiniVote() {
    G.miniVotes = {};
    G.miniVoterIdx = 0;
    G.miniVotePick = null;
    document.getElementById('mv-round-num').textContent = G.miniVoteRound;
    showMiniVotePass();
}
function showMiniVotePass() {
    if (G.miniVoterIdx >= G.session.length) { resolveMiniVote(); return; }
    const voter = G.session[G.miniVoterIdx];
    document.getElementById('mv-voter-label').textContent = voter.name + ' — кого подозреваешь? (вес 0.5)';
    const grid = document.getElementById('mv-grid');
    if (grid) {
        grid.innerHTML = G.session.map((p, i) => {
            if (p.name === voter.name) return `<div class="vote-item disabled"><span>${p.avatar} ${p.name}</span><span class="vote-dot">—</span></div>`;
            return `<div class="vote-item" id="mvi-${i}" onclick="pickMiniV(${i})"><span>${p.avatar} ${p.name}</span><span class="vote-dot" id="mvd-${i}">○</span></div>`;
        }).join('');
    }
    G.miniVotePick = null;
    showStage('minivote');
}
function pickMiniV(i) {
    G.miniVotePick = i;
    document.querySelectorAll('#mv-grid .vote-item:not(.disabled)').forEach(el => {
        const ri = parseInt(el.id.replace('mvi-', ''));
        el.classList.toggle('selected', ri === i);
        const dot = el.querySelector('.vote-dot'); if (dot) dot.textContent = ri === i ? '●' : '○';
    });
}
function confirmMiniVote() {
    if (G.miniVotePick === null) { showPopup('Выберите!', 'danger'); return; }
    const voter = G.session[G.miniVoterIdx];
    G.miniVotes[voter.name] = { target: G.miniVotePick, weight: 0.5 };
    G.miniVoterIdx++;
    showMiniVotePass();
}
function skipMiniVote() { G.miniVoterIdx = G.session.length; resolveMiniVote(); }
function resolveMiniVote() {
    const vc = {};
    G.session.forEach((_, i) => vc[i] = 0);
    Object.values(G.miniVotes).forEach(v => vc[v.target] = (vc[v.target] || 0) + v.weight);
    const maxV = Math.max(...Object.values(vc));
    const top = Object.entries(vc).filter(([, v]) => v === maxV).map(([k]) => G.session[+k]?.name || '?');
    showPopup('⚖ Мини-итог: «' + top.join(', ') + '» (' + maxV.toFixed(1) + ' голоса)');
    tSec = 120; tTotal = 120; tRunning = false;
    showStage('discuss');
    updateTimerDisplay();
}

/* ════════════════════════════════════════════════════
   §25  VOTING
════════════════════════════════════════════════════ */
function active() { return G.session.filter(p => !G.eliminatedPlayers.find(e => e.name === p.name)); }

function goVote() {
    G.votes = {}; G.voteStep = 0; G.pick = null;
    clearInterval(tInt); tRunning = false; stopHeartbeat();
    clearInterval(psychTimer);
    showVotePass();
    logConsole('Голосование начато', 'info');
}

function showVotePass() {
    const voter = G.session[G.voteStep];
    if (!voter) return;
    document.getElementById('vote-voter-name').textContent = voter.name;
    showStage('vote-pass');
}

function startPlayerVote() {
    G.pick = null;
    const voter = G.session[G.voteStep];
    document.getElementById('vote-voter-label').textContent = voter.name + ' — выбери подозреваемого:';
    const hasVeto = voter.vip && (G.vetoLeft || 0) > 0;

    const grid = document.getElementById('vote-grid');
    if (!grid) return;
    grid.innerHTML = G.session.map((p, i) => {
        const blocked = (G.blockedVote && p.name === G.blockedVote) || G.protected.has(p.name);
        const isImmune = (G.immune && p.name === G.immune) || G.doctorShields.has(p.name);
        const forced = G.provocateurForced[voter.name] === i;
        const spyMark = G.spyVisionActive && p.isSpy ? ' 👁' : '';

        if (p.name === voter.name || blocked) {
            return `<div class="vote-item disabled" id="vi-${i}">
        <span>${p.photo ? `<img src="${p.photo}" style="width:16px;height:16px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:3px">` : p.avatar + ' '}${p.name}</span>
        <span class="vote-dot">${p.name === voter.name ? '—' : '🛡'}</span></div>`;
        }
        return `<div class="vote-item${isImmune ? ' immune' : ''}${forced ? ' selected' : ''}" id="vi-${i}" onclick="pickVote(${i})">
      <span>${p.photo ? `<img src="${p.photo}" style="width:16px;height:16px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:3px">` : p.avatar + ' '}${p.name}${p.vip ? ' ⭐' : ''}${spyMark}</span>
      <span class="vote-dot" id="vd-${i}">${forced ? '●' : '○'}</span></div>`;
    }).join('') + (hasVeto ? `<button class="veto-btn" onclick="useVeto()">⭐ ВЕТО (${G.vetoLeft})</button>` : '');

    playSfx('vote');
    showStage('vote');
    triggerHallucination('vote');

    // Apply forced provocateur vote
    const forced = G.provocateurForced[voter.name];
    if (forced !== undefined) G.pick = forced;
}

function pickVote(i) {
    G.pick = i;
    document.querySelectorAll('#vote-grid .vote-item:not(.disabled):not(.immune)').forEach(el => {
        const ri = parseInt(el.id.replace('vi-', ''));
        el.classList.toggle('selected', ri === i);
        const dot = document.getElementById('vd-' + ri); if (dot) dot.textContent = ri === i ? '●' : '○';
    });
}

function confirmVote() {
    if (G.pick === null) { showPopup('Выберите!', 'danger'); return; }
    const voter = G.session[G.voteStep];
    let w = voter.voteWeight || 1;
    if (G.doubleVote && voter.name === G.doubleVote) w *= 2;
    if (G.stealthVoter === voter.name) w *= 3;

    G.votes[voter.name] = { target: G.pick, weight: w };

    // Provocateur XP
    const target = G.session[G.pick];
    if (target?.chaosRole === 'provocateur') {
        const xp = (target.tier || 1) >= 2 ? 10 : 5;
        const orig = players.find(pl => pl.name === target.name);
        if (orig) { orig.score += xp; orig.rep = Math.min(100, (orig.rep || 50) + 2); }
        showPopup('😈 Провокатор +' + xp + ' XP!');
    }

    G.voteStep++;
    if (G.voteStep < G.session.length) showVotePass();
    else resolveVotes();
}

function resolveVotes() {
    const vc = {};
    G.session.forEach((_, i) => vc[i] = 0);

    Object.values(G.votes).forEach(v => vc[v.target] = (vc[v.target] || 0) + (v.weight || 1));
    // Add mini-vote influence
    Object.values(G.miniVotes).forEach(v => { if (vc[v.target] !== undefined) vc[v.target] += v.weight; });
    // Maniac: victim's vote doesn't count
    if (selectedMode === 'maniac' && G.maniacVictim) {
        const vi = G.session.findIndex(p => p.name === G.maniacVictim);
        if (vi >= 0 && G.votes[G.maniacVictim]) vc[G.votes[G.maniacVictim].target] -= (G.votes[G.maniacVictim].weight || 1);
    }
    G.voteCount = vc;
    const maxV = Math.max(...Object.values(vc));
    const tied = Object.keys(vc).filter(k => vc[k] === maxV).map(Number);

    if (tied.length > 1) {
        // Mayor breaks tie
        const mayor = G.session.find(p => p.chaosRole === 'mayor' && (p.tier || 1) >= 2);
        if (mayor) {
            document.getElementById('tie-names-text').textContent = 'Мэр ' + mayor.name + ' принимает решение!';
            showStage('tie');
            return;
        }
        G.tieList = tied;
        document.getElementById('tie-names-text').textContent = 'Ничья: ' + tied.map(i => G.session[i].name).join(', ');
        showStage('tie');
    } else {
        finishVoteAccuse(tied[0]);
    }
}

function mayorDecide() {
    const mayor = G.session.find(p => p.chaosRole === 'mayor');
    const pool = G.tieList.length ? G.tieList : G.session.map((_, i) => i);
    showPopup('👑 Мэр ' + (mayor?.name || '?') + ' решает!', 'gold');
    finishVoteAccuse(pool[Math.floor(Math.random() * pool.length)]);
}

// TIE REVOTE
let tieRevoting = false;
function startTieRevote() {
    tieRevoting = true;
    G.votes = {}; G.voteStep = 0; G.pick = null;
    showTieVotePass();
}
function showTieVotePass() {
    if (G.voteStep >= G.session.length) { resolveTieRevote(); return; }
    document.getElementById('vote-voter-name').textContent = G.session[G.voteStep].name;
    showStage('vote-pass');
    document.getElementById('btn-start-vote').onclick = startTiePlayerVote;
}
function startTiePlayerVote() {
    G.pick = null;
    const voter = G.session[G.voteStep];
    document.getElementById('vote-voter-label').textContent = voter.name + ' — переголосование:';
    const grid = document.getElementById('vote-grid');
    if (!grid) return;
    grid.innerHTML = G.tieList.map(i => {
        const p = G.session[i];
        if (p.name === voter.name) return `<div class="vote-item disabled" id="vi-${i}"><span>${p.avatar} ${p.name}</span><span class="vote-dot">—</span></div>`;
        return `<div class="vote-item" id="vi-${i}" onclick="pickVote(${i})"><span>${p.avatar} ${p.name}</span><span class="vote-dot" id="vd-${i}">○</span></div>`;
    }).join('');
    showStage('vote');
    document.getElementById('btn-confirm-vote').onclick = confirmTieVote;
}
function confirmTieVote() {
    if (G.pick === null) return;
    G.votes[G.session[G.voteStep].name] = { target: G.pick, weight: 1 };
    G.voteStep++;
    if (G.voteStep < G.session.length) showTieVotePass();
    else resolveTieRevote();
}
function resolveTieRevote() {
    const vc = {};
    G.tieList.forEach(i => vc[i] = 0);
    Object.values(G.votes).forEach(v => { if (vc[v.target] !== undefined) vc[v.target]++; });
    const maxV = Math.max(...Object.values(vc));
    const t2 = Object.keys(vc).filter(k => vc[k] === maxV).map(Number);
    const winner = t2[Math.floor(Math.random() * t2.length)];
    document.getElementById('btn-start-vote').onclick = startPlayerVote;
    document.getElementById('btn-confirm-vote').onclick = confirmVote;
    tieRevoting = false;
    finishVoteAccuse(winner);
}
function tieRandom() {
    const winner = G.tieList[Math.floor(Math.random() * G.tieList.length)];
    document.getElementById('btn-start-vote').onclick = startPlayerVote;
    document.getElementById('btn-confirm-vote').onclick = confirmVote;
    finishVoteAccuse(winner);
}

// VETO
function initVeto() {
    const vip = G.session.find(p => p.vip);
    if (!vip) return;
    G.vetoLeft = 3;
    document.getElementById('veto-badge').style.display = 'inline-block';
    document.getElementById('veto-count').textContent = '3';
}
function useVeto() {
    if (!(G.vetoLeft > 0) || G.pick === null) { showPopup('Нельзя!', 'danger'); return; }
    G.pick = null; G.vetoLeft--;
    document.getElementById('veto-count').textContent = G.vetoLeft;
    document.querySelectorAll('.vote-item').forEach(el => { el.classList.remove('selected'); const d = el.querySelector('.vote-dot'); if (d) d.textContent = '○'; });
    showPopup('⭐ Вето использовано!', 'gold');
}

/* ════════════════════════════════════════════════════
   §26  FINISH VOTE / SPECIAL MODES
════════════════════════════════════════════════════ */
function finishVoteAccuse(accusedIdx) {
    const accused = G.session[accusedIdx]; G._ai = accusedIdx;

    // Bodyguard
    const guard = G.session.find(p => p.chaosRole === 'bodyguard' && !p.isSpy && !G.bodyguardTarget[p.name]);
    if (guard && accused.name !== guard.name && !accused.isSpy) {
        G.bodyguardTarget[guard.name] = true;
        showDeathScreen(guard.name);
        showPopup('🛡 Телохранитель ' + guard.name + ' защитил ' + accused.name + '!', 'gold');
        G.eliminatedPlayers.push({ ...guard });
        accusedIdx = G.session.indexOf(guard); G._ai = accusedIdx;
    }

    // Agent 007 — if spy accused, show intercept window
    const a007 = G.session.find(p => p.chaosRole === 'agent007' && !p.isSpy);
    if (a007 && accused.isSpy) {
        show007Intercept(accusedIdx);
        return;
    }

    // Duel mode
    if (selectedMode === 'duel') {
        const spy = G.session.find(p => p.isSpy);
        if (spy && accused.name !== spy.name) {
            showDuel(accused, spy);
            return;
        }
    }

    if (accused.isSpy) {
        if (selectedMode === 'lastchance') { showLastChance(accused); return; }
        if (selectedMode === 'blitz') { showBlitz(accused); return; }
    }

    // Kamikaze
    if (accused.chaosRole === 'kamikaze' && (accused.tier || 1) >= 2) {
        const lastVoter = Object.entries(G.votes).reverse().find(([, v]) => v.target === accusedIdx);
        if (lastVoter) {
            const vic = G.session.find(p => p.name === lastVoter[0]);
            if (vic) {
                showPopup('💥 КАМИКАДЗЕ! ' + vic.name + ' тоже вылетает!', 'danger');
                showDeathScreen(vic.name);
                G.eliminatedPlayers.push({ ...vic });
            }
        }
    }

    // Doctor shield
    if (G.doctorShields.has(accused.name)) {
        G.doctorShields.delete(accused.name);
        showPopup('⚕️ Доктор спас ' + accused.name + '!', 'gold');
        showStage('discuss');
        return;
    }

    showDeathScreen(accused.name);
    setTimeout(() => showFinal(accusedIdx), 1200);
}

// Agent 007 intercept
let a007Timer = null;
function show007Intercept(accusedIdx) {
    const overlay = document.getElementById('agent007-overlay');
    if (!overlay) { showFinal(accusedIdx); return; }
    overlay.classList.remove('hidden');
    let countdown = 3;
    document.getElementById('agent007-countdown').textContent = countdown;
    const btn = document.getElementById('btn-007-intercept');
    if (btn) btn.onclick = () => {
        clearInterval(a007Timer);
        overlay.classList.add('hidden');
        showPopup('🔫 Агент 007 перехватил победу!', 'gold');
        G.xpMultiplier = 2;
        showFinal(accusedIdx, true);
    };
    a007Timer = setInterval(() => {
        countdown--;
        document.getElementById('agent007-countdown').textContent = countdown;
        if (countdown <= 0) {
            clearInterval(a007Timer);
            overlay.classList.add('hidden');
            showFinal(accusedIdx);
        }
    }, 1000);
}

// DUEL
function showDuel(p1, p2) {
    document.getElementById('duel-desc').textContent = p1.name + ' vs ' + p2.name + ' — задайте друг другу по одному вопросу!';
    const grid = document.getElementById('duel-grid');
    if (grid) grid.innerHTML = `
    <div class="vote-item" style="margin-bottom:8px"><span>❓ ${p1.name} спрашивает ${p2.name}</span></div>
    <div class="vote-item"><span>❓ ${p2.name} спрашивает ${p1.name}</span></div>`;
    G._duelP1 = p1; G._duelP2 = p2;
    showStage('duel');
}
function endDuel() {
    G.tieList = [G.session.indexOf(G._duelP1), G.session.indexOf(G._duelP2)];
    G.votes = {}; G.voteStep = 0; G.pick = null;
    document.getElementById('tie-names-text').textContent = 'Дуэль: ' + G._duelP1.name + ' vs ' + G._duelP2.name;
    showStage('tie');
}

// LAST CHANCE
function showLastChance(accused) {
    document.getElementById('lc-title').textContent = 'ПОСЛЕДНИЙ ШАНС';
    document.getElementById('lc-desc').textContent = accused.name + ', угадай слово — уйдёшь непобеждённым!';
    document.getElementById('lc-content').innerHTML = `<input class="su-input" id="lc-input" placeholder="Введите слово..." /><button class="btn-danger" onclick="checkLastChance()">НАЗВАТЬ</button>`;
    showStage('lc');
}
function checkLastChance() {
    const inp = document.getElementById('lc-input')?.value?.trim().toLowerCase();
    const word = G.session[0]?.word?.toLowerCase();
    if (inp === word) {
        showResultBanner('draw');
        buildResultsList(G._ai, false, true);
        showStage('results');
    } else {
        showFinal(G._ai);
    }
}

// BLITZ
let blitzInt = null;
function showBlitz(accused) {
    document.getElementById('lc-title').textContent = '⚡ ВИКТОРИНА';
    document.getElementById('lc-desc').textContent = accused.name + ' — 15 секунд!';
    const word = G.session[0].word;
    const cat = G.session[0].cat;
    const wrongs = shuffle((themes[cat] || Object.values(themes)[0]).filter(w => w !== word)).slice(0, 3);
    const opts = shuffle([word, ...wrongs]);
    let t = 15;
    document.getElementById('lc-content').innerHTML = `
    <div style="background:rgba(255,255,255,.06);border-radius:9px;padding:9px;margin-bottom:8px;font-size:11px;font-weight:700">Какое слово было загадано?</div>
    <div class="blitz-bar-wrap"><div class="blitz-bar" id="blitz-bar"></div></div>
    <div style="font-size:9px;color:var(--text2);margin-bottom:8px">Осталось: <span id="blitz-t" style="color:var(--neon3);font-weight:900">15</span> сек</div>
    ${opts.map(o => `<div class="quiz-option" id="qo-${CSS.escape(o)}" onclick="answerBlitz('${o.replace(/'/g, "\\'")}','${word.replace(/'/g, "\\'")}')">${o}</div>`).join('')}`;
    blitzInt = setInterval(() => {
        t--;
        const tEl = document.getElementById('blitz-t'); if (tEl) tEl.textContent = t;
        const bEl = document.getElementById('blitz-bar'); if (bEl) bEl.style.width = ((t / 15) * 100) + '%';
        if (t <= 0) { clearInterval(blitzInt); showFinal(G._ai); }
    }, 1000);
    showStage('lc');
}
function answerBlitz(chosen, correct) {
    clearInterval(blitzInt);
    const el = document.getElementById('qo-' + CSS.escape(chosen));
    const cel = document.getElementById('qo-' + CSS.escape(correct));
    if (el) el.classList.add(chosen === correct ? 'correct' : 'wrong');
    if (chosen !== correct && cel) cel.classList.add('correct');
    setTimeout(() => {
        if (chosen === correct) {
            const orig = players.find(p => p.name === G.session[G._ai].name);
            if (orig) { orig.blitzWins = (orig.blitzWins || 0) + 1; checkAchievements(orig); }
            showResultBanner('draw');
            buildResultsList(G._ai, false, true);
            showStage('results');
        } else {
            showFinal(G._ai);
        }
    }, 1400);
}

/* ════════════════════════════════════════════════════
   §27  FINAL ROUND
════════════════════════════════════════════════════ */
function showFinal(accusedIdx, agent007win = false) {
    try {
        showStage('results');
        const accused = G.session[accusedIdx];
        const spies = G.session.filter(p => p.isSpy || p.isTraitor || p.isSleeper);
        const accusedIsSpy = accused && (accused.isSpy || accused.isTraitor || accused.isSleeper);
        const mObj = GAME_MODES.find(m => m.id === selectedMode);
        const mult = G.xpMultiplier || 1;

        // Spy wins in first 60 sec → x2 XP
        const elapsed = (Date.now() - (G._roundStart || Date.now())) / 1000;
        const speedMult = (!accusedIsSpy && elapsed < 60) ? 2 : 1;
        const finalMult = mult * speedMult;

        G.session.forEach(p => {
            const orig = players.find(pl => pl.name === p.name); if (!orig) return;
            if (p.isSpy) orig.spyCount = (orig.spyCount || 0) + 1;
            if (accusedIsSpy) {
                if (!p.isSpy && !p.isTraitor && !p.isSleeper) {
                    let xp = Math.round(1 * finalMult); if (p.vip) xp++;
                    orig.score += xp; orig.wins = (orig.wins || 0) + 1; orig.spyStreak = 0;
                    orig.rep = Math.min(100, (orig.rep || 50) + 5);
                } else { orig.losses = (orig.losses || 0) + 1; orig.spyStreak = 0; orig.rep = Math.max(0, (orig.rep || 50) - 5); }
            } else {
                if (p.isSpy || p.isTraitor || p.isSleeper) {
                    let xp = Math.round(2 * finalMult); if (p.vip) xp++;
                    orig.score += xp; orig.wins = (orig.wins || 0) + 1; orig.spyStreak = (orig.spyStreak || 0) + 1;
                } else { orig.losses = (orig.losses || 0) + 1; }
            }
            orig.tier = getTier(orig.score);
            p.tier = orig.tier;
            checkAchievements(orig);
        });

        history.push({
            mode: mObj ? mObj.emoji + ' ' + mObj.name : '',
            cat: G.session[0]?.cat || '', word: G.session[0]?.word || '',
            spies: spies.map(s => s.name),
            winner: accusedIsSpy ? 'Мирные' : 'Шпионы',
            date: new Date().toLocaleDateString('ru'),
            xpMult: finalMult,
        });
        saveAll();

        // Glitch on spy reveal
        const gv = document.getElementById('screen-game');
        if (gv) { gv.classList.add('glitch-active'); setTimeout(() => gv.classList.remove('glitch-active'), 800); }

        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        playSfx('end');

        if (accusedIsSpy) showResultBanner('civil', accused.name + ' — ' + (G.voteCount[accusedIdx] || 0) + ' голос(а)');
        else showResultBanner('spy', 'Шпион: ' + spies.map(s => s.name).join(', '));
        buildResultsList(accusedIdx, accusedIsSpy, false, finalMult);
        logConsole('Раунд завершён. Победа: ' + (accusedIsSpy ? 'Мирные' : 'Шпионы'), 'info');
    } catch (e) { SU_DEBUG.error('showFinal: ' + e); }
}

function showResultBanner(type, sub = '') {
    const banner = document.getElementById('result-banner');
    if (!banner) return;
    const configs = {
        civil: { cls: 'rb-civil', title: '🎉 ШПИОН ПОЙМАН!', clr: 'var(--neon)' },
        spy: { cls: 'rb-spy', title: '🕵 ШПИОН УСКОЛЬЗНУЛ!', clr: 'var(--neon3)' },
        draw: { cls: 'rb-draw', title: '🤝 НИЧЬЯ!', clr: 'var(--gold)' },
    };
    const c = configs[type] || configs.civil;
    banner.innerHTML = `<div class="result-banner ${c.cls}">
    <div class="rb-title" style="color:${c.clr}">${c.title}</div>
    <p style="opacity:.7;margin:4px 0 0;font-size:11px">${sub}</p>
  </div>`;
}

function buildResultsList(accusedIdx, accusedIsSpy, draw, xpMult = 1) {
    const vc = G.voteCount || {};
    const anon = document.getElementById('sh-anon-vote')?.checked;
    const sorted = G.session.map((p, i) => ({ p, i, v: vc[i] || 0 })).sort((a, b) => b.v - a.v);

    const el = document.getElementById('result-list');
    if (!el) return;

    el.innerHTML = `<div style="font-size:9px;color:var(--neon);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:900">ИТОГИ ГОЛОСОВАНИЯ</div>` +
        sorted.map(({ p, i, v }) => {
            const isAcc = i === accusedIdx;
            const cls = p.isSpy || p.isTraitor || p.isSleeper ? 'ri-spy' : 'ri-civil';
            const role = p.isSpy ? (p.isDouble ? '🎭 Двойной агент' : '🕵 Шпион') : p.isDetective ? '🔎 Детектив' : p.isTraitor ? '🗡 Предатель' : p.isSilencer ? '🤫 Молчун' : p.isSleeper ? '🌙 Завербован' : '✅ ' + p.word;
            const crStr = p.chaosRole ? ' ' + (CHAOS_ROLES.find(r => r.id === p.chaosRole)?.emoji || '') : '';
            const xp = !draw ? ((accusedIsSpy && !p.isSpy && !p.isTraitor && !p.isSleeper) ? '+' + Math.round(xpMult) + 'XP' : ((!accusedIsSpy && (p.isSpy || p.isTraitor || p.isSleeper)) ? '+' + Math.round(2 * xpMult) + 'XP' : '')) : '';
            const orig = players.find(pl => pl.name === p.name);
            const lv = orig ? getLevel(orig.score) : LEVELS[0];
            const barW = G.session.length > 0 ? Math.round((v / G.session.length) * 100) : 0;
            return `<div class="result-item ${cls}" style="${isAcc ? 'border-width:2px' : ''}">
      <div style="display:flex;align-items:center;gap:6px;flex:1">
        <div style="width:26px;height:26px;border-radius:50%;background:${p.color};display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
          ${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover">` : `<span style="font-size:12px">${p.avatar}</span>`}
        </div>
        <div style="flex:1">
          <div style="font-weight:800;font-size:11px">${isAcc ? '👉 ' : ''}${p.name}${p.vip ? ' ⭐' : ''}${crStr}</div>
          <div style="font-size:9px;opacity:.5">${role}</div>
          <div style="font-size:8px;opacity:.4">${lv.emoji} ${lv.name} T${lv.tier}</div>
          <div style="height:2px;background:var(--neon3);border-radius:2px;width:${barW}%;margin-top:2px;opacity:${v > 0 ? .7 : 0}"></div>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;margin-left:6px">
        <div style="font-size:18px;font-weight:900;color:${v > 0 ? 'var(--neon3)' : 'rgba(255,255,255,.15)'}">${v}</div>
        ${xp ? `<div style="background:var(--neon);color:#000;padding:1px 5px;border-radius:4px;font-size:8px;font-weight:900;margin-top:2px">${xp}</div>` : ''}
      </div>
    </div>`;
        }).join('') + (!anon ? `
    <div style="font-size:9px;color:var(--neon);text-transform:uppercase;letter-spacing:1px;margin:8px 0 5px;font-weight:900">КТО ЗА КОГО</div>
    ${G.session.map(voter => {
            const vi = G.votes[voter.name];
            const vp = vi ? G.session[vi.target] : null;
            return `<div style="display:flex;justify-content:space-between;font-size:9px;padding:4px 8px;border-radius:7px;background:rgba(255,255,255,.03);margin-bottom:2px">
        <span style="opacity:.6">${voter.avatar} ${voter.name}</span>
        <span>→ <b>${vp ? vp.avatar + ' ' + vp.name : '?'}</b>${vi?.weight > 1 ? ' (×' + vi.weight.toFixed(1) + ')' : ''}</span>
      </div>`;
        }).join('')}` : '');
}

function rematch() { if (G.lastConfig) startGame(); else location.reload(); }

/* ════════════════════════════════════════════════════
   §28  DEATH SCREEN
════════════════════════════════════════════════════ */
function showDeathScreen(name) {
    const ds = document.getElementById('death-screen');
    const dn = document.getElementById('death-player-name');
    if (!ds || !dn) return;
    dn.textContent = name;
    ds.classList.remove('hidden');
    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
    setTimeout(() => ds.classList.add('hidden'), 2500);
}

/* ════════════════════════════════════════════════════
   §29  HALLUCINATION SYSTEM
════════════════════════════════════════════════════ */
function triggerHallucination(moment) {
    if (!G._hallEnabled) return;
    if (G._hallMoment !== moment) return;
    const p = G.session[G.cur];
    if (p?.vip || (p?.chaosRole === 'ninja' && (p?.tier || 1) >= 2)) return;
    const L = document.getElementById('hallucination-layer');
    if (!L) return;
    L.textContent = G._hallText || 'ТЫ ШПИОН!';
    L.style.color = G._hallColor || '#ff003c';
    L.style.fontSize = (G._hallSize || 40) + 'px';
    L.style.left = (G._hallPx || 30) + '%';
    L.style.top = (G._hallPy || 40) + '%';
    L.style.display = 'block';
    setTimeout(() => { if (L) L.style.display = 'none'; }, (G._hallTime || 1.8) * 1000);
}

/* ════════════════════════════════════════════════════
   §30  SHADOW ADMIN FUNCTIONS
════════════════════════════════════════════════════ */
function shadowSwapWord() {
    const w = document.getElementById('sh-word-input')?.value?.trim();
    if (!w) return;
    G.session.forEach(p => p.word = w);
    showPopup('🔄 Слово изменено: ' + w, 'sys');
    document.getElementById('sh-word-input').value = '';
}
function shadowFakeClue() {
    const pn = document.getElementById('sh-fclue-player')?.value;
    const txt = document.getElementById('sh-fclue-text')?.value?.trim();
    if (!pn || !txt) return;
    showPopup('💬 [' + pn + ']: ' + txt, 'sys');
}
function shadowHallOne() {
    G._hallEnabled = true;
    G._hallText = document.getElementById('sh-hall-text')?.value || 'ТЫ ШПИОН!';
    G._hallColor = '#ff003c'; G._hallSize = 40; G._hallPx = 30; G._hallPy = 40;
    G._hallTime = 2; G._hallMoment = 'vote';
    const L = document.getElementById('hallucination-layer');
    if (L) { L.textContent = G._hallText; L.style.color = G._hallColor; L.style.fontSize = '40px'; L.style.left = '30%'; L.style.top = '40%'; L.style.display = 'block'; setTimeout(() => L.style.display = 'none', 2000); }
}
function shadowChangeRole() {
    const pn = document.getElementById('sh-role-player')?.value;
    const role = document.getElementById('sh-role-type')?.value;
    const p = G.session.find(pl => pl.name === pn);
    if (!p) { showPopup('Нет активной игры!', 'danger'); return; }
    p.isSpy = role === 'spy'; p.isTraitor = role === 'traitor'; p.isDetective = role === 'detective'; p.isDouble = false;
    showPopup('✅ ' + pn + ' → ' + role, 'sys');
    logConsole('Роль изменена: ' + pn + ' → ' + role, 'warn');
}
function shadowFreezeTimer() {
    G.timerFreeze = document.getElementById('sh-freeze-timer')?.checked || false;
    if (G.timerFreeze) clearInterval(tInt);
    showPopup(G.timerFreeze ? '⏸ Таймер заморожен' : '▶ Таймер разморожен', 'sys');
}
function shadowEditXP() {
    const pn = document.getElementById('sh-xp-player')?.value;
    const amt = parseInt(document.getElementById('sh-xp-amount')?.value);
    if (!pn || isNaN(amt)) return;
    const orig = players.find(p => p.name === pn);
    if (!orig) return;
    orig.score = Math.max(0, orig.score + amt);
    orig.tier = getTier(orig.score);
    saveAll(); showPopup('💰 ' + pn + ': ' + (amt >= 0 ? '+' : '') + amt + ' XP', 'sys');
    localStorage.setItem('su_admin_cmd', JSON.stringify({ type: 'injectXP', player: pn, amount: amt, ts: Date.now() }));
}
function shadowChaosNow() {
    if (!G.session.length) { showPopup('Нет активной игры!', 'danger'); return; }
    G.session.forEach(p => p.isSpy = false);
    shuffle(G.session).slice(0, Math.max(1, Math.ceil(G.session.length / 3))).forEach(p => p.isSpy = true);
    showPopup('💥 ХАОС! Роли переназначены', 'danger');
    logConsole('Хаос — роли переназначены', 'warn');
}
function shadowSysMsg() {
    const msg = document.getElementById('sh-sysmsg')?.value?.trim();
    if (!msg) return;
    showPopup('📡 СИСТЕМА: ' + msg, 'sys');
    document.getElementById('sh-sysmsg').value = '';
}
function shadowViewRoles() {
    const el = document.getElementById('sh-roles-view');
    if (!el) return;
    el.innerHTML = G.session.map(p =>
        `<div style="font-size:9px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      ${p.avatar} ${p.name}: <b style="color:${p.isSpy ? 'var(--neon3)' : 'var(--neon)'}">${p.isSpy ? 'ШПИОН' : 'Мирный'}${p.isTraitor ? ' (Пред)' : ''}${p.isSleeper ? ' (Завер)' : ''}${p.chaosRole ? ' ' + (CHAOS_ROLES.find(r => r.id === p.chaosRole)?.emoji || '') : ''}</b></div>`
    ).join('') || '<p style="font-size:9px;opacity:.4">Нет активной игры</p>';
}
function shadowSwapSpy() {
    const fn = document.getElementById('sh-swap-from')?.value;
    const tn = document.getElementById('sh-swap-to')?.value;
    if (!fn || !tn || fn === tn) return;
    const f = G.session.find(p => p.name === fn), t = G.session.find(p => p.name === tn);
    if (!f || !t) { showPopup('Нет активной игры!', 'danger'); return; }
    f.isSpy = false; t.isSpy = true;
    showPopup('♻️ ' + fn + ' → ' + tn, 'sys');
}
function shadowApplySleeper() {
    const pn = document.getElementById('sh-sleeper-player')?.value;
    const p = G.session.find(pl => pl.name === pn);
    if (!p) { showPopup('Нет игры!', 'danger'); return; }
    p.isSleeper = true; p.isSpy = true;
    G.sleeperAgents.push(pn);
    showPopup('🌙 ' + pn + ' завербован!', 'sys');
}
function shadowApplyVip(grant) {
    const n = document.getElementById('sh-vip-player')?.value;
    players.forEach(p => { if (p.name === n) p.vip = grant; });
    saveAll();
    showPopup(grant ? '⭐ VIP: ' + n : '✕ VIP снят: ' + n, 'sys');
    populateShadowSelects();
}

function populateShadowSelects() {
    const opt = players.map(p => `<option value="${escHtml(p.name)}">${p.avatar} ${escHtml(p.name)} (${p.score}XP)${p.vip ? ' ⭐' : ''}</option>`).join('');
    const none = '<option value="">— Никого —</option>';
    ['sh-spy', 'sh-vip-player', 'sh-xp-player', 'sh-sleeper-player'].forEach(id => {
        const el = document.getElementById(id); if (el) el.innerHTML = (id === 'sh-spy' ? '<option value="none">— Случайный —</option>' : none) + opt;
    });
    ['sh-fclue-player', 'sh-hall-player', 'sh-role-player', 'sh-swap-from', 'sh-swap-to', 'sh-block-vote', 'sh-double-vote', 'sh-immune'].forEach(id => {
        const el = document.getElementById(id); if (el) el.innerHTML = none + opt;
    });
}

/* ════════════════════════════════════════════════════
   §31  ZERO PANEL (ROOT)
════════════════════════════════════════════════════ */
function openZeroPanel() {
    showScreen('zero');
    populateZeroSelects();
    zeroLog('> Система авторизована. Терминал открыт.');
}
function zeroLog(msg) {
    const el = document.getElementById('zero-log'); if (el) el.textContent = msg;
}
function populateZeroSelects() {
    const opt = players.map(p => `<option value="${escHtml(p.name)}">${escHtml(p.name)}</option>`).join('');
    ['zero-lm-player', 'zero-art-player', 'zero-kill-player'].forEach(id => {
        const el = document.getElementById(id); if (el) el.innerHTML = opt;
    });
}
function zeroSpyVision() {
    G.spyVisionActive = true;
    showPopup('👁 Spy-Vision: шпионы помечены!', 'sys');
    zeroLog('> [SPY-VISION] Активирован. Шпион помечен.');
    logConsole('Root: Spy-Vision активирован', 'warn');
}
function zeroStealthVote() {
    G.stealthVoter = players[0]?.name || '';
    showPopup('🗳 Stealth Vote ×3 активирован!', 'sys');
    zeroLog('> [STEALTH] Голос × 3 для: ' + G.stealthVoter);
}
function zeroEmergencyClean() {
    if (!confirm('Emergency Clean — удалить данные сессии?')) return;
    ['su_session', 'su_game_state'].forEach(k => sessionStorage.removeItem(k));
    G = makeEmptyGameState();
    showPopup('🧹 Emergency Clean выполнен!', 'sys');
    zeroLog('> [CLEAN] Данные сессии удалены.');
    showScreen('menu');
}
function zeroMasterReset() {
    if (!confirm('Master Reset — сбросить ВСЕ темы к заводским?')) return;
    themes = makeDefaultThemes();
    saveAll();
    renderThemeChips(); renderThemeEdits();
    showPopup('🔄 Master Reset выполнен!', 'sys');
    zeroLog('> [RESET] Темы сброшены к заводским.');
}
function zeroLevelMasterToggle() {
    const el = document.getElementById('zero-level-panel');
    if (el) el.classList.toggle('hidden');
}
function zeroApplyLevel() {
    const pn = document.getElementById('zero-lm-player')?.value;
    const tier = parseInt(document.getElementById('zero-lm-tier')?.value);
    const orig = players.find(p => p.name === pn);
    if (!orig) return;
    const xpForTier = [0, 0, 35, 150];
    orig.score = Math.max(orig.score, xpForTier[tier] || 0);
    orig.tier = tier;
    const sp = G.session.find(p => p.name === pn);
    if (sp) sp.tier = tier;
    saveAll();
    updateAbilityButtonsIfNeeded();
    showPopup('📈 ' + pn + ' → Tier ' + tier, 'sys');
    zeroLog('> [LM] ' + pn + ' → Tier ' + tier);
    localStorage.setItem('su_admin_cmd', JSON.stringify({ type: 'setTier', player: pn, tier, ts: Date.now() }));
}
function zeroInjectArtifactToggle() {
    const el = document.getElementById('zero-artifact-panel');
    if (el) el.classList.toggle('hidden');
}
function zeroApplyArtifact() {
    const pn = document.getElementById('zero-art-player')?.value;
    const type = document.getElementById('zero-art-type')?.value;
    handleExternalAdminCmd({ type, player: pn, amount: 50 });
    showPopup('💉 Артефакт «' + type + '» → ' + pn, 'sys');
    zeroLog('> [ART] ' + type + ' → ' + pn);
    localStorage.setItem('su_admin_cmd', JSON.stringify({ type, player: pn, amount: 50, ts: Date.now() }));
}
function zeroKillToggle() {
    const el = document.getElementById('zero-kill-panel');
    if (el) el.classList.toggle('hidden');
}
function zeroApplyKill() {
    const pn = document.getElementById('zero-kill-player')?.value;
    const p = G.session.find(pl => pl.name === pn);
    if (!p) { showPopup('Нет в сессии!', 'danger'); return; }
    G.eliminatedPlayers.push({ ...p });
    G.session = G.session.filter(s => s.name !== pn);
    showDeathScreen(pn);
    showPopup('💀 ' + pn + ' устранён!', 'sys');
    zeroLog('> [KILL] ' + pn + ' устранён из раунда.');
}

/* ════════════════════════════════════════════════════
   §32  OPEN ADMIN BAR
════════════════════════════════════════════════════ */
function oadmAnnounce() {
    const msg = document.getElementById('oadm-msg-input')?.value || document.getElementById('adm-announce-input')?.value || '';
    if (msg) showPopup('📢 ' + msg);
}
function oadmAddTime() { tSec += 60; tTotal += 60; updateTimerDisplay(); showPopup('+1 минута!'); }
function oadmHint() { if (G.session.length) showPopup('💡 «' + G.session[0].word[0] + '» · ' + G.session[0].word.length + ' букв'); }
function oadmShowTop() {
    const top = [...players].sort((a, b) => b.score - a.score).slice(0, 3);
    showPopup('🏆 ' + top.map((p, i) => ['🥇', '🥈', '🥉'][i] + p.name + '(' + p.score + ')').join(' '));
}

/* ════════════════════════════════════════════════════
   §33  TOOLTIP SYSTEM
════════════════════════════════════════════════════ */
let tooltipEl = null, tooltipTimer = null;
function setupTooltips() {
    document.addEventListener('touchstart', (e) => {
        const btn = e.target.closest('[data-tooltip]');
        if (!btn) return;
        clearTimeout(tooltipTimer);
        tooltipTimer = setTimeout(() => {
            if (tooltipEl) tooltipEl.remove();
            tooltipEl = document.createElement('div');
            tooltipEl.className = 'tooltip-hint';
            tooltipEl.textContent = btn.dataset.tooltip;
            const rect = btn.getBoundingClientRect();
            tooltipEl.style.top = (rect.top - 40) + 'px';
            tooltipEl.style.left = Math.max(10, rect.left) + 'px';
            document.body.appendChild(tooltipEl);
        }, 500);
    }, { passive: true });
    document.addEventListener('touchend', () => {
        clearTimeout(tooltipTimer);
        setTimeout(() => { if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; } }, 1000);
    }, { passive: true });
}

/* ════════════════════════════════════════════════════
   §34  ANTI-AFK
════════════════════════════════════════════════════ */
let afkTimer = null;
function resetAFK() {
    clearTimeout(afkTimer);
    const ol = document.getElementById('afk-overlay');
    if (ol) ol.classList.add('hidden');
    afkTimer = setTimeout(() => {
        if (currentScreen === 'game') {
            const ol2 = document.getElementById('afk-overlay');
            if (ol2) ol2.classList.remove('hidden');
        }
    }, 40000);
}
function setupAntiAFK() {
    ['touchstart', 'click', 'keydown'].forEach(ev =>
        document.addEventListener(ev, resetAFK, { passive: true })
    );
    resetAFK();
    const ol = document.getElementById('afk-overlay');
    if (ol) ol.addEventListener('click', resetAFK);
}

/* ════════════════════════════════════════════════════
   §35  PANIC BUTTON
════════════════════════════════════════════════════ */
let escPressCount = 0, escTimer = null;
function setupPanicButton() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            escPressCount++;
            clearTimeout(escTimer);
            if (escPressCount >= 2) {
                escPressCount = 0;
                if (currentScreen === 'game') showScreen('panic');
                else if (currentScreen === 'panic') showScreen('game');
            }
            escTimer = setTimeout(() => escPressCount = 0, 1000);
        }
    });
}

/* ════════════════════════════════════════════════════
   §36  BATTERY WARNING
════════════════════════════════════════════════════ */
function setupBatteryMonitor() {
    if (!navigator.getBattery) return;
    navigator.getBattery().then(bat => {
        const check = () => {
            if (bat.level < 0.15) {
                document.body.classList.add('battery-save');
                showPopup('🔋 Батарея < 15%. Тяжёлые эффекты отключены.', 'danger');
            } else {
                document.body.classList.remove('battery-save');
            }
        };
        check();
        bat.addEventListener('levelchange', check);
    }).catch(() => { });
}

/* ════════════════════════════════════════════════════
   §37  EXPORT / IMPORT
════════════════════════════════════════════════════ */
function exportData() {
    const plNoPhoto = players.map(({ photo, ...rest }) => rest);
    const data = JSON.stringify({ players: plNoPhoto, themes, history: history.slice(-20), settings, clans });
    const box = document.getElementById('import-box');
    if (box) box.value = data;
    if (navigator.clipboard) navigator.clipboard.writeText(data).then(() => showPopup('📋 Скопировано (~' + Math.round(data.length / 1024) + 'кб)'));
}
function importData() {
    try {
        const d = JSON.parse(document.getElementById('import-box')?.value?.trim() || '');
        if (d.players) { players = d.players; players.forEach(normalizePlayer); }
        if (d.themes) themes = d.themes;
        if (d.history) history = d.history;
        if (d.settings) { settings = d.settings; applySettings(); }
        if (d.clans) clans = d.clans;
        saveAll(); renderAll(); showPopup('✅ Импорт успешен!');
    } catch (e) { showPopup('❌ Ошибка: ' + e.message, 'danger'); }
}
function exportPhotos() {
    const ph = JSON.parse(localStorage.getItem('su_photos') || '{}');
    const box = document.getElementById('photo-import-box');
    if (box) box.value = JSON.stringify(ph);
    if (navigator.clipboard) navigator.clipboard.writeText(JSON.stringify(ph)).then(() => showPopup('📸 Фото скопированы'));
}
function importPhotos() {
    try {
        const ph = JSON.parse(document.getElementById('photo-import-box')?.value?.trim() || '{}');
        localStorage.setItem('su_photos', JSON.stringify(ph));
        Object.entries(ph).forEach(([name, photo]) => { const p = players.find(pl => pl.name === name); if (p) p.photo = photo; });
        showPopup('✅ Фото импортированы!'); renderAgents();
    } catch (e) { showPopup('❌ Ошибка фото', 'danger'); }
}

/* ════════════════════════════════════════════════════
   §38  QUESTION DISPLAY
════════════════════════════════════════════════════ */
function showQuestion() {
    const cat = G.session[0]?.cat;
    const pool = (cat && THEME_Q[cat]) ? THEME_Q[cat] : QUESTIONS;
    const q = pool[Math.floor(Math.random() * pool.length)];
    const el = document.getElementById('question-box');
    if (!el) return;
    el.classList.remove('hidden');
    el.textContent = '❓ ' + q;
}

/* ════════════════════════════════════════════════════
   §39  UTIL
════════════════════════════════════════════════════ */
function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ════════════════════════════════════════════════════
   §40  PLUGIN LOADER (Async, Isolated)
════════════════════════════════════════════════════ */
const PluginRegistry = [];

async function loadPlugin(pluginCode) {
    try {
        const blob = new Blob([`(async()=>{${pluginCode}})()`], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const mod = await import(url);
        URL.revokeObjectURL(url);
        if (mod && mod.default && typeof mod.default === 'object') {
            PluginRegistry.push(mod.default);
            SU_DEBUG.log('Plugin loaded: ' + (mod.default.name || 'unnamed'));
        }
    } catch (e) {
        SU_DEBUG.error('Plugin load error: ' + e);
    }
}

async function runPlugins(hook, ...args) {
    for (const plugin of PluginRegistry) {
        if (plugin.enabled && plugin.hook === hook && typeof plugin.fn === 'function') {
            try {
                await Promise.resolve(plugin.fn(...args, { game: G, players, showPopup, logConsole }));
            } catch (e) {
                SU_DEBUG.error('Plugin «' + plugin.name + '» error: ' + e);
            }
        }
    }
}

/* ════════════════════════════════════════════════════
   §41  KONAMI CODE
════════════════════════════════════════════════════ */
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIdx = 0;
document.addEventListener('keydown', e => {
    if (e.key === KONAMI[konamiIdx]) {
        konamiIdx++;
        if (konamiIdx === KONAMI.length) {
            konamiIdx = 0;
            setTheme('default');
            document.body.classList.add('glitch-active');
            setTimeout(() => document.body.classList.remove('glitch-active'), 2000);
            showPopup('🎮 KONAMI CODE! Система разблокирована.', 'gold');
        }
    } else { konamiIdx = 0; }
});

/* ════════════════════════════════════════════════════
   §42  EVENT BINDINGS
════════════════════════════════════════════════════ */
function bindEl(id, event, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
    else SU_DEBUG.warn('bindEl: #' + id + ' not found');
}

function bindAllEvents() {
    // TABS
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => showTab(btn.dataset.tab));
    });

    // Play
    bindEl('btn-start', 'click', () => { try { startGame(); } catch (e) { SU_DEBUG.error(e); emergencyRecovery(); } });
    bindEl('btn-add-agent', 'click', addAgent);
    bindEl('btn-reset-xp', 'click', resetAllXP);
    bindEl('btn-add-clan', 'click', addClan);
    bindEl('btn-save-theme', 'click', saveNewTheme);
    bindEl('btn-export', 'click', exportData);
    bindEl('btn-import', 'click', importData);
    bindEl('btn-export-themes', 'click', exportThemes);
    bindEl('btn-import-themes', 'click', importThemes);
    bindEl('btn-export-photos', 'click', exportPhotos);
    bindEl('btn-import-photos', 'click', importPhotos);

    // Game stages
    bindEl('btn-open-role', 'click', viewRole);
    bindEl('btn-next-player', 'click', nextPlayer);
    bindEl('btn-timer-toggle', 'click', toggleTimer);
    bindEl('btn-timer-reset', 'click', resetTimer);
    bindEl('btn-new-question', 'click', showQuestion);
    bindEl('btn-trigger-anomaly', 'click', triggerRandomAnomaly);
    bindEl('btn-go-vote', 'click', goVote);
    bindEl('btn-mv-confirm', 'click', confirmMiniVote);
    bindEl('btn-mv-skip', 'click', skipMiniVote);
    bindEl('btn-start-vote', 'click', startPlayerVote);
    bindEl('btn-confirm-vote', 'click', confirmVote);
    bindEl('btn-revote', 'click', startTieRevote);
    bindEl('btn-mayor-decide', 'click', mayorDecide);
    bindEl('btn-tie-random', 'click', tieRandom);
    bindEl('btn-end-duel', 'click', endDuel);
    bindEl('btn-to-menu', 'click', () => {
        showScreen('menu');
        showTab('tab-game');
        const bar = document.getElementById('open-admin-bar');
        if (bar) bar.style.display = 'none';
        stopHeartbeat();
        clearInterval(tInt);
        clearInterval(psychTimer);
        G = makeEmptyGameState();
        renderAll();
    });
    bindEl('btn-rematch', 'click', rematch);

    // Timer 5-tap
    const timerWrap = document.getElementById('timer-wrap');
    if (timerWrap) timerWrap.addEventListener('click', handleTimerTap);

    // Open admin bar toggle
    const oadmHandle = document.getElementById('open-admin-handle');
    if (oadmHandle) oadmHandle.addEventListener('click', () => {
        const body = document.getElementById('open-admin-body');
        const arrow = document.getElementById('open-admin-arrow');
        if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
        if (arrow) arrow.textContent = body?.style.display === 'block' ? '▼' : '▲';
    });

    // Open admin bar actions
    bindEl('oadm-timer', 'click', toggleTimer);
    bindEl('oadm-addtime', 'click', oadmAddTime);
    bindEl('oadm-announce', 'click', oadmAnnounce);
    bindEl('oadm-hint', 'click', oadmHint);
    bindEl('oadm-top', 'click', oadmShowTop);
    bindEl('oadm-anomaly', 'click', triggerRandomAnomaly);

    // Admin panel
    bindEl('adm-timer-toggle', 'click', toggleTimer);
    bindEl('adm-addtime', 'click', oadmAddTime);
    bindEl('adm-announce-send', 'click', oadmAnnounce);
    bindEl('adm-hint-btn', 'click', oadmHint);
    bindEl('adm-top-btn', 'click', oadmShowTop);
    bindEl('adm-random-event', 'click', triggerRandomAnomaly);
    bindEl('adm-civil-win', 'click', () => { showResultBanner('civil', 'Мирные объявлены победителями'); buildResultsList(-1, true, false); showStage('results'); });
    bindEl('adm-spy-win', 'click', () => { showResultBanner('spy', 'Шпионы объявлены победителями'); buildResultsList(-1, false, false); showStage('results'); });
    bindEl('adm-close', 'click', () => (typeof closeAdminPanel === 'function' ? closeAdminPanel() : showScreen('menu')));

    // Shadow panel
    bindEl('sh-swap-word', 'click', shadowSwapWord);
    bindEl('sh-send-fclue', 'click', shadowFakeClue);
    bindEl('sh-send-hall', 'click', shadowHallOne);
    bindEl('sh-apply-role', 'click', shadowChangeRole);
    bindEl('sh-freeze-timer', 'change', shadowFreezeTimer);
    bindEl('sh-apply-xp', 'click', shadowEditXP);
    bindEl('sh-chaos-now', 'click', shadowChaosNow);
    bindEl('sh-send-sysmsg', 'click', shadowSysMsg);
    bindEl('sh-view-roles', 'click', shadowViewRoles);
    bindEl('sh-apply-swap', 'click', shadowSwapSpy);
    bindEl('sh-trigger-anomaly', 'click', () => { const id = document.getElementById('sh-anomaly-type')?.value; if (id) applyAnomaly(id); });
    bindEl('sh-apply-sleeper', 'click', shadowApplySleeper);
    bindEl('sh-give-vip', 'click', () => shadowApplyVip(true));
    bindEl('sh-revoke-vip', 'click', () => shadowApplyVip(false));
    bindEl('sh-chaos-mode', 'change', () => { const v = document.getElementById('sh-chaos-mode')?.value; const wrap = document.getElementById('sh-custom-chance-wrap'); if (wrap) wrap.style.display = v === 'custom' ? 'block' : 'none'; });
    const shChance = document.getElementById('sh-custom-chance');
    if (shChance) shChance.addEventListener('input', () => { const el = document.getElementById('sh-chance-val'); if (el) el.textContent = shChance.value; });
    bindEl('shadow-close', 'click', () => (typeof closeAdminPanel === 'function' ? closeAdminPanel() : showScreen('menu')));

    // Zero panel
    bindEl('zero-spy-vision', 'click', zeroSpyVision);
    bindEl('zero-stealth-vote', 'click', zeroStealthVote);
    bindEl('zero-emergency-clean', 'click', zeroEmergencyClean);
    bindEl('zero-master-reset', 'click', zeroMasterReset);
    bindEl('zero-level-master-btn', 'click', zeroLevelMasterToggle);
    bindEl('zero-apply-level', 'click', zeroApplyLevel);
    bindEl('zero-inject-artifact-btn', 'click', zeroInjectArtifactToggle);
    bindEl('zero-apply-artifact', 'click', zeroApplyArtifact);
    bindEl('zero-log-console-btn', 'click', () => {
        if (typeof closeAdminPanel === 'function') closeAdminPanel();
        else showScreen('menu');
        showLogConsole();
    });
    bindEl('zero-kill-player-btn', 'click', zeroKillToggle);
    bindEl('zero-apply-kill', 'click', zeroApplyKill);
    bindEl('zero-close', 'click', () => (typeof closeAdminPanel === 'function' ? closeAdminPanel() : showScreen('menu')));
    bindEl('log-close', 'click', () => { const el = document.getElementById('log-console'); if (el) el.classList.add('hidden'); });

    // Secret triggers (hold 2 sec)
    setupSecretTrigger('trig-admin', 'admin');
    setupSecretTrigger('trig-shadow', 'shadow');
    setupSecretTrigger('trig-root', 'root');

    // Tooltips
    setupTooltips();
}

function setupSecretTrigger(id, panel) {
    const el = document.getElementById(id);
    if (!el) return;
    let timer = null;
    const start = () => {
        timer = setTimeout(() => {
            if (typeof openAdminPanel === 'function') openAdminPanel(panel);
            else if (panel === 'admin') showScreen('admin');
            else if (panel === 'shadow') { showScreen('shadow'); populateShadowSelects(); }
            else if (panel === 'root') { openZeroPanel(); }
        }, 2000);
    };
    const stop = () => clearTimeout(timer);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', stop);
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', stop, { passive: true });
}

/* ════════════════════════════════════════════════════
   §43  INIT
════════════════════════════════════════════════════ */
function bootApp() {
    if (typeof initSuMeta === 'function') initSuMeta();
    safeInit();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootApp);
} else {
    bootApp();
}