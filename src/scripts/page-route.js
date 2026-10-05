import { openPageWindow, closeWindow, openWindows } from './window.js';

export function setupPageRoutes() {
  const pages = new Map([
    ['portfolio', document.querySelector('.chip--work')],
    ['resume', document.querySelector('.chip--cv')],
  ]);

  function openFromUrl() {
    const url = new URL(location.href);
    const [page, ...sectionParts] = url.hash.slice(1).split('/');
    const link = pages.get(page) || pages.get(url.searchParams.get('page'));
    if (link) {
      const section = pages.has(page) ? sectionParts.join('/') : url.hash.slice(1);
      openPageWindow({ src: `${link.dataset.window}${section ? `#${section}` : ''}`, title: link.dataset.windowTitle });
    } else if (!url.hash && !url.searchParams.has('page')) {
      openWindows.filter(win => win.classList.contains('os-window--page')).forEach(closeWindow);
    }
  }

  window.addEventListener('page-tab-change', event => {
    const url = new URL(location.href);
    const src = event.detail.src && new URL(event.detail.src, location.href);
    const page = src && [...pages].find(([, link]) => new URL(link.dataset.window, location.href).pathname === src.pathname)?.[0];
    url.searchParams.delete('page');
    url.hash = page ? `${page}${src.hash ? `/${src.hash.slice(1)}` : ''}` : '';
    if (url.href !== location.href) history.replaceState(history.state, '', url);
  });
  window.addEventListener('hashchange', openFromUrl);
  openFromUrl();
}
