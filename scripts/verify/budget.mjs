// Weight budgets, measured from a real load of the built home page.
//
//   node scripts/verify/budget.mjs
//
//   initial JavaScript            under 50 KB compressed
//   page weight, orbit view aside under 500 KB compressed
//
// Sizes are the compressed bytes the server sent (Brotli, as in production).
// The orbit view is the lazy part: its script chunk and its data file.

import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';

const LIMIT_JS = 50 * 1024;
const LIMIT_PAGE = 500 * 1024;
const isOrbit = (url) => /\/_astro\/boot\.[^/]+\.js$/.test(url) || url.endsWith('/orbit/scene.json');

const server = await serve('dist');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const rows = [];
page.on('response', async (response) => {
  const url = response.url();
  const length = Number(response.headers()['content-length'] ?? 0);
  rows.push({ url: url.replace(server.url, ''), type: response.request().resourceType(), bytes: length, orbit: isOrbit(url) });
});
await page.goto(server.url + '/', { waitUntil: 'load' });
await page.waitForTimeout(6000);
await browser.close();
await server.close();

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const sum = (list) => list.reduce((total, row) => total + row.bytes, 0);
const eager = rows.filter((row) => !row.orbit);
const lazy = rows.filter((row) => row.orbit);
const initialJs = sum(eager.filter((row) => row.type === 'script'));

for (const row of rows) console.log(`${row.orbit ? 'lazy ' : 'eager'} ${row.type.padEnd(10)} ${kb(row.bytes).padStart(9)}  ${row.url}`);
console.log(`\ninitial JavaScript   ${kb(initialJs)}  (limit ${kb(LIMIT_JS)})`);
console.log(`page, orbit aside    ${kb(sum(eager))}  (limit ${kb(LIMIT_PAGE)})`);
console.log(`orbit view, lazy     ${kb(sum(lazy))}`);
console.log(`requests             ${eager.length} eager, ${lazy.length} lazy`);

const ok = initialJs < LIMIT_JS && sum(eager) < LIMIT_PAGE;
console.log(ok ? 'budgets met' : 'BUDGET EXCEEDED');
process.exitCode = ok ? 0 : 1;
