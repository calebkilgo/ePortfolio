// Interaction latency and layout stability, measured in the browser.
//
//   node scripts/verify/vitals.mjs
//
// Lighthouse cannot measure INP on a page load, so this drives real input
// with the CPU slowed 4x and reads the Event Timing API: the slowest
// interaction is reported as the INP for the session. It also measures CLS
// twice: once normally, and once with every font held back for 1.5 s, which
// forces the fallback faces to render first and proves the swap moves nothing.

import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';

const LIMIT_INP = 100;

const observe = () => {
  window.__cls = 0;
  window.__events = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value;
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.interactionId) window.__events.push({ name: entry.name, duration: entry.duration, id: entry.interactionId });
    }
  }).observe({ type: 'event', durationThreshold: 16, buffered: true });
};

const server = await serve('dist');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let failed = false;

async function session(label, { delayFonts = false, width = 412, height = 823 } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: false });
  await context.addInitScript(observe);
  const page = await context.newPage();
  if (delayFonts) {
    await page.route('**/*.woff2', async (route) => {
      await new Promise((done) => setTimeout(done, 1500));
      await route.continue();
    });
  }
  const client = await context.newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(server.url + '/', { waitUntil: 'load' });
  await page.waitForTimeout(5500);

  // Interactions a visitor would actually make.
  for (const pick of await page.locator('.scope__pick').all()) {
    await pick.click();
    await page.waitForTimeout(350);
  }
  const stage = page.locator('.scope__stage');
  const box = await stage.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.45, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(600);
  }
  await stage.focus();
  for (const key of ['ArrowLeft', 'ArrowLeft', 'ArrowUp', 'Home']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(200);
  }
  await page.locator('.masthead__nav a').first().click();
  await page.waitForTimeout(900);
  await page.mouse.wheel(0, 4000);
  await page.waitForTimeout(600);
  await page.mouse.wheel(0, 20000);
  await page.waitForTimeout(800);

  const { cls, events } = await page.evaluate(() => ({ cls: window.__cls, events: window.__events }));
  const byInteraction = new Map();
  for (const event of events) byInteraction.set(event.id, Math.max(byInteraction.get(event.id) ?? 0, event.duration));
  const worst = Math.max(0, ...byInteraction.values());
  console.log(`${label.padEnd(26)} CLS ${cls.toFixed(4)}   INP ${worst.toFixed(0)} ms over ${byInteraction.size} interactions (CPU 4x slower)`);
  if (cls > 0.0005 || worst > LIMIT_INP) failed = true;
  await context.close();
}

await session('phone, 412 px');
await session('phone, fonts held 1.5 s', { delayFonts: true });
await session('desktop, 1440 px', { width: 1440, height: 900 });
await session('desktop, fonts held 1.5 s', { delayFonts: true, width: 1440, height: 900 });

await browser.close();
await server.close();
console.log(failed ? 'TARGET MISSED (CLS 0, INP under 100 ms)' : 'targets met: CLS 0, INP under 100 ms');
process.exitCode = failed ? 1 : 0;
