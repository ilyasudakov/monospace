# Monospace

Personal playground and portfolio built with [Astro](https://astro.build/).

## Development

```sh
npm install
npm run dev
```

The production build is generated with `npm run build` and deployed to GitHub Pages from the `main` branch.

## Pages

- `/` — interactive personal playground
- `/cv/` — CV
- `/work/` — product releases and projects, organized by workplace and role
- `/photos/` — photo archive
- `/metro/` — live Saint Petersburg metro map powered by OpenStreetMap and Overpass

## Work archive

Portfolio and CV share a canvas window with Aqua-style tabs. Reopening a link
focuses the existing tab and preserves its page state. On wide screens, the
canvas shifts left to make room for the window.

The homepage's RU / EN switch translates the canvas and embedded pages and saves
the preference locally. UI translations live in `src/scripts/language.js`.
Personal projects such as Yoink are configured in `src/data/personal-projects.ts`.

Edit `src/data/work.ts` to add workplaces and selected releases. Each workplace
automatically gets a navigation entry and its own section; use `/work/#company-id`
for a direct link. No page or filter code needs changing to add another company.

Each update has `title`, an ISO `date` (`YYYY-MM-DD`), `url`, and `role`
(`owner` or `manager`). Optional `summary` adds a short description; `featured: true`
includes the release among up to three highlighted works. For example:

```ts
{
  title: 'Release title',
  date: '2026-10-05',
  url: 'https://example.com/product-updates/release',
  role: 'owner',
  summary: 'A short description of the product change.',
  featured: true,
}
```

Releases are sorted newest first and grouped by year. Search, role and year filters
work together. The archive shows 30 matching releases at a time with a show-more
button; without JavaScript, all entries and workplaces remain readable.
The Improvado releases live in `src/data/improvado-updates.ts`. They were selected
from the owner's Chrome groups: builder (33 releases, `owner`) and manager
(24 releases, `manager`). Titles, publication dates and URLs come from the public
Improvado product updates archive.
