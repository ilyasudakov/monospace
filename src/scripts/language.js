const translations = {
  'Привет, меня зовут': 'Hi, I’m', 'Илья': 'Ilya', 'Илья Судаков': 'Ilya Sudakov',
  'Продакт-инженер в': 'Product engineer at',
  ', из Санкт-Петербурга. Люблю решать сложные задачи и делать полезные продукты end-to-end: дизайн, код, поддержка.': ', based in Saint Petersburg. I enjoy solving complex problems and building useful products end to end: design, code, and support.',
  'Пишу музыку, делаю фото.': 'I make music and take photos.',
  'Можно связаться со мной': 'You can reach me', 'по почте': 'by email', 'или в': 'or on',
  'резюме': 'résumé', 'портфолио': 'portfolio', 'фото архив': 'photo archive',
  'интерес': 'interest', 'Дизайн': 'Design', 'Музыка': 'Music',
  'авг 2024': 'Aug 2024', 'фев 2025': 'Feb 2025',
  'Резюме': 'Résumé', 'Портфолио': 'Portfolio', 'Фото': 'Photos',
  'Портфолио — Илья Судаков': 'Portfolio — Ilya Sudakov', 'Фото — архив': 'Photos — archive',
  'Все окна': 'All windows', 'Обзор открытых окон': 'Window overview',
  'Открытые окна': 'Open windows', 'Вернуться · Esc': 'Return · Esc',
  'г.р. 1998': 'born 1998', 'Работа': 'Experience', 'Образование': 'Education',
  '2025 - сейчас': '2025 - present', '2022 — сейчас': '2022 — present',
  'Продакт-инженер,': 'Product engineer,', 'Младший продакт-менеджер,': 'Junior product manager,',
  'Технический писатель/Бизнес-аналитик,': 'Technical writer / Business analyst,',
  'Младший технический писатель,': 'Junior technical writer,', 'Фронтенд-разработчик,': 'Frontend developer,',
  'Анализ и проработка требований. Курирование реализации на всём цикле разработки. Код — Frontend (React) + Backend (Django) с Claude Code.': 'Requirements analysis and refinement. Leading implementation throughout the development cycle. Frontend (React) and backend (Django) development with Claude Code.',
  'Продуктовые релизы и проекты ↗': 'Product releases and projects ↗',
  'Описание требований, макеты в Figma, прототипы с React + Cursor/Claude Code, v0.': 'Writing requirements, designing in Figma, and prototyping with React, Cursor / Claude Code, and v0.',
  'Анализ и описание требований для продуктовых фичей. Работа с дизайнером, командой разработчиков и менеджером по продукту.': 'Analyzing and documenting requirements for product features. Working with the designer, engineering team, and product manager.',
  'Написание и поддержка документации продукта. Видео, инструкции и статьи на английском для клиентов.': 'Writing and maintaining product documentation. Creating videos, guides, and articles in English for customers.',
  'Разработка React-приложения, дизайн CRM/ERP-системы для малого предприятия.': 'Developing a React application and designing a CRM / ERP system for a small business.',
  'СПбГУТ им. проф. М.А. Бонч-Бруевича': 'The Bonch-Bruevich Saint Petersburg State University of Telecommunications',
  'Бакалавриат, Программная инженерия': 'Bachelor’s degree in Software Engineering',
  'Главная': 'Home', 'Свои проекты и продуктовые релизы': 'Personal projects and product releases',
  'как разработчика и менеджера.': 'as a developer and manager.', 'Свои проекты': 'Personal projects',
  'Расширение Chrome': 'Chrome extension',
  'Переносит cookies с выбранных хостов на localhost и staging, чтобы тестировать приложение с рабочей сессией. Автоматически, при загрузке страницы.': 'Automatically syncs cookies from selected hosts to localhost and staging on page load, so you can test your app with an authenticated session.',
  'Настраиваемые источники и назначения': 'Configurable sources and destinations',
  'Пауза синхронизации и поддержка инкогнито': 'Pause syncing and use incognito mode',
  'Cookies остаются внутри браузера': 'Cookies stay in your browser',
  'Установить в Chrome ↗': 'Install in Chrome ↗', 'Код на GitHub ↗': 'Code on GitHub ↗',
  'Все': 'All', 'Вёл целиком': 'Builder', 'Вёл как менеджер': 'Manager',
  'Поиск по названию': 'Search by title', 'Все годы': 'All years', 'Год апдейта': 'Release year',
  'Найдено:': 'Found:', 'Ничего не нашлось': 'No results',
  'Попробуй другой запрос или сбрось фильтры.': 'Try another search or reset the filters.',
  'Сбросить фильтры': 'Reset filters', 'Показать ещё': 'Show more', 'Написать мне ↗': 'Email me ↗',
  'Навигация': 'Navigation', 'Роль в работе': 'Role', 'Места работы': 'Workplaces',
  'Разделы сайта': 'Site sections',
  'Открыть в новой вкладке': 'Open in a new tab',
  'Выбранные работы': 'Selected work', 'Выбранное': 'Selected work',
  'Назад': 'Back', 'Вперёд': 'Forward', 'Всё': 'All', 'Все файлы': 'All files',
  'По типу': 'By type', 'По годам': 'By year', 'Теги': 'Tags', 'фото': 'photos',
  'Пусто в этой папке': 'This folder is empty',
};

