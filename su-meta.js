/**
 * SPY ULTRA — Meta: Арсенал, Конструктор, плагины, кастом-контент
 */
'use strict';

const SU_STORAGE_KEY = 'su_meta_v1';

const SHOP_ITEMS = [
    { id: 'second_chance', name: 'Второй шанс', emoji: '🔄', price: 80, desc: 'Одна доп. попытка при «Последнем шансе»' },
    { id: 'clue_sensor', name: 'Сенсор улик', emoji: '🔍', price: 60, desc: 'Улики точнее (+1 подсказка)' },
    { id: 'xp_x2', name: 'XP ×2', emoji: '✨', price: 120, desc: 'Множитель XP на следующий раунд' },
    { id: 'disguise', name: 'Маскировка', emoji: '📚', desc: 'Быстрый panic-экран (ESC×2)', price: 50 },
    { id: 'ghost_rank', name: 'Ранг: Призрак', emoji: '👻', price: 200, desc: 'Отображение ранга Призрак' },
    { id: 'gold_frame', name: 'Золотая рамка', emoji: '🖼', price: 90, desc: 'Золотая обводка аватара' },
    { id: 'particles', name: 'Частицы', emoji: '✴', price: 70, desc: 'Неоновые частицы на карточке' },
];

const THEME_COLOR_KEYS = [
    { key: '--bg', label: 'Фон 1' },
    { key: '--bg2', label: 'Фон 2' },
    { key: '--neon', label: 'Основной' },
    { key: '--neon2', label: 'Акцент' },
    { key: '--neon3', label: 'Опасность' },
    { key: '--gold', label: 'VIP' },
    { key: '--text', label: 'Текст' },
    { key: '--text2', label: 'Текст 2' },
];

let suMeta = {
    roleActive: {},
    customModes: [],
    customRoles: [],
    customTitles: [],
    customAchievements: [],
    plugins: [],
    vipScripts: [],
    themeCustom: { colors: {}, bgCss: '' },
    fontCustom: { url: '', family: '' },
    injected: { code: '' },
};

function defaultRoleActive() {
    const m = {};
    CHAOS_ROLES.forEach(r => { m[r.id] = true; });
    return m;
}

function syncCustomRolesIntoChaos() {
    (suMeta.customRoles || []).forEach(r => {
        if (CHAOS_ROLES.some(x => x.id === r.id)) return;
        CHAOS_ROLES.push({
            id: r.id,
            name: r.name,
            emoji: r.emoji,
            type: 'active',
            desc: r.desc || '',
            custom: true,
            team: r.team,
            actionCode: r.actionCode,
            tiers: { 1: { passive: r.desc || '' }, 2: { active: '' }, 3: { ult: '' } },
        });
    });
}

function loadSuMeta() {
    try {
        const raw = localStorage.getItem(SU_STORAGE_KEY);
        if (raw) {
            const d = JSON.parse(raw);
            suMeta = { ...suMeta, ...d };
        }
    } catch (e) { SU_DEBUG.error('loadSuMeta: ' + e); }
    if (!suMeta.roleActive || !Object.keys(suMeta.roleActive).length) {
        suMeta.roleActive = defaultRoleActive();
    }
    CHAOS_ROLES.forEach(r => {
        if (suMeta.roleActive[r.id] === undefined) suMeta.roleActive[r.id] = true;
    });
    syncCustomRolesIntoChaos();
    applySuMetaTheme();
    applySuMetaFont();
    applyInjectedCode();
    rebuildPluginRegistry();
}

function saveSuMeta() {
    try {
        localStorage.setItem(SU_STORAGE_KEY, JSON.stringify(suMeta));
    } catch (e) { SU_DEBUG.error('saveSuMeta: ' + e); }
}

function makePluginCtx(extra) {
    return {
        game: G,
        session: G.session,
        players,
        player: extra?.player,
        phase: extra?.phase,
        showPopup,
        showMsg: (t, type) => showPopup(t, type || 'sys'),
        logConsole,
        settings,
        selectedMode,
    };
}

