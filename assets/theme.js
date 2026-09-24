/* ============================================================
   Course — Light/Dark theme toggle
   Works on plain pages (index/lab) and reveal.js slide pages.
   Applies data-theme attribute on <html>, persists to localStorage.
   Anti-FOUC: this script is loaded with `defer` is NOT enough on its
   own — pages also inline a tiny blocking snippet in <head> (see
   THEME_INIT_INLINE below, copy-pasted into every page's <head>)
   that sets the attribute before first paint. This file only wires
   up the toggle button's click behavior + icon state after DOM load.
   ============================================================ */
(function () {
  var STORAGE_KEY = 'course-theme';

  function getTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    } catch (e) {
      return 'dark';
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
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

  function initButton() {
    var btn = document.querySelector('.theme-toggle-btn');
    if (!btn) {
      // Create the button if the page didn't include one explicitly
      btn = document.createElement('button');
      btn.className = 'theme-toggle-btn';
      btn.type = 'button';
      document.body.appendChild(btn);
    }
    btn.addEventListener('click', toggleTheme);
    applyTheme(document.documentElement.getAttribute('data-theme') || getTheme());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initButton);
  } else {
    initButton();
  }
})();
