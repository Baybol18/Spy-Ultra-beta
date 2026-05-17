/**
 * SPY ULTRA — Шаблоны промптов для ИИ
 */
'use strict';

const PROMPT_CATEGORIES = [
    {
        id: 'plugins',
        title: 'Для плагинов',
        emoji: '🔌',
        prompts: [
            { title: 'Приветствие при открытии роли', text: 'Напиши плагин Spy Ultra с хуком onRoleReveal: при открытии роли игроком показывай showMsg с текстом «Добро пожаловать, агент» и именем игрока. Используй ctx.player и ctx.game.session.' },
            { title: 'Лог голосования', text: 'Создай плагин onVote: в logConsole записывай «Игрок X проголосовал против Y» и показывай showPopup с итогом веса голоса. Доступ: ctx.game, ctx.players.' },
            { title: 'Бонус XP в конце раунда', text: 'Плагин onRoundEnd: если мирные победили, всем активным игрокам +5 XP (найди в players по имени из session), showPopup «Бонус мирных +5 XP».' },
            { title: 'Таймер обсуждения', text: 'onDiscuss: если фаза обсуждения, покажи showMsg «Началось обсуждение — следите за шпионом». Не блокируй игру, только уведомление.' },
            { title: 'Передача телефона', text: 'onPass: при передаче телефона следующему игроку показывай showMsg «Передай устройство: » + ctx.player.name. Один раз за раунд на игрока (флаг в session).' },
            { title: 'VIP-приветствие', text: 'onRoleReveal: if(ctx.player.vip) showPopup(ctx.player.name + « — VIP-агент на связи», «gold»); иначе ничего.' },
            { title: 'Случайная аномалия', text: 'onDiscuss: с вероятностью 10% вызови showPopup «Случайная аномалия!» и добавь запись в logConsole. Используй Math.random().' },
            { title: 'Экспорт статистики', text: 'onRoundEnd: собери wins/losses всех players, сформируй строку и showPopup. Код только в fn, hook onRoundEnd, name: «Статистика раунда».' },
        ],
    },
    {
        id: 'constructor',
        title: 'Для конструктора',
        emoji: '🔧',
        prompts: [
            { title: 'Неоновая тема «Токсичный лес»', text: 'Сгенерируй CSS-переменные для Spy Ultra: --bg #020a02, --neon #39ff14, --neon2 #7fff00, --text #b8ffb8, --border rgba(57,255,20,0.3). Дай также gradient для body.' },
            { title: 'Кастомный шрифт', text: 'Подбери Google Fonts URL для киберпанк-интерфейса (моноширинный + заголовки). Укажи font-family для --font-main и --font-display.' },
            { title: 'Титул «Ночной охотник»', text: 'Условие титула (JS): return player.wins >= 5 && player.spyCount >= 2; minXp: 50; название: Ночной охотник; emoji: 🌙.' },
            { title: 'Ачивка «Мастер хаоса»', text: 'Ачивка: название «Мастер хаоса», проверка return (player.chaosGames || 0) >= 10; описание: Сыграй 10 партий Chaos Theory.' },
            { title: 'Режим «Двойной шпион»', text: 'Кастомный режим: 2 шпиона по умолчанию, chaos true, логика JS: return { spies: 2, minivote: true }; описание для карточки режима.' },
            { title: 'VIP-скрипт', text: 'VIP hook onVote: if(player.vip) { showMsg(«VIP-голос учтён ×2»); } — вставь в конструктор VIP с hook onVote.' },
            { title: 'Плагин JSON', text: 'Сформируй JSON плагина: { "name": "Системный отчёт", "hook": "onRoundEnd", "code": "showPopup(\'Раунд завершён\');", "enabled": true } — для импорта в «Мои плагины».' },
            { title: 'Инжектор админки', text: 'Напиши JS для инжектора ядра: добавь кнопку в админ-панель «Сброс таймера» с вызовом toggleTimer(). Безопасно, без eval вне игры.' },
        ],
    },
    {
        id: 'plot',
        title: 'Для генерации сюжета',
        emoji: '📖',
        prompts: [
            { title: 'Локация «Космическая станция»', text: 'Придумай 25 слов для темы «КОСМОС» в игре Шпион (Spyfall): объекты, явления, роли на станции. Формат: слово1, слово2, ... на русском.' },
            { title: 'Сюжет вечеринки', text: 'Опиши сюжетную завязку для 6 игроков в Spy Ultra Chaos Theory: тайная организация, миссия, почему один шпион. 3-4 предложения, атмосфера киберпанк.' },
            { title: 'Вопросы для обсуждения', text: 'Сгенерируй 15 креативных вопросов для фазы обсуждения (не паля слово): для темы «Школа», стиль ироничный, по-русски.' },
            { title: 'Аномалия «Глитч реальности»', text: 'Придумай описание кастомной аномалии: название, emoji, эффект на 1 раунд, как влияет на шпиона и мирных. Для Spy Ultra.' },
            { title: 'История раунда', text: 'Напиши шаблон текста для истории раунда (history): кто победил, слово, режим, 1-2 яркие детали. Переменные: {winner}, {word}, {mode}.' },
            { title: 'Клан и репутация', text: 'Придумай систему клановых названий и +репутации за fair play для Spy Ultra. 5 примеров кланов, правила +5 rep.' },
            { title: 'Сценарий «Последний шанс»', text: 'Опиши драматический сценарий фазы «Последний шанс» для пойманного шпиона: что говорит ведущий, таймер, напряжение.' },
        ],
    },
    {
        id: 'roles',
        title: 'Для настройки ролей',
        emoji: '🎭',
        prompts: [
            { title: 'Роль «Кибер-шпион»', text: 'Кастомная роль Chaos: команда шпионы, emoji 🤖, описание: видит 2 буквы слова. JS при reveal: showPopup первые 2 буквы слова если isSpy.' },
            { title: 'Роль «Медик»', text: 'Роль мирные: при vote может один раз защитить игрока (добавь в doctorShields). JS в фазе vote, tier 2 активка.' },
            { title: 'Роль «Оракул»', text: 'Мирная роль: 1 раз за игру узнать, шпион ли случайный игрок (50% шанс правды). Код action для custom role.' },
            { title: 'Баланс 22 ролей', text: 'Проанализируй 22 роли Chaos Theory в Spy Ultra и предложи, какие отключить для баланса 5 игроков. Список id ролей isActive false.' },
            { title: 'Tier-прогрессия', text: 'Опиши способности Tier 1-3 для новой роли «Инженер»: пассив — видит категорию; актив — чинит глитч; ульта — отмена голосования.' },
            { title: 'Соло-роль «Нейтрал»', text: 'Кастомная роль одиночка: победа если выжил до конца и ни разу не получил большинство голосов. JS onRoundEnd проверка.' },
            { title: 'Синергия ролей', text: 'Предложи 3 пары ролей из Chaos Theory, которые интересно комбинировать в одной партии, и почему (Шериф+Техник и т.д.).' },
        ],
    },
];

