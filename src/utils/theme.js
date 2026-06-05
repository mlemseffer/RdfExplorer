/**
 * Light/dark theme controller using a class on the document root and
 * persisted preference in `localStorage`.
 *
 * - Click on `#toggleThemeBtn` toggles the theme.
 * - `Ctrl/Cmd + J` keyboard shortcut also toggles it.
 */
const THEME_KEY = 'rdfexplorer-theme';
const ROOT_CLASS = 'dark-mode';

function readSavedTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'light';
  } catch {
    return 'light';
  }
}

function persistTheme(mode) {
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function initTheme() {
  const root = document.documentElement;
  const btn = document.getElementById('toggleThemeBtn');

  const updateBtnLabel = () => {
    if (!btn) return;
    const isDark = root.classList.contains(ROOT_CLASS);
    btn.textContent = isDark ? '☀️ Mode clair' : '🌙 Mode sombre';
  };

  const applyTheme = (mode) => {
    root.classList.toggle(ROOT_CLASS, mode === 'dark');
    updateBtnLabel();
  };

  applyTheme(readSavedTheme());

  if (btn) {
    btn.addEventListener('click', () => {
      const next = root.classList.contains(ROOT_CLASS) ? 'light' : 'dark';
      applyTheme(next);
      persistTheme(next);
    });
  }

  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 'j' || e.key === 'J')) {
      e.preventDefault();
      if (btn) btn.click();
    }
  });
}
