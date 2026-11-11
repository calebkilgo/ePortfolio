import type { APIRoute } from 'astro';
import { site } from '../content';

export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /og/\n\nSitemap: ${site.url}/sitemap-index.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
