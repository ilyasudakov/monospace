const overview = document.querySelector('[data-portfolio-overview]');
const header = document.querySelector('[data-portfolio-header]');
const back = document.querySelector('[data-portfolio-back]');
const details = [...document.querySelectorAll('[data-project-detail]')];

function renderProject(focus = false) {
  const id = location.hash.slice(1);
  const active = details.find(section => section.id === id);
  overview.hidden = Boolean(active);
  header.hidden = Boolean(active);
  back.hidden = !active;
  details.forEach(section => { section.hidden = section !== active; });
  const personal = document.querySelector('.personal-projects');
  if (personal) personal.hidden = !active?.classList.contains('personal-project');
  if (focus) {
    window.scrollTo(0, 0);
    const target = active?.querySelector('h2, h3') || document.querySelector(`[data-portfolio-card="${lastProject}"]`);
    if (target) {
      if (!target.matches('a')) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  }
  if (active) lastProject = active.id;
}

let lastProject = '';
window.addEventListener('hashchange', () => renderProject(true));
renderProject();
