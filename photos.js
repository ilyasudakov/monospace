// --- Data — add entries here as the archive grows ---
// Each file: { id, type, name, date, tag?, src?, full? }
//   type: 'photo' | 'pdf' | 'audio' | 'doc' | 'link' | 'note' | ...
//   src:  thumbnail (for photos) or null
//   full: high-res / file url — what opens when double-clicked
const FILES = [
  {
    id: 'home',
    type: 'photo',
    name: 'home.jpg',
    tag: 'home',
    date: '2024-08-03',
    src: './assets/img2_sm.jpg',
    full: './assets/img2.jpg',
  },
  {
    id: 'spb',
    type: 'photo',
    name: 'spb.jpg',
    tag: 'spb',
    date: '2025-02-19',
    src: './assets/img1_sm.jpg',
    full: './assets/img1.jpg',
  },
];

const MONTHS_RU = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const fmtDate = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTHS_RU[parseInt(m)-1]} ${y}`;
};

// --- View state ---
let currentFilter = { type: 'all', value: null };
let selectedId = null;
const history = [{ ...currentFilter }];
let historyIdx = 0;

// --- Refs ---
const sidebarEl  = document.getElementById('sidebar');
const gridEl     = document.getElementById('grid');
const crumbsEl   = document.getElementById('crumbs');
const statusEl   = document.getElementById('statusbar');
const backBtn    = document.getElementById('back');
const fwdBtn     = document.getElementById('forward');
const lightbox   = document.getElementById('lightbox');
const lbImg      = document.getElementById('lightbox-img');
const lbCaption  = document.getElementById('lightbox-caption');

// --- Build sidebar ---
function buildSidebar() {
  const years = [...new Set(FILES.map(f => f.date.slice(0, 4)))].sort();
  const tags  = [...new Set(FILES.map(f => f.tag).filter(Boolean))].sort();
  const kinds = [...new Set(FILES.map(f => f.type))].sort();

  const folder = (label, count, filter) => `
    <div class="folder" data-type="${filter.type}" data-value="${filter.value ?? ''}">
      <span class="folder-icon"></span>
      <span class="folder-name">${label}</span>
      <span class="folder-count">${count}</span>
    </div>`;

  const kindLabel = (k) => ({ photo: 'фото', pdf: 'pdf', audio: 'аудио', doc: 'документы', link: 'ссылки', note: 'заметки' }[k] || k);

  sidebarEl.innerHTML = `
    <div class="section">
      <div class="section-title">Всё</div>
      ${folder('Все файлы', FILES.length, { type: 'all', value: null })}
    </div>
    <div class="section">
      <div class="section-title">По типу</div>
      ${kinds.map(k => folder(kindLabel(k), FILES.filter(f => f.type === k).length, { type: 'kind', value: k })).join('')}
    </div>
    <div class="section">
      <div class="section-title">По годам</div>
      ${years.map(y => folder(y, FILES.filter(f => f.date.startsWith(y)).length, { type: 'year', value: y })).join('')}
    </div>
    ${tags.length > 0 ? `
    <div class="section">
      <div class="section-title">Теги</div>
      ${tags.map(t => folder(t, FILES.filter(f => f.tag === t).length, { type: 'tag', value: t })).join('')}
    </div>` : ''}
  `;
  sidebarEl.querySelectorAll('.folder').forEach((el) => {
    el.addEventListener('click', () => {
      const type = el.dataset.type;
      const value = el.dataset.value || null;
      navigateTo({ type, value });
    });
  });
}

// --- Filter ---
function getFiltered() {
  if (currentFilter.type === 'all')  return FILES;
  if (currentFilter.type === 'year') return FILES.filter(f => f.date.startsWith(currentFilter.value));
  if (currentFilter.type === 'tag')  return FILES.filter(f => f.tag === currentFilter.value);
  if (currentFilter.type === 'kind') return FILES.filter(f => f.type === currentFilter.value);
  return FILES;
}

function render() {
  sidebarEl.querySelectorAll('.folder').forEach((el) => {
    const match = el.dataset.type === currentFilter.type && (el.dataset.value || null) === currentFilter.value;
    el.classList.toggle('active', match);
  });

  // Breadcrumbs
  const parts = ['photos'];
  if (currentFilter.type === 'year') parts.push('by year', currentFilter.value);
  if (currentFilter.type === 'tag')  parts.push('tags', currentFilter.value);
  if (currentFilter.type === 'kind') parts.push('kind', currentFilter.value);
  if (currentFilter.type === 'all')  parts.push('all');
  crumbsEl.innerHTML = parts
    .map((p, i) => `<span class="crumb"${i === 0 ? ' data-home="1"' : ''}>${p}</span>`)
    .join('<span class="sep">/</span>');
  crumbsEl.querySelectorAll('.crumb').forEach((el) => {
    if (el.dataset.home) {
      el.addEventListener('click', () => navigateTo({ type: 'all', value: null }));
    }
  });

  // Grid
  const items = getFiltered();
  if (items.length === 0) {
    gridEl.innerHTML = '<div class="empty">Пусто в этой папке</div>';
  } else {
    gridEl.innerHTML = items.map(f => `
      <div class="item" data-id="${f.id}">
        <img class="item-thumb" src="${f.src}" alt="" draggable="false" />
        <div class="item-name">${f.name}</div>
        <div class="item-meta">${fmtDate(f.date)}</div>
      </div>
    `).join('');
    gridEl.querySelectorAll('.item').forEach((el) => {
      el.addEventListener('click', () => {
        selectedId = el.dataset.id;
        renderSelection();
        renderStatus();
      });
      el.addEventListener('dblclick', () => openLightbox(el.dataset.id));
    });
  }
  renderSelection();
  renderStatus();
  renderNavButtons();
}

function renderSelection() {
  gridEl.querySelectorAll('.item').forEach((el) => {
    el.classList.toggle('selected', el.dataset.id === selectedId);
  });
}

function renderStatus() {
  const items = getFiltered();
  const selected = items.find(f => f.id === selectedId);
  const parts = [`${items.length} ${declension(items.length, ['элемент', 'элемента', 'элементов'])}`];
  if (selected) parts.push('Выбрано: ' + selected.name + ' · ' + fmtDate(selected.date));
  statusEl.innerHTML = parts
    .map((p, i) => i === 0 ? `<span>${p}</span>` : `<span class="sep-v"></span><span>${p}</span>`)
    .join('');
}

function renderNavButtons() {
  backBtn.disabled = historyIdx <= 0;
  fwdBtn.disabled  = historyIdx >= history.length - 1;
}

function declension(n, forms) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}

function navigateTo(filter, { push = true } = {}) {
  currentFilter = { ...filter };
  if (push) {
    history.splice(historyIdx + 1);
    history.push({ ...currentFilter });
    historyIdx = history.length - 1;
  }
  selectedId = null;
  render();
}

backBtn.addEventListener('click', () => {
  if (historyIdx <= 0) return;
  historyIdx -= 1;
  navigateTo(history[historyIdx], { push: false });
});
fwdBtn.addEventListener('click', () => {
  if (historyIdx >= history.length - 1) return;
  historyIdx += 1;
  navigateTo(history[historyIdx], { push: false });
});

// --- Lightbox ---
function openLightbox(id) {
  const f = FILES.find(x => x.id === id);
  if (!f) return;
  lbImg.src = f.full;
  const extras = [fmtDate(f.date), f.tag].filter(Boolean).join(' · ');
  lbCaption.textContent = `${f.name} · ${extras}`;
  lightbox.classList.add('open');
}
function closeLightbox() { lightbox.classList.remove('open'); }

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
  if (e.key === 'Enter' && selectedId && !lightbox.classList.contains('open')) openLightbox(selectedId);
});

// --- Init ---
buildSidebar();
render();
