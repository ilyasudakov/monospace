// Reorder only tab buttons; iframe panels stay mounted to preserve page state.
export function attachTabDrag(win, tabbar) {
  let gesture = null;
  let suppressClick = false;

  tabbar.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const button = event.target.closest('.os-tab');
    if (!button) return;
    suppressClick = false;
    gesture = { button, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dragging: false };
  });

  tabbar.addEventListener('pointermove', event => {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (!gesture.dragging) {
      if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < 6) return;
      gesture.dragging = true;
      tabbar.setPointerCapture(event.pointerId);
      gesture.button.classList.add('is-dragging');
    }
    event.preventDefault();
    const tab = win._tabs.find(tab => tab.button === gesture.button);
    const others = win._tabs.filter(item => item !== tab);
    let index = others.findIndex(item => {
      const rect = item.button.getBoundingClientRect();
      return event.clientX < rect.left + rect.width / 2;
    });
    if (index < 0) index = others.length;
    if (win._tabs.indexOf(tab) === index) return;
    others.splice(index, 0, tab);
    win._tabs = others;
    tabbar.insertBefore(tab.item, others[index + 1]?.item || null);
  });

  function finish(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    suppressClick = gesture.dragging;
    gesture.button.classList.remove('is-dragging');
    if (gesture.dragging) {
      try { tabbar.releasePointerCapture(event.pointerId); } catch {}
    }
    gesture = null;
  }
  tabbar.addEventListener('pointerup', finish);
  tabbar.addEventListener('pointercancel', finish);
  tabbar.addEventListener('lostpointercapture', finish);
  tabbar.addEventListener('click', event => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}
