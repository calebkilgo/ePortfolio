import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// Static output, no adapter. Vercel serves dist/ as files.
export default defineConfig({
  site: 'https://www.calebkilgo.dev',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // One HTML response carries all CSS: no render-blocking request.
    inlineStylesheets: 'always',
  },
  // Hash-based Content-Security-Policy, emitted as a <meta> on every page.
  // Rules the page cannot express in <meta> (frame-ancestors) are sent as
  // headers from vercel.json.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
  integrations: [
    sitemap({
      // /og/ exists only to be photographed for the social card.
      filter: (page) => !page.includes('/og/'),
    }),
  ],
  devToolbar: { enabled: false },
  vite: {
    build: {
      // The orbit chunk is fetched on purpose, after first paint. No polyfill, no hints.
      modulePreload: false,
    },
  },
});
