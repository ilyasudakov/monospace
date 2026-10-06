import { view, homeView, viewMotion, MIN_SCALE, MAX_SCALE, homes, live, bindCanvas, renderView } from './state.js';
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
  resetWindowLayout,
} from './window.js';
import { isOverviewOpen, closeOverview } from './window-overview.js';
import './language.js';
import { setupPageRoutes } from './page-route.js';

const viewport = document.getElementById('viewport');
const canvas = document.getElementById('canvas');
bindCanvas(canvas);

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
  if (el.matches('[data-links-menu]')) {
    const summary = el.querySelector('summary');
    opts.dragHandle = summary;
    opts.onTap = () => { el.open = !el.open; };
    summary.addEventListener('click', event => {
      if (window.matchMedia('(max-width: 640px)').matches) return;
      event.preventDefault();
      if (event.detail === 0) el.open = !el.open;
    });
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

// Embedded pages reuse this window's tabs.
window.addEventListener('open-page-tab', event => {
  const { src, title } = event.detail || {};
  if (src) openPageWindow({ src, title });
});

// Tidy (R key): spring every sticker home + recenter view
function arrangeHomeNotes() {
  const paper = document.querySelector('.sticker--paper');
  const paperHome = homes.get(paper);
  if (!paperHome) return;
  document.querySelectorAll('.sticker--note').forEach((note) => {
    const home = homes.get(note);
    const position = live.get(note);
    const atHome = position.x === home.x && position.y === home.y;
    home.y = paperHome.y + paper.offsetHeight + 22;
    if (atHome) {
      position.y = home.y;
      renderSticker(note);
    }
  });
}
arrangeHomeNotes();
window.addEventListener('languagechange', arrangeHomeNotes);

let tidyFrame = null;
function tidyUp() {
  if (isOverviewOpen()) closeOverview();
  if (tidyFrame !== null) cancelAnimationFrame(tidyFrame);
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 700;
  const start = performance.now();
  const from = new Map();
  const allStickers = [];
  homes.forEach((_, el) => {
    from.set(el, { ...live.get(el) });
    el.classList.add('tidying');
    allStickers.push(el);
  });

  const center = computeHomeCenter();
  const scale = Math.min(1, (window.innerWidth - 48) / 460,
    (window.innerHeight - 100) / (document.querySelector('.sticker--paper').offsetHeight + 120));
  resetWindowLayout({ x: -center.x * scale, y: -center.y * scale, scale });

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

    if (t < 1) tidyFrame = requestAnimationFrame(tick);
    else {
      tidyFrame = null;
      allStickers.forEach((el) => el.classList.remove('tidying'));
    }
  }
  tidyFrame = requestAnimationFrame(tick);
}
document.querySelector('[data-view-reset]')?.addEventListener('click', tidyUp);

// Keyboard
window.addEventListener('keydown', (e) => {
  if (isOverviewOpen()) {
    if (e.key === 'Escape') { e.preventDefault(); closeOverview(); }
    return;
  }
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
const initialWidth = 460;
const paper = document.querySelector('.sticker--paper');
const initialHeight = paper.offsetHeight + 120;
view.scale = Math.min(1, (window.innerWidth - 48) / initialWidth, (window.innerHeight - 100) / initialHeight);
view.x = -initialCenter.x * view.scale;
view.y = -initialCenter.y * view.scale;
Object.assign(homeView, view);
renderView();

const resetButton = document.querySelector('[data-view-reset]');
function updateResetControl() {
  if (!resetButton) return;
  const moved = [...homes].some(([element, home]) => {
    const position = live.get(element);
    return Math.abs(position.x - home.x) > .5 || Math.abs(position.y - home.y) > .5
      || Math.abs(position.rot - home.rot) > .1;
  });
  const changedView = Math.abs(view.x - homeView.x) > .5 || Math.abs(view.y - homeView.y) > .5
    || Math.abs(view.scale - homeView.scale) > .001;
  resetButton.hidden = !moved && (!changedView || viewMotion.active);
}
window.addEventListener('canvaschange', updateResetControl);
updateResetControl();

// Open shared links only after the stickers and initial view are positioned.
setupPageRoutes();

// Pan + pinch-zoom (multi-touch aware)
const pointers = new Map();   // pointerId -> { x, y }
let panning = false;
let panStart = null;
let pinching = false;
let pinchStart = null;

function viewportCenterCoords(clientX, clientY) {
  const rect = viewport.getBoundingClientRect();
  return {
    x: clientX - rect.left - rect.width / 2,
    y: clientY - rect.top - rect.height / 2,
  };
}

viewport.addEventListener('pointerdown', (e) => {
  if (window.matchMedia('(max-width: 640px)').matches) return;
  if (isOverviewOpen()) return;
  if (e.target.closest('.sticker') || e.target.closest('.os-window')) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pointers.size === 1) {
    panning = true;
    viewport.classList.add('panning');
    panStart = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  } else if (pointers.size === 2) {
    // Enter pinch — cancel pan
    panning = false;
    pinching = true;
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const midClientX = (a.x + b.x) / 2;
    const midClientY = (a.y + b.y) / 2;
    const mid = viewportCenterCoords(midClientX, midClientY);
    pinchStart = {
      dist,
      vs: view.scale,
      // world-space point under the initial midpoint (stays anchored)
      wx: (mid.x - view.x) / view.scale,
      wy: (mid.y - view.y) / view.scale,
    };
  }
});

viewport.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pinching && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const mid = viewportCenterCoords((a.x + b.x) / 2, (a.y + b.y) / 2);

    let next = pinchStart.vs * (dist / pinchStart.dist);
    next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    view.scale = next;
    view.x = mid.x - pinchStart.wx * next;
    view.y = mid.y - pinchStart.wy * next;
    renderView();
  } else if (panning && pointers.size === 1) {
    view.x = panStart.vx + (e.clientX - panStart.x);
    view.y = panStart.vy + (e.clientY - panStart.y);
    renderView();
  }
});

function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);

  if (pinching && pointers.size < 2) {
    pinching = false;
    // If one finger is still down, resume pan from its current position
    if (pointers.size === 1) {
      const [remaining] = [...pointers.values()];
      panning = true;
      panStart = { x: remaining.x, y: remaining.y, vx: view.x, vy: view.y };
    }
  }
  if (pointers.size === 0) {
    panning = false;
    viewport.classList.remove('panning');
  }
}
viewport.addEventListener('pointerup', endPointer);
viewport.addEventListener('pointercancel', endPointer);

// Zoom
viewport.addEventListener('wheel', (e) => {
  if (window.matchMedia('(max-width: 640px)').matches) return;
  if (isOverviewOpen()) { e.preventDefault(); return; }
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

document.addEventListener('gesturestart', (e) => {
  if (!window.matchMedia('(max-width: 640px)').matches) e.preventDefault();
});
