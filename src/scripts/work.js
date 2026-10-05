import { filterUpdates } from './work-filter.js';

const sections = [...document.querySelectorAll('[data-company]')];
const companyLinks = [...document.querySelectorAll('[data-company-link]')];
const PAGE_SIZE = 30;

function selectCompany() {
  const id = location.hash.slice(1);
  const active = sections.find((section) => section.dataset.company === id) || sections[0];
  sections.forEach((section) => { section.hidden = section !== active; });
  companyLinks.forEach((link) => {
    const selected = link.dataset.companyLink === active?.dataset.company;
    if (selected) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

sections.forEach((section) => {
  const controls = section.querySelector('[data-controls]');
  const search = section.querySelector('[data-search]');
  const year = section.querySelector('[data-year]');
  const roleButtons = [...section.querySelectorAll('.role-filters button')];
  const updates = [...section.querySelectorAll('[data-update]')];
  const entries = updates.map((element) => ({
    element,
    role: element.dataset.role,
    year: element.dataset.year,
    text: element.querySelector('.update-content').textContent,
  }));
  const groups = [...section.querySelectorAll('[data-year-group]')];
  const more = section.querySelector('[data-load-more]');
  const noResults = section.querySelector('[data-no-results]');
  let role = 'all';
  let limit = PAGE_SIZE;

  function render() {
    const matches = filterUpdates(entries, { role, year: year.value, query: search.value });
    const visible = new Set(matches.slice(0, limit).map((entry) => entry.element));
    updates.forEach((item) => { item.hidden = !visible.has(item); });
    groups.forEach((group) => {
      group.hidden = ![...group.querySelectorAll('[data-update]')].some((item) => !item.hidden);
    });
    section.querySelector('[data-result-count]').textContent = String(matches.length);
    section.querySelector('[data-result-note]').hidden = !search.value.trim() && year.value === 'all';
    noResults.hidden = updates.length === 0 || matches.length > 0;
    more.hidden = matches.length <= limit;
    section.querySelector('[data-remaining]').textContent = String(Math.min(PAGE_SIZE, Math.max(0, matches.length - limit)));
    roleButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.role === role)));
  }

  function filter() { limit = PAGE_SIZE; render(); }
  roleButtons.forEach((button) => button.addEventListener('click', () => {
    role = button.dataset.role;
    filter();
  }));
  search.addEventListener('input', filter);
  year.addEventListener('change', filter);
  section.querySelector('[data-reset]').addEventListener('click', () => {
    role = 'all'; search.value = ''; year.value = 'all'; filter();
  });
  more.addEventListener('click', () => {
    limit += PAGE_SIZE;
    render();
  });
  controls.hidden = false;
  render();
});

selectCompany();
window.addEventListener('hashchange', selectCompany);
