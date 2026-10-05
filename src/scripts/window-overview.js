import { view, renderView } from './state.js';
import { openWindows, closeWindow } from './window.js';
import { focusWindow, stopViewAnimation } from './window-dock.js';

let savedView = null;
let previousFocus = null;
const transforms = new Map();
const animations = new Map();
const overlay = document.createElement('div');
overlay.className = 'window-overview';
overlay.hidden = true;
overlay.setAttribute('role', 'dialog');
overlay.setAttribute('aria-modal', 'true');
overlay.setAttribute('aria-label', 'Открытые окна');
document.body.appendChild(overlay);

export const isOverviewOpen = () => savedView !== null;

function animateFromRects(rects) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const win of openWindows) {
    const rect = rects.get(win);
    animations.get(win)?.cancel();
    if (!rect || reducedMotion) continue;
    // Express the old screen position in the current canvas coordinates.
    const x = (rect.left - window.innerWidth / 2 - view.x) / view.scale;
    const y = (rect.top - window.innerHeight / 2 - view.y) / view.scale;
    const scale = rect.width / parseFloat(win.style.width) / view.scale;
    const animation = win.animate([
      { transform: `translate(${x}px, ${y}px) scale(${scale})` },
      { transform: win.style.transform },
    ], { duration: 460, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    animations.set(win, animation);
    animation.onfinish = () => animations.delete(win);
  }
}

const windowRects = () => new Map(openWindows.map(win => [win, win.getBoundingClientRect()]));

export function closeOverview() {
  if (!savedView) return;
  const rects = windowRects();
  for (const [win, transform] of transforms) win.style.transform = transform;
  transforms.clear();
  Object.assign(view, savedView);
  savedView = null;
  renderView();
  animateFromRects(rects);
  document.body.classList.remove('show-window-overview');
  overlay.hidden = true;
  previousFocus?.focus();
}

export function toggleOverview() {
  if (savedView) return closeOverview();
  if (!openWindows.length) return;
  stopViewAnimation();
  previousFocus = document.activeElement;
  savedView = { ...view };
  const rects = windowRects();
  document.body.classList.add('show-window-overview');
  overlay.hidden = false;
  layoutOverview();
  animateFromRects(rects);
  overlay.querySelector('button')?.focus();
}

export function layoutOverview() {
  if (!savedView) return;
  if (!openWindows.length) return closeOverview();
  // Pack different window proportions into the shortest available column.
  const width = window.innerWidth;
  const height = window.innerHeight;
  const left = width > 600 ? 250 : 20;
  const availableWidth = Math.max(100, width - left - 24);
  const availableHeight = Math.max(100, height - 120);
  const columns = Math.min(openWindows.length, Math.max(1, Math.round(Math.sqrt(openWindows.length * availableWidth / availableHeight))));
  const gap = 24;
  const tileWidth = (availableWidth - gap * (columns - 1)) / columns;
  const heights = Array(columns).fill(0);
  const tiles = openWindows.map(win => {
    if (!transforms.has(win)) transforms.set(win, win.style.transform);
    const column = heights.indexOf(Math.min(...heights));
    const scale = tileWidth / parseFloat(win.style.width);
    const tileHeight = parseFloat(win.style.height) * scale;
    const tile = { win, x: column * (tileWidth + gap), y: heights[column], scale, height: tileHeight };
    heights[column] += tileHeight + gap;
    return tile;
  });
  const fit = Math.min(1, availableHeight / (Math.max(...heights) - gap));
  const offsetX = left + (availableWidth - availableWidth * fit) / 2;
  overlay.replaceChildren();
  const close = document.createElement('button');
  close.className = 'overview-dismiss';
  close.textContent = 'Вернуться · Esc';
  close.addEventListener('click', closeOverview);
  overlay.appendChild(close);
  for (const tile of tiles) {
    const x = offsetX + tile.x * fit;
    const y = 72 + tile.y * fit;
    tile.win.style.transform = `translate(${(x - width / 2 - view.x) / view.scale}px, ${(y - height / 2 - view.y) / view.scale}px) scale(${tile.scale * fit / view.scale})`;
    const button = document.createElement('button');
    button.className = 'overview-tile';
    button.setAttribute('aria-label', tile.win.querySelector('.os-window-title')?.textContent || 'Окно');
    Object.assign(button.style, { left: `${x}px`, top: `${y}px`, width: `${tileWidth * fit}px`, height: `${tile.height * fit}px` });
    button.addEventListener('click', () => focusWindow(tile.win));
    overlay.appendChild(button);
    const closeButton = document.createElement('button');
    closeButton.className = 'overview-close';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', `Закрыть ${button.getAttribute('aria-label')}`);
    Object.assign(closeButton.style, { left: `${x + tileWidth * fit - 14}px`, top: `${y - 14}px` });
    closeButton.addEventListener('click', () => {
      const rects = windowRects();
      const index = openWindows.indexOf(tile.win);
      animations.get(tile.win)?.cancel();
      animations.delete(tile.win);
      transforms.delete(tile.win);
      closeWindow(tile.win);
      if (!isOverviewOpen()) return;
      animateFromRects(rects);
      const remaining = overlay.querySelectorAll('.overview-close');
      remaining[Math.min(index, remaining.length - 1)]?.focus();
    });
    overlay.appendChild(closeButton);
  }
}

overlay.addEventListener('click', event => {
  if (event.target === overlay) closeOverview();
});
overlay.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.stopPropagation(); closeOverview(); }
  if (event.key !== 'Tab') return;
  const buttons = [...overlay.querySelectorAll('button')];
  const index = buttons.indexOf(document.activeElement);
  event.preventDefault();
  buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
});
window.addEventListener('resize', layoutOverview);
