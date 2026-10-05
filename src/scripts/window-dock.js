// Shared window focus and canvas animations.

import { view, homeView, viewMotion, MAX_SCALE, renderView } from './state.js';
import { openWindows, bringToFront, placeBesideCanvas } from './window.js';
import { closeOverview, isOverviewOpen, layoutOverview } from './window-overview.js';

let viewAnimRaf = null;
export function stopViewAnimation() {
  if (viewAnimRaf) cancelAnimationFrame(viewAnimRaf);
  viewAnimRaf = null;
  viewMotion.active = false;
}
export function animateView(target, duration = 480) {
  Object.assign(homeView, target);
  viewMotion.active = true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) duration = 1;
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
    else {
      viewAnimRaf = null;
      viewMotion.active = false;
      renderView();
    }
  }
  viewAnimRaf = requestAnimationFrame(tick);
}

export function focusWindow(win) {
  closeOverview();
  bringToFront(win);
  if (placeBesideCanvas(win)) return;

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

export function renderDock() {
  if (isOverviewOpen()) layoutOverview();
}

// Ctrl/Cmd + 1..9 → focus the Nth open window
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