const normalize = value => value.trim().replace(/\s+/g, ' ');
const russian = new Map(Object.entries(translations).map(([ru, en]) => [en, ru]));
const preserveWhitespace = (source, text) => `${source.match(/^\s*/)[0]}${text}${source.match(/\s*$/)[0]}`;
function sourceText(value) {
  const key = normalize(value);
  if (russian.has(key)) return preserveWhitespace(value, russian.get(key));
  if (key.startsWith('Close ')) return `Закрыть ${sourceText(key.slice(6))}`;
  return value;
}
const originals = new WeakMap();
const attributeOriginals = new WeakMap();
let language = 'ru';
const originalTitle = document.title;
try { language = localStorage.getItem('site-language') === 'en' ? 'en' : 'ru'; } catch {}
export const getLanguage = () => language;
export function translate(value) {
  const key = normalize(value);
  if (language !== 'en') return value;
  if (translations[key]) return preserveWhitespace(value, translations[key]);
  if (key.startsWith('Закрыть ')) return `Close ${translate(key.slice('Закрыть '.length))}`;
  if (key.startsWith('Поиск апдейтов ')) return `Search ${key.slice('Поиск апдейтов '.length)} updates`;
  if (key.startsWith('Апдейты за ')) return `Updates from ${key.slice('Апдейты за '.length)}`;
  return value;
}

function applyLanguage() {
  observer.disconnect();
  document.documentElement.lang = language;
  document.title = language === 'en' ? translate(originalTitle) : originalTitle;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement.closest('script, style, [data-language-switch]')) continue;
    let source = originals.get(node);
    if (!source || (node.textContent !== source && node.textContent !== translateEnglish(source))) {
      source = sourceText(node.textContent);
      originals.set(node, source);
    }
    const result = language === 'en' ? translate(source) : source;
    if (node.textContent !== result) node.textContent = result;
  }
  document.querySelectorAll('[title], [aria-label], [placeholder], [data-window-title]').forEach(element => {
    if (element.closest('[data-language-switch]')) return;
    let sources = attributeOriginals.get(element);
    if (!sources) { sources = new Map(); attributeOriginals.set(element, sources); }
    for (const attribute of ['title', 'aria-label', 'placeholder', 'data-window-title']) {
      if (!element.hasAttribute(attribute)) continue;
      if (!sources.has(attribute)) sources.set(attribute, sourceText(element.getAttribute(attribute)));
      element.setAttribute(attribute, language === 'en' ? translate(sources.get(attribute)) : sources.get(attribute));
    }
  });
  document.querySelectorAll('time[datetime]').forEach(element => {
    const date = new Date(`${element.getAttribute('datetime')}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return;
    element.textContent = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
  });
  document.querySelectorAll('[data-language-switch]').forEach(button => {
    button.dataset.language = language;
    button.querySelector('[data-language-label]').textContent = language.toUpperCase();
    const label = language === 'ru' ? 'Переключить на английский' : 'Switch to Russian';
    button.setAttribute('aria-label', label);
    button.title = label;
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function translateEnglish(value) {
  const current = language;
  language = 'en';
  const result = translate(value);
  language = current;
  return result;
}
const observer = new MutationObserver(applyLanguage);
export function setLanguage(next) {
  if (next !== 'ru' && next !== 'en') return;
  language = next;
  try { localStorage.setItem('site-language', language); } catch {}
  applyLanguage();
  window.dispatchEvent(new Event('languagechange'));
  document.querySelectorAll('iframe').forEach(frame => {
    try { frame.contentWindow?.dispatchEvent(new CustomEvent('site-language', { detail: language })); } catch {}
  });
}
window.addEventListener('site-language', event => setLanguage(event.detail));
window.addEventListener('storage', event => {
  if (event.key === 'site-language') setLanguage(event.newValue === 'en' ? 'en' : 'ru');
});
document.querySelectorAll('[data-language-switch]').forEach(button => {
  button.addEventListener('click', () => {
    setLanguage(language === 'ru' ? 'en' : 'ru');
  });
});
applyLanguage();
