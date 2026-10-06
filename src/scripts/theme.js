import { getLanguage } from './language.js';

const root = document.documentElement;
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let activeTransition = null;
let savedTheme = null;
try { savedTheme = localStorage.getItem('site-theme'); } catch {}

function updateControl() {
  const dark = root.dataset.theme === 'dark';
  document.querySelectorAll('[data-theme-switch]').forEach(button => {
    button.setAttribute('aria-pressed', String(dark));
    const label = getLanguage() === 'ru'
      ? dark ? 'Включить светлую тему' : 'Включить тёмную тему'
      : dark ? 'Switch to light theme' : 'Switch to dark theme';
    button.setAttribute('aria-label', label);
    button.title = label;
  });
}

function syncFrame(frame) {
  try {
    if (frame.contentDocument?.documentElement) frame.contentDocument.documentElement.dataset.theme = root.dataset.theme;
  } catch { /* Cross-origin frames keep their own appearance. */ }
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  document.querySelectorAll('iframe').forEach(syncFrame);
  updateControl();
  window.dispatchEvent(new Event('themechange'));
}

function switchTheme(theme) {
  activeTransition?.skipTransition();
  if (reducedMotion.matches || typeof document.startViewTransition !== 'function') {
    applyTheme(theme);
    return;
  }
  const transition = document.startViewTransition(() => applyTheme(theme));
  activeTransition = transition;
  transition.finished.catch(() => {}).finally(() => {
    if (activeTransition === transition) activeTransition = null;
  });
}

document.querySelector('[data-theme-switch]')?.addEventListener('click', () => {
  savedTheme = (savedTheme || root.dataset.theme) === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('site-theme', savedTheme); } catch {}
  switchTheme(savedTheme);
});
document.addEventListener('load', event => {
  if (event.target.tagName === 'IFRAME') syncFrame(event.target);
}, { capture: true });
window.addEventListener('languagechange', updateControl);
window.addEventListener('storage', event => {
  if (event.key !== 'site-theme') return;
  savedTheme = event.newValue;
  applyTheme(savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : systemTheme.matches ? 'dark' : 'light');
});
systemTheme.addEventListener('change', event => {
  if (savedTheme !== 'dark' && savedTheme !== 'light' && window.parent === window) applyTheme(event.matches ? 'dark' : 'light');
});
applyTheme(root.dataset.theme || 'light');