function safeEvalBool(code, ctx) {
    if (!code || !String(code).trim()) return true;
    try {
        const fn = new Function(
            'player', 'game', 'players', 'session', 'showPopup', 'showMsg', 'logConsole', 'ctx',
            'return !!(' + String(code).trim() + ');'
        );
        return fn(
            ctx.player, G, players, G.session, showPopup,
            (t, ty) => showPopup(t, ty || 'sys'), logConsole, ctx
        );
    } catch (e) {
        SU_DEBUG.warn('safeEvalBool: ' + e.message);
        return false;
    }
}

function safeRun(code, ctx) {
    if (!code || !String(code).trim()) return;
    try {
        const fn = new Function('ctx', 'player', 'game', 'players', 'session', 'showPopup', 'showMsg', 'logConsole', String(code));
        fn(ctx, ctx.player, G, players, G.session, showPopup, (t, ty) => showPopup(t, ty || 'sys'), logConsole);
    } catch (e) {
        SU_DEBUG.warn('safeRun: ' + e.message);
        showPopup('⚠ Ошибка кода: ' + e.message, 'danger');
    }
}

function getActiveChaosRolePool() {
    const base = CHAOS_ROLES.filter(r => suMeta.roleActive[r.id] !== false);
    const custom = (suMeta.customRoles || []).filter(r => suMeta.roleActive[r.id] !== false).map(r => ({
        id: r.id,
        name: r.name,
        emoji: r.emoji,
        type: 'active',
        desc: r.desc || '',
        custom: true,
        team: r.team,
        actionCode: r.actionCode,
        tiers: { 1: { passive: r.desc || '' }, 2: {}, 3: {} },
    }));
    return [...base, ...custom];
}

function getAllGameModes() {
    return [...GAME_MODES, ...(suMeta.customModes || [])];
}

function getAllAchievements() {
    const custom = (suMeta.customAchievements || []).map(a => ({
        id: a.id,
        name: a.name,
        emoji: a.emoji,
        desc: a.desc,
        f: p => safeEvalBool(a.check, { player: p }),
    }));
    return [...BASE_ACHIEVEMENTS, ...custom];
}

function getPlayerTitle(p) {
    let best = null;
    (suMeta.customTitles || []).forEach(t => {
        if (p.score < (t.minXp || 0)) return;
        if (!safeEvalBool(t.condition, { player: p })) return;
        if (!best || (t.minXp || 0) > (best.minXp || 0)) best = t;
    });
    if (best) return best.emoji + ' ' + best.name;
    const lv = getLevel(p.score);
    return lv.emoji + ' ' + lv.name;
}

function rebuildPluginRegistry() {
    PluginRegistry.length = 0;
    (suMeta.plugins || []).forEach(pl => {
        if (!pl.enabled) return;
        PluginRegistry.push({
            name: pl.name,
            hook: pl.hook,
            enabled: true,
            fn: async (...args) => {
                const ctx = makePluginCtx({ player: args[0] });
                safeRun(pl.code || '/* empty */', ctx);
            },
        });
    });
    (suMeta.vipScripts || []).forEach(v => {
        if (!v.enabled) return;
        PluginRegistry.push({
            name: 'VIP:' + (v.name || v.hook),
            hook: v.hook,
            enabled: true,
            fn: async (...args) => {
                const p = args[0];
                if (!p || !p.vip) {
                    const pl = players.find(x => x.name === p?.name);
                    if (!pl?.vip) return;
                }
                const ctx = makePluginCtx({ player: p || args[0] });
                safeRun('if(ctx.player && ctx.player.vip){' + (v.code || '') + '}', ctx);
            },
        });
    });
}

async function firePlugins(hook, ...args) {
    for (const plugin of PluginRegistry) {
        if (!plugin.enabled || plugin.hook !== hook) continue;
        try {
            await Promise.resolve(plugin.fn(...args, makePluginCtx({ player: args[0] })));
        } catch (e) {
            SU_DEBUG.error('Plugin «' + plugin.name + '»: ' + e);
        }
    }
}

