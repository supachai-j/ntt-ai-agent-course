/* ============================================================
   Course — Light/Dark theme toggle + Generation style picker
   Works on plain pages (index/lab/content) and reveal.js slide pages.
   Applies data-theme (light/dark) and data-gen (genz/millennial/
   corporate/boomer) attributes on <html>, persists both to localStorage.
   Anti-FOUC: this script is loaded with `defer` is NOT enough on its
   own — pages also inline a tiny blocking snippet in <head> (see
   THEME_INIT_INLINE below, copy-pasted into every page's <head>)
   that sets both attributes before first paint. This file only wires
   up the toggle button/picker's behavior + icon state after DOM load.
   ============================================================ */
(function () {
  var THEME_KEY = 'course-theme';
  var GEN_KEY = 'course-gen';
  var GENS = [
    { id: 'genz', emoji: '⚡', label: 'Gen Z' },
    { id: 'millennial', emoji: '🌿', label: 'Millennial' },
    { id: 'corporate', emoji: '💼', label: 'Corporate' },
    { id: 'boomer', emoji: '📰', label: 'Classic' }
  ];

  function getTheme() {
    try {
      return localStorage.getItem(THEME_KEY) ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    } catch (e) {
      return 'dark';
    }
  }

  function getGen() {
    try {
      return localStorage.getItem(GEN_KEY) || 'genz';
    } catch (e) {
      return 'genz';
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    var btn = document.querySelector('.theme-toggle-btn');
    if (btn) {
      btn.textContent = theme === 'light' ? '🌙' : '☀️';
      btn.setAttribute('aria-label', theme === 'light' ? 'สลับเป็น Dark mode' : 'สลับเป็น Light mode');
      btn.title = btn.getAttribute('aria-label');
    }
    // Swap reveal.js base theme (black.css <-> white.css) if present
    var revealTheme = document.getElementById('theme');
    if (revealTheme) {
      revealTheme.href = theme === 'light'
        ? 'https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/white.css'
        : 'https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/black.css';
    }
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || getTheme();
    applyTheme(current === 'light' ? 'dark' : 'light');
  }

  function genById(id) {
    for (var i = 0; i < GENS.length; i++) if (GENS[i].id === id) return GENS[i];
    return GENS[0];
  }

  function applyGen(genId) {
    document.documentElement.setAttribute('data-gen', genId);
    try { localStorage.setItem(GEN_KEY, genId); } catch (e) {}
    var trigger = document.querySelector('.gen-picker-btn');
    if (trigger) {
      var g = genById(genId);
      trigger.textContent = g.emoji;
      trigger.setAttribute('aria-label', 'สไตล์ปัจจุบัน: ' + g.label + ' — คลิกเพื่อเปลี่ยน');
      trigger.title = trigger.getAttribute('aria-label');
    }
    var menu = document.querySelector('.gen-picker-menu');
    if (menu) {
      var items = menu.querySelectorAll('[data-gen-option]');
      for (var j = 0; j < items.length; j++) {
        items[j].classList.toggle('active', items[j].getAttribute('data-gen-option') === genId);
      }
    }
  }

  function closeGenMenu() {
    var menu = document.querySelector('.gen-picker-menu');
    if (menu) menu.classList.remove('open');
  }

  function buildGenPicker() {
    var wrap = document.createElement('div');
    wrap.className = 'gen-picker';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'gen-picker-btn';
    wrap.appendChild(trigger);

    var menu = document.createElement('div');
    menu.className = 'gen-picker-menu';
    GENS.forEach(function (g) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'gen-picker-item';
      item.setAttribute('data-gen-option', g.id);
      item.innerHTML = '<span class="gen-picker-emoji">' + g.emoji + '</span> ' + g.label;
      item.addEventListener('click', function (ev) {
        applyGen(ev.currentTarget.getAttribute('data-gen-option'));
        closeGenMenu();
      });
      menu.appendChild(item);
    });
    wrap.appendChild(menu);

    trigger.addEventListener('click', function (ev) {
      ev.stopPropagation();
      menu.classList.toggle('open');
    });
    document.addEventListener('click', function (ev) {
      if (!wrap.contains(ev.target)) closeGenMenu();
    });

    document.body.appendChild(wrap);
    return wrap;
  }

  function initButton() {
    var btn = document.querySelector('.theme-toggle-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'theme-toggle-btn';
      btn.type = 'button';
      document.body.appendChild(btn);
    }
    btn.addEventListener('click', toggleTheme);
    applyTheme(document.documentElement.getAttribute('data-theme') || getTheme());

    if (!document.querySelector('.gen-picker')) buildGenPicker();
    applyGen(document.documentElement.getAttribute('data-gen') || getGen());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initButton);
  } else {
    initButton();
  }
})();
