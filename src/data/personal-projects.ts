export interface PersonalProject {
  id: string;
  name: string;
  kind: string;
  description: string;
  url: string;
  sourceUrl?: string;
  features: string[];
  logo?: string;
  summary?: string;
}

export const personalProjects: PersonalProject[] = [
  {
    id: 'yoink',
    name: 'Yoink',
    logo: 'assets/yoink-icon.png',
    summary: 'Расширение для синхронизации cookies с localhost и staging.',
    kind: 'Расширение Chrome',
    description: 'Переносит cookies с выбранных хостов на localhost и staging, чтобы тестировать приложение с рабочей сессией. Автоматически, при загрузке страницы.',
    url: 'https://chromewebstore.google.com/detail/yoink-%E2%80%94-cookie-sync-for-l/dmlakllmpenblknnmidlgjnogopgkpmm',
    sourceUrl: 'https://github.com/ilyasudakov/yoink',
    features: [
      'Настраиваемые источники и назначения',
      'Пауза синхронизации и поддержка инкогнито',
      'Cookies остаются внутри браузера',
    ],
  },
];