function applySuMetaTheme() {
    const c = suMeta.themeCustom?.colors || {};
    const themeAttr = document.documentElement.getAttribute('data-theme') || 'matrix';
    const useCustom = Object.keys(c).length > 0 || (suMeta.themeCustom?.bgCss || '').trim();
    if (!useCustom) {
        THEME_COLOR_KEYS.forEach(({ key }) => document.documentElement.style.removeProperty(key));
    } else {
        Object.entries(c).forEach(([k, v]) => {
            if (v) document.documentElement.style.setProperty(k, v);
        });
    }
    let el = document.getElementById('su-custom-bg-style');
    const css = suMeta.themeCustom?.bgCss || '';
    if (css) {
        if (!el) {
            el = document.createElement('style');
            el.id = 'su-custom-bg-style';
            document.head.appendChild(el);
        }
        el.textContent = 'body.crt-effect { ' + css + ' }';
    } else if (el) el.textContent = '';
}

function applySuMetaFont() {
    const f = suMeta.fontCustom || {};
    if (f.url) {
        let link = document.getElementById('su-custom-font-link');
        if (!link) {
            link = document.createElement('link');
            link.id = 'su-custom-font-link';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        link.href = f.url;
    }
    if (f.family) {
        document.documentElement.style.setProperty('--font-main', f.family);
        document.documentElement.style.setProperty('--font-display', f.family);
    }
}

function applyInjectedCode() {
    let el = document.getElementById('su-injected-runtime');
    const code = suMeta.injected?.code || '';
    if (!code.trim()) {
        if (el) el.remove();
        return;
    }
    if (!el) {
        el = document.createElement('div');
        el.id = 'su-injected-runtime';
        el.style.display = 'none';
        document.body.appendChild(el);
    }
    try {
        const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (styleMatch) {
            let s = document.getElementById('su-injected-css');
            if (!s) {
                s = document.createElement('style');
                s.id = 'su-injected-css';
                document.head.appendChild(s);
            }
            s.textContent = styleMatch[1];
        }
        const js = code.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();
        if (js) safeRun(js, makePluginCtx({}));
    } catch (e) { SU_DEBUG.error('inject: ' + e); }
}

function hasPerk(p, id) {
    return !!(p.perks && p.perks[id]);
}

function buyShopItem(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    const sel = document.getElementById('arsenal-player');
    const pn = sel?.value;
    const p = players.find(x => x.name === pn);
    if (!item || !p) { showPopup('Выберите агента', 'danger'); return; }
    if (hasPerk(p, itemId)) { showPopup('Уже куплено', 'danger'); return; }
    if (p.score < item.price) { showPopup('Недостаточно XP', 'danger'); return; }
    p.score -= item.price;
    if (!p.perks) p.perks = {};
    p.perks[itemId] = true;
    if (itemId === 'xp_x2') G.xpMultiplier = 2;
    if (itemId === 'ghost_rank') p.ghostRank = true;
    saveAll();
    saveSuMeta();
    renderArsenal();
    renderAgents();
    showPopup(item.emoji + ' «' + item.name + '» куплено!', 'gold');
}

function renderArsenal() {
    const sel = document.getElementById('arsenal-player');
    const shop = document.getElementById('arsenal-shop');
    const bal = document.getElementById('arsenal-balance');
    if (!sel || !shop) return;
    if (!sel.options.length) {
        sel.innerHTML = players.map(p => `<option value="${escHtml(p.name)}">${escHtml(p.name)}</option>`).join('');
    }
    const p = players.find(x => x.name === sel.value) || players[0];
    if (bal && p) bal.textContent = 'Баланс: ' + p.score + ' XP';
    shop.innerHTML = SHOP_ITEMS.map(item => {
        const owned = p && hasPerk(p, item.id);
        return `<div class="shop-card ${owned ? 'owned' : ''}">
      <div class="shop-emoji">${item.emoji}</div>
      <div class="shop-name">${escHtml(item.name)}</div>
      <div class="shop-desc">${escHtml(item.desc)}</div>
      <div class="shop-price">${item.price} XP</div>
      <button type="button" class="btn-sm ${owned ? 'btn-sec' : 'btn-gold'}" ${owned ? 'disabled' : ''} onclick="buyShopItem('${item.id}')">${owned ? '✓ Есть' : 'Купить'}</button>
    </div>`;
    }).join('');
    sel.onchange = () => renderArsenal();
}

function renderChaosRolePickers() {
    const grids = ['chaos-role-checkboxes', 'roles-active-grid'];
    grids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = CHAOS_ROLES.map(r => {
            const on = suMeta.roleActive[r.id] !== false;
            return `<label class="role-check-item">
        <input type="checkbox" data-role-id="${r.id}" ${on ? 'checked' : ''} />
        <span>${r.emoji} ${escHtml(r.name)}</span>
      </label>`;
        }).join('');
        el.querySelectorAll('input[type=checkbox]').forEach(cb => {
            cb.addEventListener('change', () => {
                suMeta.roleActive[cb.dataset.roleId] = cb.checked;
                saveSuMeta();
            });
        });
    });
}

