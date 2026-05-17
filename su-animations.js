/**
 * SPY ULTRA — AAA UI animations + settings
 */
'use strict';

const ANIM_STORAGE_KEY = 'su_anim_settings';

let animSettings = {
    enabled: true,
    speed: 0.25,
};

function loadAnimSettings() {
    try {
        const raw = localStorage.getItem(ANIM_STORAGE_KEY);
        if (raw) animSettings = { ...animSettings, ...JSON.parse(raw) };
    } catch (e) { /* ignore */ }
    applyAnimSettings();
}

function saveAnimSettings() {
    try {
        localStorage.setItem(ANIM_STORAGE_KEY, JSON.stringify(animSettings));
    } catch (e) { /* ignore */ }
}

function applyAnimSettings() {
    const root = document.documentElement;
    const dur = Math.max(0.1, Math.min(1, animSettings.speed || 0.25));
    root.style.setProperty('--anim-duration', dur + 's');
    root.style.setProperty('--anim-duration-fast', (dur * 0.6) + 's');
    document.body.classList.toggle('animations-off', animSettings.enabled === false);
    document.body.classList.toggle('animations-on', animSettings.enabled !== false);

    const toggle = document.getElementById('anim-enabled-toggle');
    const slider = document.getElementById('anim-speed-slider');
    const label = document.getElementById('anim-speed-val');
    if (toggle) toggle.checked = animSettings.enabled !== false;
    if (slider) slider.value = String(dur);
    if (label) label.textContent = Math.round(dur * 100) + '%';
}

function bindAnimControls() {
    const toggle = document.getElementById('anim-enabled-toggle');
    const slider = document.getElementById('anim-speed-slider');
    if (toggle) {
        toggle.addEventListener('change', () => {
            animSettings.enabled = toggle.checked;
            saveAnimSettings();
            applyAnimSettings();
        });
    }
    if (slider) {
        slider.addEventListener('input', () => {
            animSettings.speed = parseFloat(slider.value) || 0.25;
            applyAnimSettings();
        });
        slider.addEventListener('change', () => saveAnimSettings());
    }
}

function initMenuParallax() {
    const menu = document.getElementById('screen-menu');
    if (!menu || animSettings.enabled === false) return;
    let raf = 0;
    menu.addEventListener('mousemove', (e) => {
        if (document.body.classList.contains('animations-off')) return;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
            const x = (e.clientX / window.innerWidth - 0.5) * 8;
            const y = (e.clientY / window.innerHeight - 0.5) * 8;
            menu.style.setProperty('--parallax-x', x + 'px');
            menu.style.setProperty('--parallax-y', y + 'px');
        });
    });
    menu.addEventListener('mouseleave', () => {
        menu.style.setProperty('--parallax-x', '0px');
        menu.style.setProperty('--parallax-y', '0px');
    });
}

function enhanceShowTab() {
    if (typeof showTab !== 'function') return;
    const orig = showTab;
    showTab = function (id) {
        const prev = document.querySelector('.tab-content.active');
        const next = document.getElementById(id);
        if (prev && next && prev !== next && animSettings.enabled !== false) {
            prev.classList.add('tab-exit');
            setTimeout(() => {
                orig(id);
                next.classList.add('tab-enter');
                requestAnimationFrame(() => next.classList.remove('tab-enter'));
                prev.classList.remove('tab-exit');
            }, Math.min(120, parseFloat(animSettings.speed) * 400));
        } else {
            orig(id);
            if (next && animSettings.enabled !== false) {
                next.classList.add('tab-enter');
                requestAnimationFrame(() => next.classList.remove('tab-enter'));
            }
        }
    };
}

function glitchRevealButtons() {
    if (animSettings.enabled === false) return;
    document.querySelectorAll('.btn-primary, .btn-danger, .btn-gold, .btn-neon3').forEach((btn, i) => {
        btn.classList.add('neon-reveal');
        btn.style.animationDelay = (i * 0.02) + 's';
    });
}

function initAnimations() {
    loadAnimSettings();
    bindAnimControls();
    initMenuParallax();
    enhanceShowTab();
    setTimeout(glitchRevealButtons, 400);

    const origRenderAll = typeof renderAll === 'function' ? renderAll : null;
    if (origRenderAll) {
        renderAll = function () {
            origRenderAll();
            glitchRevealButtons();
        };
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimations);
} else {
    initAnimations();
}
