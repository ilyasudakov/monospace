import { view, MIN_SCALE, MAX_SCALE, homes, live } from './state.js';
import {
  registerSticker,
  renderSticker,
  computeHomeCenter,
} from './stickers.js';
import {
  openWindows,
  closeWindow,
  openPhotoWindow,
  openPageWindow,
} from './window.js';

const viewport = document.getElementById('viewport');
const canvas = document.getElementById('canvas');

function renderView() {
  canvas.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
}

// Register stickers from HTML + wire up variant-specific click handlers
document.querySelectorAll('.sticker').forEach((el) => {
  const pos = {
    x: parseFloat(el.dataset.x) || 0,
    y: parseFloat(el.dataset.y) || 0,
    rot: parseFloat(el.dataset.rot) || 0,
  };
  const opts = {};
  if (el.classList.contains('sticker--photo')) {
    opts.onTap = () => openPhotoWindow(el);
  }
  registerSticker(el, pos, opts);

});

// Any link with [data-window] opens in an OS window instead of navigating.
// Value of data-window (if present) overrides the iframe src; title falls back
// to data-window-title, then the link's text content.
document.querySelectorAll('.canvas a[data-window]').forEach((link) => {
  link.addEventListener('click', (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    if (e.defaultPrevented) return;
    const href = link.getAttribute('href') || '';
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    e.preventDefault();
    const src = link.dataset.window || href;
    const title = link.dataset.windowTitle || link.textContent.trim() || href;
    openPageWindow({ src, title });
  });
});

// Tidy (R key): spring every sticker home + recenter view
function tidyUp() {
  const duration = 700;
  const start = performance.now();
  const from = new Map();
  const allStickers = [];
  homes.forEach((_, el) => {
    from.set(el, { ...live.get(el) });
    el.classList.add('tidying');
    allStickers.push(el);
  });

  const center = computeHomeCenter();
  const viewFrom = { ...view };
  const viewTo = { x: -center.x, y: -center.y, scale: 1 };

  const easeOutBack = (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eBack = easeOutBack(t);
    const eCubic = easeOutCubic(t);

    homes.forEach((h, el) => {
      const f = from.get(el);
      if (!f) return;
      const p = live.get(el);
      p.x = f.x + (h.x - f.x) * eBack;
      p.y = f.y + (h.y - f.y) * eBack;
      p.rot = f.rot + (h.rot - f.rot) * eCubic;
      renderSticker(el);
    });

    view.x = viewFrom.x + (viewTo.x - viewFrom.x) * eCubic;
    view.y = viewFrom.y + (viewTo.y - viewFrom.y) * eCubic;
    view.scale = viewFrom.scale + (viewTo.scale - viewFrom.scale) * eCubic;
    renderView();

    if (t < 1) requestAnimationFrame(tick);
    else allStickers.forEach((el) => el.classList.remove('tidying'));
  }
  requestAnimationFrame(tick);
}

// Keyboard
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea')) return;
  if (e.key === 'Escape' && openWindows.length > 0) {
    closeWindow(openWindows[openWindows.length - 1]);
    return;
  }
  if (e.key === 'r' || e.key === 'R') {
    tidyUp();
  }
});

// Initial centering
const initialCenter = computeHomeCenter();
view.x = -initialCenter.x;
view.y = -initialCenter.y;
renderView();

// Pan
let panning = false;
let panStart = { x: 0, y: 0, vx: 0, vy: 0 };

viewport.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.sticker') || e.target.closest('.os-window')) return;
  panning = true;
  viewport.classList.add('panning');
  panStart = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  viewport.setPointerCapture(e.pointerId);
});
viewport.addEventListener('pointermove', (e) => {
  if (!panning) return;
  view.x = panStart.vx + (e.clientX - panStart.x);
  view.y = panStart.vy + (e.clientY - panStart.y);
  renderView();
});
const endPan = (e) => {
  if (!panning) return;
  panning = false;
  viewport.classList.remove('panning');
  try { viewport.releasePointerCapture(e.pointerId); } catch {}
};
viewport.addEventListener('pointerup', endPan);
viewport.addEventListener('pointercancel', endPan);

// Zoom
viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = viewport.getBoundingClientRect();
  const cx = e.clientX - rect.left - rect.width / 2;
  const cy = e.clientY - rect.top - rect.height / 2;
  const wx = (cx - view.x) / view.scale;
  const wy = (cy - view.y) / view.scale;

  const delta = -e.deltaY * (e.ctrlKey ? 0.01 : 0.0015);
  const factor = Math.exp(delta);
  const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * factor));

  view.scale = next;
  view.x = cx - wx * next;
  view.y = cy - wy * next;
  renderView();
}, { passive: false });

document.addEventListener('gesturestart', (e) => e.preventDefault());