function updateChaosPickerVisibility() {
    const card = document.getElementById('chaos-role-picker-card');
    if (!card) return;
    const chaos = selectedMode === 'chaos' || document.getElementById('cfg-chaos')?.checked;
    card.classList.toggle('hidden', !chaos);
}

function renderDevThemeInputs() {
    const el = document.getElementById('theme-color-inputs');
    if (!el) return;
    el.innerHTML = THEME_COLOR_KEYS.map(({ key, label }) => {
        const val = suMeta.themeCustom.colors[key] || getComputedStyle(document.documentElement).getPropertyValue(key).trim();
        return `<label class="color-field"><span>${label}</span>
      <input type="color" data-css="${key}" value="${toColorInput(val)}" />
      <input type="text" class="su-input su-input-sm" data-css-text="${key}" value="${escHtml(val)}" /></label>`;
    }).join('');
    el.querySelectorAll('input[type=color]').forEach(inp => {
        inp.addEventListener('input', () => {
            suMeta.themeCustom.colors[inp.dataset.css] = inp.value;
            document.documentElement.style.setProperty(inp.dataset.css, inp.value);
        });
    });
    const bg = document.getElementById('dev-bg-css');
    if (bg) bg.value = suMeta.themeCustom.bgCss || '';
}

function toColorInput(cssVal) {
    if (!cssVal) return '#0a0a0a';
    if (cssVal.startsWith('#') && cssVal.length >= 7) return cssVal.slice(0, 7);
    return '#00ff41';
}

function renderDevLists() {
    const tl = document.getElementById('dev-titles-list');
    if (tl) {
        tl.innerHTML = (suMeta.customTitles || []).map((t, i) =>
            `<div class="dev-list-item">${t.emoji} ${escHtml(t.name)} (${t.minXp} XP) <button class="btn-sm btn-danger" onclick="suDeleteTitle(${i})">✕</button></div>`
        ).join('').replace(/<\/motion>/g, '</div>');
    }
    const al = document.getElementById('dev-ach-list');
    if (al) {
        al.innerHTML = (suMeta.customAchievements || []).map((a, i) =>
            `<div class="dev-list-item">${a.emoji} ${escHtml(a.name)} <button class="btn-sm btn-danger" onclick="suDeleteAch(${i})">✕</button></div>`
        ).join('');
    }
    const ml = document.getElementById('dev-modes-list');
    if (ml) {
        ml.innerHTML = (suMeta.customModes || []).map((m, i) =>
            `<div class="dev-list-item">${m.emoji} ${escHtml(m.name)} <button class="btn-sm btn-danger" onclick="suDeleteMode(${i})">✕</button></div>`
        ).join('');
    }
    const rl = document.getElementById('dev-custom-roles-list');
    if (rl) {
        rl.innerHTML = (suMeta.customRoles || []).map((r, i) =>
            `<div class="dev-list-item">${r.emoji} ${escHtml(r.name)} [${r.team}] <button class="btn-sm btn-danger" onclick="suDeleteCustomRole(${i})">✕</button></div>`
        ).join('');
    }
    const pl = document.getElementById('plug-list');
    if (pl) {
        pl.innerHTML = (suMeta.plugins || []).map((p, i) =>
            `<div class="dev-list-item">
        <label><input type="checkbox" ${p.enabled !== false ? 'checked' : ''} onchange="suTogglePlugin(${i},this.checked)" /> ${escHtml(p.name)} · ${p.hook}</label>
        <button class="btn-sm btn-danger" onclick="suDeletePlugin(${i})">✕</button>
      </div>`
        ).join('');
    }
}

