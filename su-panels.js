/**
 * SPY ULTRA — Навигация админ-панелей + сохранение настроек
 */
'use strict';

const panelContext = {
    returnTo: 'menu',
    gameStage: 'pass',
    gameActive: false,
};

function isGameSessionActive() {
    const bar = document.getElementById('open-admin-bar');
    const barVisible = bar && bar.style.display !== 'none';
    return !!(G && G.session && G.session.length > 0 && barVisible);
}

function getCurrentGameStage() {
    const ids = ['pass', 'role', 'discuss', 'minivote', 'vote-pass', 'vote', 'tie', 'lc', 'duel', 'results'];
    for (const id of ids) {
        const el = document.getElementById('stage-' + id);
        if (el && !el.classList.contains('hidden')) return id;
    }
    return 'pass';
}

function capturePanelContext() {
    panelContext.gameActive = isGameSessionActive();
    panelContext.returnTo = panelContext.gameActive ? 'game' : 'menu';
    panelContext.gameStage = panelContext.gameActive ? getCurrentGameStage() : 'pass';
}

function persistShadowSettings() {
    if (!settings.shadow) settings.shadow = {};
    const pick = (id) => document.getElementById(id)?.value ?? '';
    const pickChk = (id) => !!document.getElementById(id)?.checked;
    settings.shadow.spy = pick('sh-spy');
    settings.shadow.blockVote = pick('sh-block-vote');
    settings.shadow.doubleVote = pick('sh-double-vote');
    settings.shadow.immune = pick('sh-immune');
    settings.shadow.anonVote = pickChk('sh-anon-vote');
    settings.shadow.freezeTimer = pickChk('sh-freeze-timer');
    settings.shadow.chaosMode = pick('sh-chaos-mode');
    settings.shadow.customChance = document.getElementById('sh-custom-chance')?.value || '30';
    settings.shadow.word = document.getElementById('sh-word-input')?.value || '';
    if (typeof saveAll === 'function') saveAll();
    if (typeof saveSuMeta === 'function') saveSuMeta();
}

function restoreShadowSettings() {
    const s = settings.shadow || {};
    const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== '') el.value = val; };
    const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
    set('sh-spy', s.spy);
    set('sh-block-vote', s.blockVote);
    set('sh-double-vote', s.doubleVote);
    set('sh-immune', s.immune);
    setChk('sh-anon-vote', s.anonVote);
    setChk('sh-freeze-timer', s.freezeTimer);
    if (s.chaosMode) {
        const cm = document.getElementById('sh-chaos-mode');
        if (cm) cm.value = s.chaosMode;
        const wrap = document.getElementById('sh-custom-chance-wrap');
        if (wrap) wrap.style.display = s.chaosMode === 'custom' ? 'block' : 'none';
    }
    if (s.customChance) {
        const r = document.getElementById('sh-custom-chance');
        const v = document.getElementById('sh-chance-val');
        if (r) r.value = s.customChance;
        if (v) v.textContent = s.customChance;
    }
    if (s.word) {
        const w = document.getElementById('sh-word-input');
        if (w) w.value = s.word;
    }
    G.blockedVote = s.blockVote || '';
    G.doubleVote = s.doubleVote || '';
    G.immune = s.immune || '';
    G.timerFreeze = !!s.freezeTimer;
}

function closeAdminPanel() {
    persistShadowSettings();

    if (panelContext.gameActive) {
        showScreen('game');
        const stage = panelContext.gameStage || 'pass';
        showStage(stage);
        if (stage === 'pass' && typeof renderPassStage === 'function') renderPassStage();
        if (stage === 'discuss' && typeof updateTimerDisplay === 'function') updateTimerDisplay();
        logConsole('Возврат в игру (' + stage + ')', 'info');
    } else {
        showScreen('menu');
        showTab('tab-game');
        const bar = document.getElementById('open-admin-bar');
        if (bar) bar.style.display = 'none';
        if (typeof stopHeartbeat === 'function') stopHeartbeat();
        if (typeof tInt !== 'undefined' && tInt) clearInterval(tInt);
        if (typeof psychTimer !== 'undefined' && psychTimer) clearInterval(psychTimer);
    }
}

function openAdminPanel(type) {
    capturePanelContext();
    if (type === 'admin') {
        showScreen('admin');
    } else if (type === 'shadow') {
        showScreen('shadow');
        if (typeof populateShadowSelects === 'function') populateShadowSelects();
        restoreShadowSettings();
    } else if (type === 'root') {
        if (typeof openZeroPanel === 'function') openZeroPanel();
    }
}

function initPanels() {
    const origPopulate = populateShadowSelects;
    populateShadowSelects = function () {
        origPopulate();
        restoreShadowSettings();
    };

    if (typeof settings === 'object' && settings.shadow) {
        setTimeout(restoreShadowSettings, 0);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPanels);
} else {
    initPanels();
}
