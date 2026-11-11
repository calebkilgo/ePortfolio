// Font-swap audit: the layout shift a first-time visitor on a slow connection
// would see, measured rather than estimated.
//
//   node scripts/verify/swap.mjs                           the home page
//   node scripts/verify/swap.mjs work/satellite-tracker    another page (no leading slash)
//
// Every web font is held back until the page has painted with its fallback
// faces, then released. Chrome's Layout Instability API reports any movement
// the swap causes. Wrapping depends on width, so this runs across the range of
// real screen sizes. Sections below the first screen are not laid out until
// they are scrolled near, so only the first screen can move.

import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';

const WIDTHS = [320, 360, 375, 384, 390, 393, 412, 414, 428, 430, 480, 600, 768, 820, 1024, 1280, 1366, 1440, 1536, 1920, 2560];
const HEIGHTS = { phone: 844, tablet: 1100, desktop: 900 };
// Lighthouse reports CLS to three decimals. Below this a shift rounds to 0.000:
// in practice one short run of text nudged sideways by a fraction of a pixel.
const VISIBLE = 0.0005;
const path = `/${(process.argv[2] ?? '').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');

const watch = () => {
  window.__shifts = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      const first = entry.sources?.[0]?.node;
      const text = first ? String(first.textContent ?? '').trim().slice(0, 24) : '';
      window.__shifts.push({ value: entry.value, name: `"${text}"` });
    }
  }).observe({ type: 'layout-shift', buffered: true });
};

const server = await serve('dist');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let worst = 0;
let failures = 0;
let nudges = 0;

for (const width of WIDTHS) {
  const height = width < 600 ? HEIGHTS.phone : width < 1024 ? HEIGHTS.tablet : HEIGHTS.desktop;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await context.addInitScript(watch);
  const page = await context.newPage();
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  await page.route('**/*.woff2', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto(server.url + path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  release();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  const shifts = await page.evaluate(() => window.__shifts);
  const total = shifts.reduce((sum, shift) => sum + shift.value, 0);
  worst = Math.max(worst, total);
  if (total >= VISIBLE) failures++;
  else if (total > 0) nudges++;
  const sources = [...new Set(shifts.map((shift) => shift.name))].slice(0, 3).join(', ');
  console.log(`${String(width).padStart(5)} x ${String(height).padEnd(4)}  CLS ${total.toFixed(5)}${total > 0 ? `  <- ${sources}` : ''}`);
  await context.close();
}

await browser.close();
await server.close();
const summary = failures
  ? `${failures} of ${WIDTHS.length} widths shifted; worst CLS ${worst.toFixed(4)}`
  : `no visible layout shift on font swap at any of ${WIDTHS.length} widths (worst ${worst.toFixed(5)}, ${nudges} sub-pixel)`;
console.log('');
console.log(summary);
process.exitCode = failures ? 1 : 0;
