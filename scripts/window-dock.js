// Window dock — vertical micro UI on the left listing open windows.
// Reads `openWindows` from window.js and animates the canvas view to focus a chosen window.

import { view, MAX_SCALE, renderView } from './state.js';
import { openWindows, closeWindow } from './window.js';

const dockEl = document.createElement('div');
dockEl.className = 'window-dock';
document.body.appendChild(dockEl);

let viewAnimRaf = null;
function animateView(target, duration = 480) {
  if (viewAnimRaf) cancelAnimationFrame(viewAnimRaf);
  const start = performance.now();
  const from = { ...view };
  const ease = (t) => 1 - Math.pow(1 - t, 3);  // easeOutCubic

  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const e = ease(t);
    view.x = from.x + (target.x - from.x) * e;
    view.y = from.y + (target.y - from.y) * e;
    view.scale = from.scale + (target.scale - from.scale) * e;
    renderView();
    if (t < 1) viewAnimRaf = requestAnimationFrame(tick);
    else viewAnimRaf = null;
  }
  viewAnimRaf = requestAnimationFrame(tick);
}

let windowZ = 1000;
function focusWindow(win) {
  windowZ += 1;
  win.style.zIndex = String(windowZ);

  win.animate(
    [{ filter: 'brightness(1.18)' }, { filter: 'brightness(1)' }],
    { duration: 320, easing: 'ease-out' }
  );

  const w = parseFloat(win.style.width);
  const h = parseFloat(win.style.height);
  if (!w || !h || !win._pos) return;
  const cx = win._pos.x + w / 2;
  const cy = win._pos.y + h / 2;
  const margin = 80;
  const sx = (window.innerWidth - margin * 2) / w;
  const sy = (window.innerHeight - margin * 2) / h;
  const targetScale = Math.min(sx, sy, MAX_SCALE);
  animateView({
    x: -cx * targetScale,
    y: -cy * targetScale,
    scale: targetScale,
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function renderDock() {
  dockEl.innerHTML = openWindows.map((win, i) => {
    const title = win.querySelector('.os-window-title')?.textContent || '—';
    return `<div class="dock-item" data-idx="${i}" title="${escapeHtml(title)}">
      <span class="dock-title">${escapeHtml(title)}</span>
      <button class="dock-close" data-idx="${i}" aria-label="close">×</button>
    </div>`;
  }).join('');

  dockEl.querySelectorAll('.dock-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.dock-close')) return;
      const idx = parseInt(item.dataset.idx, 10);
      const win = openWindows[idx];
      if (win) focusWindow(win);
    });
  });
  dockEl.querySelectorAll('.dock-close').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx, 10);
      const win = openWindows[idx];
      if (win) closeWindow(win);
    });
  });

  dockEl.classList.toggle('is-visible', openWindows.length > 0);
}

// Ctrl/Cmd + 1..9 → focus the Nth window in the dock
window.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  if (e.key < '1' || e.key > '9') return;
  const target = e.target;
  if (target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName))) return;
  const idx = parseInt(e.key, 10) - 1;
  const win = openWindows[idx];
  if (!win) return;
  e.preventDefault();
  focusWindow(win);
});
