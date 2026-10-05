// Generic windowing system. Windows live on the canvas — pan/zoom affects them,
// drag/resize math uses view.scale.
//
// openWindow({ title, body, footer, variant, path, width, height }) → element
//   body:    string (HTML) or HTMLElement
//   footer:  string | { left, right } | HTMLElement | null
//   variant: 'photo' | 'page' | undefined
//   path:    optional string for the address bar

import { view, homes } from './state.js';
import { renderDock, animateView } from './window-dock.js';
import { toggleOverview } from './window-overview.js';

const MAX_SIZE = 1000;

export const openWindows = [];
let windowZ = 1000;
let homeView = null;

export function placeBesideCanvas(win) {
  if (window.innerWidth < 900 || !homes.size) return false;
  document.body.classList.add('has-side-window');
  const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  homes.forEach((position, element) => {
    bounds.left = Math.min(bounds.left, position.x);
    bounds.top = Math.min(bounds.top, position.y);
    bounds.right = Math.max(bounds.right, position.x + element.offsetWidth);
    bounds.bottom = Math.max(bounds.bottom, position.y + element.offsetHeight);
  });
  const gap = 32;
  const margin = 28;
  const leftWidth = Math.min(500, window.innerWidth * .4);
  const scale = Math.min(1, (leftWidth - margin * 2) / (bounds.right - bounds.left), (window.innerHeight - 140) / (bounds.bottom - bounds.top));
  const target = {
    x: leftWidth / 2 - window.innerWidth / 2 - (bounds.left + bounds.right) / 2 * scale,
    y: -(bounds.top + bounds.bottom) / 2 * scale,
    scale,
  };
  const width = Math.min(win._preferredSize.width, (window.innerWidth - leftWidth - gap - margin) / scale);
  const height = Math.min(win._preferredSize.height, (window.innerHeight - 112) / scale);
  win.style.width = `${width}px`;
  win.style.height = `${height}px`;
  setWindowPos(win,
    (leftWidth + gap - window.innerWidth / 2 - target.x) / scale,
    (-height * scale / 2 - target.y + 16) / scale,
  );
  animateView(target);
  return true;
}

export function bringToFront(win) {
  win.style.zIndex = String(++windowZ);
}

const canvasEl = document.getElementById('canvas');
let pageWindow = null;
let tabSequence = 0;