function copyPromptText(text, btn) {
    const done = () => {
        if (btn) {
            const orig = btn.textContent;
            btn.textContent = '✓ Скопировано';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1600);
        }
        if (typeof showPopup === 'function') showPopup('📋 Промпт скопирован', 'sys');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
        fallbackCopy(text, done);
    }
}

function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) { showPopup('Не удалось скопировать', 'danger'); }
    document.body.removeChild(ta);
}

function renderPromptsTab() {
    const root = document.getElementById('prompts-root');
    if (!root) return;
    root.innerHTML = PROMPT_CATEGORIES.map(cat => `
    <section class="prompt-category" data-cat="${cat.id}">
      <h3 class="prompt-cat-title">${cat.emoji} ${escHtml(cat.title)}</h3>
      <div class="prompt-list">
        ${cat.prompts.map((p, i) => `
        <article class="prompt-card" style="animation-delay:${i * 0.03}s">
          <div class="prompt-card-head">
            <span class="prompt-card-title">${escHtml(p.title)}</span>
            <button type="button" class="btn-copy-prompt btn-sm btn-gold" data-prompt-idx="${cat.id}-${i}">📋 Копировать</button>
          </div>
          <p class="prompt-card-text">${escHtml(p.text)}</p>
        </article>
        `).join('')}
      </div>
    </section>
  `).join('').replace(/<div/g, '<div').replace(/<\/motion>/g, '</div>').replace(/<\/motion>/g, '</div>');

    root.querySelectorAll('.btn-copy-prompt').forEach(btn => {
        btn.addEventListener('click', () => {
            const [catId, idx] = (btn.dataset.promptIdx || '').split('-');
            const cat = PROMPT_CATEGORIES.find(c => c.id === catId);
            const p = cat?.prompts[+idx];
            if (p) copyPromptText(p.text, btn);
        });
    });
}

function initPrompts() {
    renderPromptsTab();
    const origShowTab = showTab;
    showTab = function (id) {
        origShowTab(id);
        if (id === 'tab-prompts') renderPromptsTab();
    };
}

if (typeof showTab === 'function') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPrompts);
    } else {
        initPrompts();
    }
}
