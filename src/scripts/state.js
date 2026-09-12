// Shared mutable state across modules.
export const view = { x: 0, y: 0, scale: 1 };
export const MIN_SCALE = 0.4;
export const MAX_SCALE = 2.2;

export const homes = new Map();  // el -> { x, y, rot }
export const live  = new Map();  // el -> { x, y, rot }

export const zRef = { value: 100 };  // boxed so mutations propagate

// canvas element + render — shared so other modules can drive view changes.
let canvasEl = null;
export function bindCanvas(el) { canvasEl = el; }
export function renderView() {
  if (!canvasEl) return;
  canvasEl.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
}