// --- Core ---
export function openWindow({ title = '', body = '', footer = null, variant, path = null, width = 520, height = 420 } = {}) {
  const win = document.createElement('div');
  win.className = 'os-window' + (variant ? ` os-window--${variant}` : '');
  win.style.width = `${width}px`;
  win.style.height = `${height}px`;
  win._preferredSize = { width, height };
  if (!openWindows.length) homeView = { ...view };

  // Titlebar
  const titlebar = document.createElement('div');
  titlebar.className = 'os-window-titlebar';
  titlebar.innerHTML = `
    <div class="os-window-title"></div>
    <div class="os-window-controls">
      <button class="os-win-btn os-win-btn--overview" aria-label="Обзор открытых окон" title="Обзор открытых окон">▦</button>
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

  const beside = placeBesideCanvas(win);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  win.animate([
    { opacity: 0, transform: `${win.style.transform} translateX(${beside ? 24 : 0}px)` },
    { opacity: 1, transform: win.style.transform },
  ], { duration: reducedMotion ? 0 : 460, easing: 'cubic-bezier(.22, 1, .36, 1)' });

  // Close button
  titlebar.querySelector('.os-win-btn--overview').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleOverview();
  });
  titlebar.querySelector('.os-win-btn--close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeWindow(win);
  });

  // Bring to front on any interaction
  win.addEventListener('pointerdown', () => {
    bringToFront(win);
  });

  attachWindowDrag(win, titlebar);
  attachResize(win);

  renderDock();
  return win;
}

export function closeWindow(win) {
  if (win === pageWindow) pageWindow = null;
  win.remove();
  const i = openWindows.indexOf(win);
  if (i !== -1) openWindows.splice(i, 1);
  renderDock();
  if (!openWindows.length && homeView) {
    document.body.classList.remove('has-side-window');
    animateView(homeView);
    homeView = null;
  }
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
    if (e.target.closest('button')) return;
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
  const MIN_W = 320;
  const MIN_H = 140;
  const dirs = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];

  for (const dir of dirs) {
    const handle = document.createElement('div');
    handle.className = `os-window-resizer os-window-resizer--${dir}`;
    win.appendChild(handle);

    let resizing = false;
    let startPtr = { x: 0, y: 0 };
    let startSize = { w: 0, h: 0 };
    let startPos = { x: 0, y: 0 };

    handle.addEventListener('pointerdown', (e) => {
      resizing = true;
      startPtr = { x: e.clientX, y: e.clientY };
      startSize = { w: parseFloat(win.style.width), h: parseFloat(win.style.height) };
      startPos = { ...win._pos };
      handle.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });
    handle.addEventListener('pointermove', (e) => {
      if (!resizing) return;
      const dx = (e.clientX - startPtr.x) / view.scale;
      const dy = (e.clientY - startPtr.y) / view.scale;

      let w = startSize.w;
      let h = startSize.h;
      let px = startPos.x;
      let py = startPos.y;

      if (dir.includes('e')) w = Math.max(MIN_W, startSize.w + dx);
      if (dir.includes('w')) {
        w = Math.max(MIN_W, startSize.w - dx);
        px = startPos.x + (startSize.w - w);
      }
      if (dir.includes('s')) h = Math.max(MIN_H, startSize.h + dy);
      if (dir.includes('n')) {
        h = Math.max(MIN_H, startSize.h - dy);
        py = startPos.y + (startSize.h - h);
      }

      win.style.width = `${w}px`;
      win.style.height = `${h}px`;
      setWindowPos(win, px, py);
    });
    const end = (e) => {
      if (!resizing) return;
      resizing = false;
      try { handle.releasePointerCapture(e.pointerId); } catch {}
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }
}

// --- Specialised helpers ---

export function openPageWindow({ src, title }) {
  const key = new URL(src, location.href).pathname;
  if (pageWindow?.isConnected) {
    const tab = pageWindow._tabs.find(tab => tab.key === key);
    if (tab) {
      if (!tab.frame.hasAttribute('src')) tab.src = src;
      pageWindow._selectTab(tab);
      const hash = new URL(src, location.href).hash;
      if (hash) {
        const navigateToSection = () => {
          try { tab.frame.contentWindow.location.hash = hash; } catch {}
        };
        try {
          if (tab.frame.contentWindow.location.pathname === key) navigateToSection();
          else tab.frame.addEventListener('load', navigateToSection, { once: true });
        } catch {}
      }
      bringToFront(pageWindow);
      placeBesideCanvas(pageWindow);
      return pageWindow;
    }
  }
  if (!pageWindow?.isConnected) {
    const panels = document.createElement('div');
    panels.className = 'os-tab-panels';
    pageWindow = openWindow({ title: title || src, variant: 'page', body: panels, width: MAX_SIZE, height: Math.round(MAX_SIZE * .75) });
    const win = pageWindow;
    const tabbar = document.createElement('div');
    tabbar.className = 'os-tabbar';
    tabbar.setAttribute('role', 'tablist');
    tabbar.setAttribute('aria-label', 'Разделы сайта');
    win.querySelector('.os-window-controls').before(tabbar);
    win._tabs = [];
    win._selectTab = active => {
      win._tabs.forEach(tab => {
        const selected = tab === active;
        tab.button.setAttribute('aria-selected', String(selected));
        tab.button.tabIndex = selected ? 0 : -1;
        tab.panel.hidden = !selected;
        if (selected && !tab.frame.hasAttribute('src')) tab.frame.src = tab.src;
      });
      win.querySelector('.os-window-title').textContent = active.button.textContent;
      renderDock();
    };
    win._addTab = (tabSrc, tabTitle) => {
      const tabKey = new URL(tabSrc, location.href).pathname;
      const existing = win._tabs.find(tab => tab.key === tabKey);
      if (existing) return existing;
      const id = ++tabSequence;
      const button = document.createElement('button');
      button.className = 'os-tab';
      button.type = 'button';
      button.id = `window-tab-${id}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', `window-panel-${id}`);
      button.textContent = tabTitle;
      const panel = document.createElement('div');
      panel.className = 'os-tab-panel';
      panel.id = `window-panel-${id}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id);
      panel.hidden = true;
      const frame = document.createElement('iframe');
      frame.title = tabTitle;
      panel.appendChild(frame);
      panels.appendChild(panel);
      tabbar.appendChild(button);
      const tab = { key: tabKey, src: tabSrc, button, panel, frame };
      win._tabs.push(tab);
      button.addEventListener('click', () => win._selectTab(tab));
      button.addEventListener('keydown', event => {
        const index = win._tabs.indexOf(tab);
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % win._tabs.length;
        if (event.key === 'ArrowLeft') next = (index - 1 + win._tabs.length) % win._tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = win._tabs.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        event.stopPropagation();
        win._selectTab(win._tabs[next]);
        win._tabs[next].button.focus();
      });
      return tab;
    };
    ['.chip--work', '.chip--cv'].map(selector => document.querySelector(selector)).filter(Boolean).forEach(link => {
      win._addTab(link.dataset.window, link.dataset.windowTitle);
    });
  }
  const tab = pageWindow._addTab(src, title || src);
  pageWindow._selectTab(tab);
  bringToFront(pageWindow);
  placeBesideCanvas(pageWindow);
  return pageWindow;
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