window.suDeleteTitle = i => { suMeta.customTitles.splice(i, 1); saveSuMeta(); renderDevLists(); renderAgents(); };
window.suDeleteAch = i => { suMeta.customAchievements.splice(i, 1); saveSuMeta(); renderDevLists(); renderAchievements(); };
window.suDeleteMode = i => { suMeta.customModes.splice(i, 1); saveSuMeta(); renderDevLists(); renderModes(); };
window.suDeleteCustomRole = i => { suMeta.customRoles.splice(i, 1); saveSuMeta(); renderDevLists(); renderChaosRolePickers(); };
window.suDeletePlugin = i => { suMeta.plugins.splice(i, 1); saveSuMeta(); rebuildPluginRegistry(); renderDevLists(); };
window.suTogglePlugin = (i, v) => { suMeta.plugins[i].enabled = v; saveSuMeta(); rebuildPluginRegistry(); };
window.buyShopItem = buyShopItem;

function bindSuMetaEvents() {
    bindEl('btn-open-dev', 'click', () => { showScreen('dev'); renderDevThemeInputs(); renderDevLists(); });
    bindEl('dev-close', 'click', () => {
        showScreen('menu');
        showTab('tab-game');
    });
    document.querySelectorAll('.dev-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dev-tab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.dev-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const panel = document.getElementById(btn.dataset.dev);
            if (panel) panel.classList.add('active');
        });
    });
    document.querySelectorAll('.sub-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const parent = btn.closest('#dev-plugins');
            if (!parent) return;
            parent.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
            parent.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const panel = document.getElementById(btn.dataset.ptab);
            if (panel) panel.classList.add('active');
        });
    });

    bindEl('dev-theme-apply', 'click', () => {
        const bg = document.getElementById('dev-bg-css')?.value || '';
        suMeta.themeCustom.bgCss = bg;
        document.querySelectorAll('#theme-color-inputs input[data-css-text]').forEach(inp => {
            suMeta.themeCustom.colors[inp.dataset.cssText] = inp.value;
            document.documentElement.style.setProperty(inp.dataset.cssText, inp.value);
        });
        saveSuMeta();
        applySuMetaTheme();
        showPopup('🎨 Тема применена');
    });
    bindEl('dev-theme-reset', 'click', () => {
        suMeta.themeCustom = { colors: {}, bgCss: '' };
        saveSuMeta();
        location.reload();
    });
    bindEl('dev-font-apply', 'click', () => {
        suMeta.fontCustom.url = document.getElementById('dev-font-url')?.value || '';
        suMeta.fontCustom.family = document.getElementById('dev-font-family')?.value || '';
        saveSuMeta();
        applySuMetaFont();
        showPopup('🔤 Шрифт подключён');
    });
    bindEl('dt-add', 'click', () => {
        suMeta.customTitles.push({
            id: 't_' + Date.now(),
            name: document.getElementById('dt-name')?.value || 'Титул',
            emoji: document.getElementById('dt-emoji')?.value || '⭐',
            minXp: +(document.getElementById('dt-minxp')?.value || 0),
            condition: document.getElementById('dt-cond')?.value || 'return true',
        });
        saveSuMeta();
        renderDevLists();
        showPopup('Титул добавлен');
    });
    bindEl('da-add', 'click', () => {
        suMeta.customAchievements.push({
            id: 'a_' + Date.now(),
            name: document.getElementById('da-name')?.value || 'Ачивка',
            emoji: document.getElementById('da-emoji')?.value || '🏅',
            desc: document.getElementById('da-desc')?.value || '',
            check: document.getElementById('da-check')?.value || 'return false',
        });
        saveSuMeta();
        renderDevLists();
        renderAchievements();
        showPopup('Ачивка добавлена');
    });
    bindEl('pl-save', 'click', () => {
        suMeta.plugins.push({
            id: 'p_' + Date.now(),
            name: document.getElementById('pl-name')?.value || 'Плагин',
            hook: document.getElementById('pl-hook')?.value || 'onDiscuss',
            code: document.getElementById('pl-code')?.value || '',
            enabled: true,
        });
        saveSuMeta();
        rebuildPluginRegistry();
        renderDevLists();
        showPopup('Плагин сохранён');
    });
    bindEl('pl-import-raw', 'click', () => {
        try {
            const raw = document.getElementById('pl-raw')?.value || '';
            const obj = JSON.parse(raw);
            if (obj && obj.name) {
                suMeta.plugins.push({
                    id: 'p_' + Date.now(),
                    name: obj.name,
                    hook: obj.hook || 'onDiscuss',
                    code: typeof obj.code === 'string' ? obj.code : '',
                    enabled: obj.enabled !== false,
                });
                saveSuMeta();
                rebuildPluginRegistry();
                renderDevLists();
                showPopup('Импорт OK');
                return;
            }
        } catch (e) { /* not JSON */ }
        suMeta.plugins.push({
            id: 'p_' + Date.now(),
            name: 'Raw',
            hook: 'onDiscuss',
            code: document.getElementById('pl-raw')?.value || '',
            enabled: true,
        });
        saveSuMeta();
        rebuildPluginRegistry();
        renderDevLists();
        showPopup('Сохранено как код');
    });
    bindEl('pl-export', 'click', () => {
        const box = document.getElementById('pl-import-box');
        const data = JSON.stringify(suMeta.plugins, null, 2);
        if (box) box.value = data;
        if (navigator.clipboard) navigator.clipboard.writeText(data);
        showPopup('📋 Плагины скопированы');
    });
    bindEl('pl-import-btn', 'click', () => {
        try {
            const arr = JSON.parse(document.getElementById('pl-import-box')?.value || '[]');
            if (Array.isArray(arr)) {
                suMeta.plugins = suMeta.plugins.concat(arr);
                saveSuMeta();
                rebuildPluginRegistry();
                renderDevLists();
                showPopup('Импорт плагинов OK');
            }
        } catch (e) { showPopup('JSON ошибка', 'danger'); }
    });
    bindEl('vip-save', 'click', () => {
        suMeta.vipScripts.push({
            id: 'v_' + Date.now(),
            name: 'VIP',
            hook: document.getElementById('vip-hook')?.value || 'onRoleReveal',
            code: document.getElementById('vip-code')?.value || '',
            enabled: true,
        });
        saveSuMeta();
        rebuildPluginRegistry();
        showPopup('VIP-скрипт сохранён');
    });
    bindEl('dm-save', 'click', () => {
        const id = (document.getElementById('dm-id')?.value || 'custom_' + Date.now()).trim().replace(/\s+/g, '_');
        suMeta.customModes.push({
            id,
            name: document.getElementById('dm-name')?.value || 'Кастом',
            emoji: document.getElementById('dm-emoji')?.value || '🎮',
            desc: document.getElementById('dm-desc')?.value || '',
            defaultSpies: +(document.getElementById('dm-spies')?.value || 1),
            chaos: !!document.getElementById('dm-chaos')?.checked,
            minivote: !!document.getElementById('dm-minivote')?.checked,
            logic: document.getElementById('dm-logic')?.value || '',
            custom: true,
        });
        saveSuMeta();
        renderDevLists();
        renderModes();
        showPopup('Режим сохранён');
    });
    bindEl('cr-save', 'click', () => {
        const id = (document.getElementById('cr-id')?.value || 'role_' + Date.now()).trim();
        suMeta.customRoles.push({
            id,
            name: document.getElementById('cr-name')?.value || 'Роль',
            emoji: document.getElementById('cr-emoji')?.value || '🎭',
            team: document.getElementById('cr-team')?.value || 'civil',
            desc: document.getElementById('cr-desc')?.value || '',
            actionCode: document.getElementById('cr-action')?.value || '',
        });
        suMeta.roleActive[id] = true;
        syncCustomRolesIntoChaos();
        saveSuMeta();
        renderDevLists();
        renderChaosRolePickers();
        showPopup('Роль создана');
    });
    bindEl('chaos-roles-all', 'click', () => {
        CHAOS_ROLES.forEach(r => { suMeta.roleActive[r.id] = true; });
        saveSuMeta();
        renderChaosRolePickers();
    });
    bindEl('chaos-roles-none', 'click', () => {
        CHAOS_ROLES.forEach(r => { suMeta.roleActive[r.id] = false; });
        saveSuMeta();
        renderChaosRolePickers();
    });
    bindEl('adm-inject-run', 'click', () => {
        suMeta.injected.code = document.getElementById('adm-inject-code')?.value || '';
        saveSuMeta();
        applyInjectedCode();
        showPopup('💉 Код выполнен');
    });
    bindEl('adm-inject-save', 'click', () => {
        suMeta.injected.code = document.getElementById('adm-inject-code')?.value || '';
        saveSuMeta();
        showPopup('💾 Инжект сохранён');
    });

    const cfgChaos = document.getElementById('cfg-chaos');
    if (cfgChaos) cfgChaos.addEventListener('change', updateChaosPickerVisibility);
}

