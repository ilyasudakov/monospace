// Shared mutable state across modules.
export const view = { x: 0, y: 0, scale: 1 };
export const MIN_SCALE = 0.4;
export const MAX_SCALE = 2.2;

export const homes = new Map();  // el -> { x, y, rot }
export const live  = new Map();  // el -> { x, y, rot }

export const zRef = { value: 100 };  // boxed so mutations propagate
