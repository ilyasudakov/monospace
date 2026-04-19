import { view, homes, live, zRef } from './state.js';


export function renderSticker(el) {
  const p = live.get(el);
  el.style.setProperty('--sx', `${p.x}px`);
  el.style.setProperty('--sy', `${p.y}px`);
  el.style.setProperty('--srot', `${p.rot}deg`);
}

export function attachDrag(el, { onTap, onDragEnd } = {}) {
  let dragging = false;
  let moved = false;
  let startPtr = { x: 0, y: 0 };
  let startPos = { x: 0, y: 0 };

  el.addEventListener('pointerdown', (e) => {
    // Let nested interactive elements (links, buttons) handle their own clicks
    const interactive = e.target.closest('a[href], button, iframe, input, textarea, select');
    if (interactive && interactive !== el) return;

    zRef.value += 1;
    el.style.zIndex = String(zRef.value);

    dragging = true;
    moved = false;
    startPtr = { x: e.clientX, y: e.clientY };
    const p = live.get(el);
    startPos = { x: p.x, y: p.y };
    el.classList.add('dragging');
    el.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });

  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = (e.clientX - startPtr.x) / view.scale;
    const dy = (e.clientY - startPtr.y) / view.scale;
    if (!moved && Math.hypot(e.clientX - startPtr.x, e.clientY - startPtr.y) > 4) moved = true;
    const p = live.get(el);
    p.x = startPos.x + dx;
    p.y = startPos.y + dy;
    renderSticker(el);
  });

  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('dragging');
    try { el.releasePointerCapture(e.pointerId); } catch {}
    if (moved) {
      onDragEnd?.();
      if (el.tagName === 'A') {
        const blockClick = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          el.removeEventListener('click', blockClick, true);
        };
        el.addEventListener('click', blockClick, true);
      }
    } else {
      onTap?.(e);
    }
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

export function registerSticker(el, pos, opts = {}) {
  homes.set(el, { ...pos });
  live.set(el, { ...pos });
  zRef.value += 1;
  el.style.zIndex = String(zRef.value);
  renderSticker(el);
  attachDrag(el, opts);
}

export function computeHomeCenter() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  homes.forEach((h, el) => {
    const w = el.offsetWidth || 0;
    const hg = el.offsetHeight || 0;
    if (h.x < minX) minX = h.x;
    if (h.y < minY) minY = h.y;
    if (h.x + w > maxX) maxX = h.x + w;
    if (h.y + hg > maxY) maxY = h.y + hg;
  });
  if (!isFinite(minX)) return { x: 0, y: 0 };
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}