function renderSuMeta() {
    renderArsenal();
    renderChaosRolePickers();
    updateChaosPickerVisibility();
    const inj = document.getElementById('adm-inject-code');
    if (inj && suMeta.injected?.code) inj.value = suMeta.injected.code;
    document.body.classList.toggle('su-particles-on', players.some(p => hasPerk(p, 'particles')));
}

function runCustomRoleAction(p, phase) {
    const role = getActiveChaosRolePool().find(r => r.id === p.chaosRole && r.custom);
    if (!role?.actionCode) return;
    safeRun(role.actionCode, makePluginCtx({ player: p, phase }));
}

function applyCustomModeLogic(modeId) {
    const m = suMeta.customModes.find(x => x.id === modeId);
    if (!m?.logic) return null;
    try {
        const fn = new Function('game', 'players', 'session', 'return (' + m.logic + ')');
        return fn(G, players, G.session);
    } catch (e) { SU_DEBUG.warn('mode logic: ' + e); return null; }
}

function initSuMeta() {
    loadSuMeta();

    const _saveAll = saveAll;
    saveAll = function () {
        _saveAll();
        saveSuMeta();
    };

    const _normalize = normalizePlayer;
    normalizePlayer = function (p) {
        _normalize(p);
        if (!p.perks) p.perks = {};
    };
    players.forEach(normalizePlayer);

    const _renderAll = renderAll;
    renderAll = function () {
        _renderAll();
        renderSuMeta();
    };

    const _renderModes = renderModes;
    renderModes = function () {
        const el = document.getElementById('mode-list');
        if (!el) return;
        el.innerHTML = getAllGameModes().map(m =>
            `<div class="mode-card${selectedMode === m.id ? ' active' : ''}" onclick="selectedMode='${m.id}';renderModes();updateChaosPickerVisibility()">
      <h3>${m.emoji} ${m.name}</h3><p>${m.desc}</p>${m.custom ? '<span class="tag-custom">CUSTOM</span>' : ''}
    </div>`
        ).join('');
        updateChaosPickerVisibility();
    };

    const _renderAch = renderAchievements;
    renderAchievements = function () {
        const el = document.getElementById('ach-grid');
        if (!el) return;
        el.innerHTML = getAllAchievements().map(a => {
            const unlocked = players.some(p => { try { return a.f(p); } catch (e) { return false; } });
            return `<div class="ach-item ${unlocked ? 'unlocked' : ''}">
        <div class="ach-emoji">${unlocked ? a.emoji : '🔒'}</div>
        <div class="ach-name">${a.name}</div>
        <div class="ach-desc">${a.desc}</div>
      </div>`;
        }).join('');
    };

    const _renderAgents = renderAgents;
    renderAgents = function () {
        _renderAgents();
        players.forEach((p, i) => {
            const row = document.getElementById('agent-row-' + i);
            if (!row) return;
            if (hasPerk(p, 'gold_frame') || p.perks?.gold_frame) row.classList.add('gold-frame');
            if (p.ghostRank || hasPerk(p, 'ghost_rank')) row.classList.add('ghost-rank');
            const lvl = row.querySelector('.lvl-name');
            if (lvl) lvl.textContent = getPlayerTitle(p) + (p.vip ? ' ⭐' : '');
        });
    };

    const _viewRole = viewRole;
    viewRole = async function () {
        _viewRole();
        const p = G.session[G.cur];
        if (p) {
            runCustomRoleAction(p, 'reveal');
            await firePlugins('onRoleReveal', p, G);
        }
    };

    const _nextPlayer = nextPlayer;
    nextPlayer = async function () {
        const p = G.session[G.cur];
        await firePlugins('onPass', p, G);
        _nextPlayer();
        if (G.cur >= G.session.length) await firePlugins('onDiscuss', null, G);
    };

    const _goVote = goVote;
    goVote = async function () {
        await firePlugins('onDiscuss', null, G);
        _goVote();
    };

    const _finishVote = finishVoteAccuse;
    finishVoteAccuse = async function (idx) {
        await firePlugins('onVote', G.session[idx], G);
        _finishVote(idx);
    };

    const _renderEvidence = renderEvidence;
    renderEvidence = function (p) {
        _renderEvidence(p);
        if (hasPerk(players.find(pl => pl.name === p.name) || {}, 'clue_sensor')) {
            const el = document.getElementById('evidence-container');
            if (el && el.innerHTML) el.innerHTML += '<div class="hint-text" style="color:var(--neon)">🔍 Сенсор: тема «' + escHtml(p.cat || '') + '»</div>';
        }
    };

    const _checkLC = checkLastChance;
    checkLastChance = function () {
        const accused = G.session[G._ai];
        const pl = players.find(x => x.name === accused?.name);
        const inp = document.getElementById('lc-input')?.value?.trim().toLowerCase();
        const word = G.session[0]?.word?.toLowerCase();
        if (inp !== word && pl && hasPerk(pl, 'second_chance') && !pl._usedSecondChance) {
            pl._usedSecondChance = true;
            showPopup('🔄 Второй шанс! Ещё одна попытка.');
            document.getElementById('lc-input').value = '';
            return;
        }
        _checkLC();
    };

    const _showFinal = showFinal;
    showFinal = async function (...args) {
        await firePlugins('onRoundEnd', null, G);
        return _showFinal(...args);
    };

    const _startGame = startGame;
    startGame = function () {
        const cm = suMeta.customModes.find(m => m.id === selectedMode);
        if (cm) {
            if (cm.chaos) {
                const cc = document.getElementById('cfg-chaos');
                if (cc) cc.checked = true;
            }
            const sp = document.getElementById('cfg-spies');
            if (sp && cm.defaultSpies) sp.value = String(cm.defaultSpies);
            applyCustomModeLogic(selectedMode);
        }
        if (players.some(p => hasPerk(p, 'xp_x2'))) G.xpMultiplier = Math.max(G.xpMultiplier || 1, 2);
        _startGame();
        updateChaosPickerVisibility();
    };

    runPlugins = firePlugins;

    bindSuMetaEvents();
    renderSuMeta();
    SU_DEBUG.log('SU Meta initialized');
}

window.getActiveChaosRolePool = getActiveChaosRolePool;
window.loadSuMeta = loadSuMeta;
