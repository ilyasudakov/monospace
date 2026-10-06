# Ilya Sudakov — portfolio

Personal playground and portfolio built with [Astro](https://astro.build/).

Website: [ilyasudakov.github.io](https://ilyasudakov.github.io/).

## Development

```sh
npm install
npm run dev
```

Open `http://localhost:4321/`. The site uses the root base path (`/`), with no
`/monospace/` prefix.

`npm run check` checks Astro files. `npm run build` runs the checks and generates
the production site in `dist/`; `npm run preview` serves that build locally.

The repository is named `ilyasudakov.github.io`. GitHub Actions builds pull requests
and deploys pushes to `main` to GitHub Pages. The workflow is
`.github/workflows/deploy.yml`; the site URL and base path are in `astro.config.mjs`.

## Pages

- `/` — interactive personal playground
- `/cv/` — CV
- `/work/` — projects and companies, with details and releases inside
- `/photos/`, `/metro/` — older standalone pages, not linked from the homepage

## Work archive

Portfolio and CV share a canvas window with Aqua-style tabs. Reopening a link
focuses the existing tab and preserves its page state. On wide screens, the
homepage content becomes smaller beside a wider window. The whole group is
centered, with the page window capped at 960 screen pixels. Tabs can be reordered
by dragging, closed individually, or opened as standalone browser pages.

Share `https://ilyasudakov.github.io/#portfolio` or
`https://ilyasudakov.github.io/#resume`
to open the corresponding tab on the homepage automatically. The address updates
when switching tabs, and closing the window restores the homepage URL.
Add a section after the page name, such as `/#portfolio/improvado`, for a direct
link to a workplace inside the portfolio. Earlier `?page=` links still open and
are converted to the hash format.

The homepage's RU and EN links translate the canvas and embedded pages and save
the preference locally. On the first visit, the browser's preferred language is
used: Russian for `ru`, English for other languages. A saved choice takes priority.
UI translations live in `src/scripts/language.js`.
The sun/moon icon at the top left switches between light and dark themes,
including embedded portfolio and resume pages. The first visit follows the system
color scheme; an explicit choice is saved locally. Theme logic and colors live in
`src/scripts/theme.js` and `src/styles/theme.css`.
Personal projects such as Yoink are configured in `src/data/personal-projects.ts`.
University projects such as Osfix are configured in `src/data/university-projects.ts`.

The Links menu below Resume contains GitHub, LinkedIn, Telegram and email. Its
button can be dragged on desktop; dragging or panning keeps the menu open.
An outside click or Escape closes it. The reset-view icon appears after moving
or zooming the canvas and restores its initial layout.

## Background media

The wallpaper uses responsive desktop/mobile video files and image posters in
`public/assets/`: autumn for the light theme and snowy branches for the dark
theme. Switching themes changes the video and poster while preserving the video
pause preference. `src/scripts/background-video.js` handles the loop, playback
speed, pause control and resuming after returning to the page. The initial state
respects `prefers-reduced-motion`; an explicit video preference is saved locally.

The Outside track is served from `public/assets/outside-01-25.m4a` and controlled
by the speaker icon next to the video control. Music is off by default and
loads and plays only when the visitor turns it on with the speaker icon.

`src/scripts/background-music.js` sets the output volume (currently 25%),
reverb and echo through Web Audio. Playback fades in over 1.5 seconds, fades out
at the end and fades in again when the track loops. Reload the page after editing
the effects to recreate the audio graph.

## Adding portfolio entries

Edit `src/data/work.ts` to add workplaces and selected releases. Each workplace
automatically gets a list entry and its own section; use `/work/#company-id`
for a direct link. No page code needs changing to add another company.

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

Releases are sorted newest first, with the year included in each date. All entries and workplaces
are visible without filters or pagination. Portfolio typography, links and spacing
follow the CV styles.
The Improvado releases live in `src/data/improvado-updates.ts`. They were selected
from the owner's Chrome groups: builder (33 releases, `owner`) and manager
(24 releases, `manager`). Titles, publication dates and URLs come from the public
Improvado product updates archive.
