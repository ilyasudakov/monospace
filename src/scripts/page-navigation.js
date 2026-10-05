import { translate } from './language.js';

const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
const pages = new Map([
  [`${base}cv/`, 'Резюме'],
  [`${base}work/`, 'Портфолио'],
]);

// Embedded pages share the parent window's tabs rather than navigating their iframe.
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (window.parent === window) return;
  const link = event.target.closest('a[href]');
  if (!link || link.target === '_blank') return;
  const url = new URL(link.href, location.href);
  const title = pages.get(url.pathname);
  if (url.origin !== location.origin || !title) return;
  try {
    if (!window.parent.document.getElementById('canvas')) return;
    window.parent.dispatchEvent(new CustomEvent('open-page-tab', {
      detail: { src: `${url.pathname}${url.search}${url.hash}`, title: translate(title) },
    }));
    event.preventDefault();
  } catch {
    // Normal navigation remains available outside this site's canvas.
  }
});
