// A static server for dist/ that behaves like the production host where it
// matters for measurement: Brotli on text, long cache on hashed assets,
// trailing-slash redirects, a real 404.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt', '.svg']);

export async function serve(directory, port = 0) {
  const root = resolve(directory);
  const cache = new Map();

  async function load(path) {
    const key = path;
    if (cache.has(key)) return cache.get(key);
    const body = await readFile(path);
    const ext = extname(path);
    const entry = { body, type: TYPES[ext] ?? 'application/octet-stream' };
    if (COMPRESSIBLE.has(ext)) {
      entry.br = brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } });
      entry.gzip = gzipSync(body, { level: 9 });
    }
    cache.set(key, entry);
    return entry;
  }

  async function locate(urlPath) {
    const clean = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
    let path = join(root, clean);
    if (!path.startsWith(root)) return { status: 403 };
    try {
      const info = await stat(path);
      if (info.isDirectory()) {
        if (!urlPath.endsWith('/')) return { status: 308, location: `${urlPath}/` };
        path = join(path, 'index.html');
        await stat(path);
      }
      return { status: 200, path };
    } catch {
      return { status: 404, path: join(root, '404.html') };
    }
  }

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const found = await locate(url.pathname);
    if (found.status === 308) {
      response.writeHead(308, { Location: found.location + url.search });
      response.end();
      return;
    }
    if (found.status === 403) {
      response.writeHead(403);
      response.end();
      return;
    }
    try {
      const entry = await load(found.path);
      const accepts = String(request.headers['accept-encoding'] ?? '');
      const headers = {
        'Content-Type': entry.type,
        'Cache-Control': url.pathname.startsWith('/_astro/') ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        Vary: 'Accept-Encoding',
      };
      let body = entry.body;
      if (entry.br && accepts.includes('br')) {
        body = entry.br;
        headers['Content-Encoding'] = 'br';
      } else if (entry.gzip && accepts.includes('gzip')) {
        body = entry.gzip;
        headers['Content-Encoding'] = 'gzip';
      }
      headers['Content-Length'] = body.length;
      response.writeHead(found.status, headers);
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end('Not found');
    }
  });

  await new Promise((done) => server.listen(port, '127.0.0.1', done));
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((done) => server.close(done)),
  };
}

// node scripts/verify/serve.mjs [port]
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const { url } = await serve('dist', Number(process.argv[2] ?? 4321));
  console.log(`serving dist at ${url}`);
}
