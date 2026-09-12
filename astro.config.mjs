import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ilyasudakov.github.io',
  base: '/monospace',
  build: {
    format: 'directory',
  },
});
