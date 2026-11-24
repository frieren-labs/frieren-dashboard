import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// SSR is required: every page opens frieren.db read-only at request time.
// No static prerender touches the database.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [tailwind()],
  // No page uses astro:assets images; keep the optional sharp service
  // out of the server bundle (its native postinstall may be unavailable).
  vite: {
    ssr: { external: ['sharp'] },
    build: { rollupOptions: { external: ['sharp'] } },
  },
});
