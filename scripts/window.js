// Generic windowing system. Windows live on the canvas — pan/zoom affects them,
// drag/resize math uses view.scale.
//
// openWindow({ title, body, footer, variant, path, width, height }) → element
//   body:    string (HTML) or HTMLElement
//   footer:  string | { left, right } | HTMLElement | null
//   variant: 'photo' | 'page' | undefined
//   path:    optional string for the address bar

import { view, MAX_SCALE, renderView } from './state.js';

const MAX_SIZE = 1000;

export const openWindows = [];
let windowZ = 1000;

const canvasEl = document.getElementById('canvas');

// --- Dock (mini UI listing open windows) ---
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

function focusWindow(win) {
  // Bring to front
  windowZ += 1;
  win.style.zIndex = String(windowZ);

  // Brief highlight pulse
  win.animate(
    [{ filter: 'brightness(1.18)' }, { filter: 'brightness(1)' }],
    { duration: 320, easing: 'ease-out' }
  );

  // Zoom canvas so the window centers in viewport with margin
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

function renderDock() {
  dockEl.innerHTML = openWindows.map((win, i) => {
    const title = win.querySelector('.os-window-title')?.textContent || '—';
    const variantClass = [...win.classList].find((c) => c.startsWith('os-window--'));
    const variant = variantClass ? variantClass.slice('os-window--'.length) : 'default';
    return `<div class="dock-item" data-idx="${i}" title="${escapeHtml(title)}">
      <span class="dock-dot dock-dot--${variant}"></span>
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

}

// --- Core ---
export function openWindow({ title = '', body = '', footer = null, variant, path = null, width = 520, height = 420 } = {}) {
  const win = document.createElement('div');
  win.className = 'os-window' + (variant ? ` os-window--${variant}` : '');
  win.style.width = `${width}px`;
  win.style.height = `${height}px`;

  // Titlebar
  const titlebar = document.createElement('div');
  titlebar.className = 'os-window-titlebar';
  titlebar.innerHTML = `
    <div class="os-window-title"></div>
    <div class="os-window-controls">
      <button class="os-win-btn os-win-btn--close" aria-label="close"></button>
    </div>
  `;
  titlebar.querySelector('.os-window-title').textContent = title;
  win.appendChild(titlebar);

  // Address bar (optional)
  if (path) {
    const addr = document.createElement('div');
    addr.className = 'os-window-addressbar';
    addr.innerHTML = '<span class="os-address-text"></span>';
    addr.querySelector('.os-address-text').textContent = path;
    win.appendChild(addr);
  }

  // Body
  const bodyEl = document.createElement('div');
  bodyEl.className = 'os-window-body';
  if (body instanceof HTMLElement) bodyEl.appendChild(body);
  else bodyEl.innerHTML = String(body);
  win.appendChild(bodyEl);

  // Footer
  if (footer) {
    const footerEl = document.createElement('div');
    footerEl.className = 'os-window-footer';
    if (footer instanceof HTMLElement) {
      footerEl.appendChild(footer);
    } else if (typeof footer === 'object' && (footer.left !== undefined || footer.right !== undefined)) {
      footerEl.innerHTML = `<span>${footer.left ?? ''}</span><span>${footer.right ?? ''}</span>`;
    } else {
      footerEl.textContent = String(footer);
    }
    win.appendChild(footerEl);
  }

  // Mount into canvas (so pan/zoom affects the window too)
  canvasEl.appendChild(win);
  windowZ += 1;
  win.style.zIndex = String(windowZ);
  openWindows.push(win);

  // Initial canvas-space position: center of current viewport,
  // offset slightly per stacked window.
  const idx = openWindows.length - 1;
  const viewportCenterInCanvas = {
    x: -view.x / view.scale,
    y: -view.y / view.scale,
  };
  const startX = viewportCenterInCanvas.x - width / 2 + idx * 24;
  const startY = viewportCenterInCanvas.y - height / 2 + idx * 24 - 40;
  setWindowPos(win, startX, startY);

  win.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 80, easing: 'linear' });

  // Close button
  titlebar.querySelector('.os-win-btn--close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeWindow(win);
  });

  // Bring to front on any interaction
  win.addEventListener('pointerdown', () => {
    windowZ += 1;
    win.style.zIndex = String(windowZ);
  });

  attachWindowDrag(win, titlebar);
  attachResize(win);

  renderDock();
  return win;
}

export function closeWindow(win) {
  win.remove();
  const i = openWindows.indexOf(win);
  if (i !== -1) openWindows.splice(i, 1);
  renderDock();
}

function setWindowPos(win, x, y) {
  win._pos = { x, y };
  win.style.transform = `translate(${x}px, ${y}px)`;
}

function attachWindowDrag(win, handle) {
  let dragging = false;
  let startPtr = { x: 0, y: 0 };
  let startPos = { x: 0, y: 0 };

  handle.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.os-win-btn')) return;
    dragging = true;
    startPtr = { x: e.clientX, y: e.clientY };
    startPos = { ...win._pos };
    handle.classList.add('dragging');
    handle.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = (e.clientX - startPtr.x) / view.scale;
    const dy = (e.clientY - startPtr.y) / view.scale;
    setWindowPos(win, startPos.x + dx, startPos.y + dy);
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    try { handle.releasePointerCapture(e.pointerId); } catch {}
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

function attachResize(win) {
  const handle = document.createElement('div');
  handle.className = 'os-window-resizer';
  win.appendChild(handle);

  let resizing = false;
  let startPtr = { x: 0, y: 0 };
  let startSize = { w: 0, h: 0 };

  handle.addEventListener('pointerdown', (e) => {
    resizing = true;
    startPtr = { x: e.clientX, y: e.clientY };
    startSize = { w: parseFloat(win.style.width), h: parseFloat(win.style.height) };
    handle.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });
  handle.addEventListener('pointermove', (e) => {
    if (!resizing) return;
    const dw = (e.clientX - startPtr.x) / view.scale;
    const dh = (e.clientY - startPtr.y) / view.scale;
    const w = Math.max(320, startSize.w + dw);
    const h = Math.max(140, startSize.h + dh);
    win.style.width = `${w}px`;
    win.style.height = `${h}px`;
  });
  const end = (e) => {
    if (!resizing) return;
    resizing = false;
    try { handle.releasePointerCapture(e.pointerId); } catch {}
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

// --- Specialised helpers ---

export function openPageWindow({ src, title }) {
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.loading = 'lazy';
  openWindow({
    title: title || src,
    variant: 'page',
    body: iframe,
    path: src,
    width: MAX_SIZE,
    height: Math.round(MAX_SIZE * 0.75),
  });
}

export function openPhotoWindow(photoEl) {
  const src = photoEl.dataset.full || photoEl.querySelector('img')?.src;
  if (!src) return;
  const caption = photoEl.querySelector('.photo-label')?.textContent?.trim() || '';
  const filename = src.split('/').pop();
  const title = photoEl.dataset.title || caption || filename;

  const img = new Image();
  const mount = (w, h) => {
    const bodyImg = document.createElement('img');
    bodyImg.src = src;
    bodyImg.alt = '';

    // Fit image into MAX_SIZE × (MAX_SIZE * 0.75), preserving aspect ratio
    const maxW = MAX_SIZE;
    const maxH = Math.round(MAX_SIZE * 0.75) - 60;   // reserve ~60px for titlebar + addressbar + footer
    let winW = 640, winH = 480;
    if (w && h) {
      const ratio = Math.min(1, maxW / w, maxH / h);
      winW = Math.round(w * ratio) + 10;
      winH = Math.round(h * ratio) + 60;
    }

    openWindow({
      title,
      variant: 'photo',
      body: bodyImg,
      path: src,
      footer: { left: filename, right: w && h ? `${w} × ${h}` : '' },
      width: winW,
      height: winH,
    });
  };
  img.onload = () => mount(img.naturalWidth, img.naturalHeight);
  img.onerror = () => mount();
  img.src = src;
}
