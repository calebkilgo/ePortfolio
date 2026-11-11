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
      if (!entry.interactionId) continue;
      const target = entry.target;
      window.__events.push({
        name: entry.name,
        duration: entry.duration,
        id: entry.interactionId,
        on: target ? `${target.nodeName.toLowerCase()}.${String(target.className || '').split(' ')[0]}` : '?',
        // Where the time went: waiting to start, running handlers, waiting for the next frame.
        delay: Math.round(entry.processingStart - entry.startTime),
        work: Math.round(entry.processingEnd - entry.processingStart),
        paint: Math.round(entry.startTime + entry.duration - entry.processingEnd),
      });
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

  // Interactions a visitor would actually make. Input is sent as raw mouse and
  // key events at known coordinates, with the target already in view: the
  // high-level click helpers scroll and run their own checks inside the page,
  // and under a 4x slowdown that work would be billed to the interaction.
  const tap = async (locator) => {
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    const box = await locator.boundingBox();
    if (!box) return;
    await page.waitForTimeout(250);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(450);
  };
  for (const pick of await page.locator('.scope__pick').all()) await tap(pick);
  for (const pick of (await page.locator('.scope__pick').all()).reverse()) await tap(pick);

  const stage = page.locator('.scope__stage');
  await stage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  const box = await stage.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.45, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(700);
  }
  await stage.focus();
  await page.waitForTimeout(300);
  for (const key of ['ArrowLeft', 'ArrowLeft', 'ArrowUp', 'Home']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await tap(page.locator('.masthead__nav a').first());
  await page.waitForTimeout(600);
  // Then read down the whole page, so any shift while scrolling is counted too.
  for (let step = 0; step < 12; step++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(180);
  }
  await page.waitForTimeout(600);

  const { cls, events } = await page.evaluate(() => ({ cls: window.__cls, events: window.__events }));
  const byInteraction = new Map();
  for (const event of events) byInteraction.set(event.id, Math.max(byInteraction.get(event.id) ?? 0, event.duration));
  const worst = Math.max(0, ...byInteraction.values());
  const slowest = [...events].sort((a, b) => b.duration - a.duration)[0];
  await context.close();
  return {
    cls,
    inp: worst,
    slowest: slowest ? `${slowest.name} on ${slowest.on}: ${slowest.delay} ms waiting, ${slowest.work} ms in handlers, ${slowest.paint} ms to next frame` : '',
  };
}

// Each configuration runs three times and the median is judged: a single run
// can be thrown off by whatever else the test machine happens to be doing.
const REPEATS = 3;
async function measured(label, options) {
  const runs = [];
  for (let i = 0; i < REPEATS; i++) runs.push(await session(label, options));
  const inp = runs.map((run) => run.inp).sort((a, b) => a - b);
  const cls = Math.max(...runs.map((run) => run.cls));
  const median = inp[Math.floor(inp.length / 2)];
  console.log(`${label.padEnd(26)} CLS ${cls.toFixed(4)}   INP ${median.toFixed(0)} ms median of ${inp.map((v) => v.toFixed(0)).join(' / ')} (CPU 4x slower)`);
  const typical = runs.find((run) => run.inp === median);
  if (typical?.slowest) console.log(`${' '.repeat(26)} slowest interaction: ${typical.slowest}`);
  if (cls > 0.0005 || median > LIMIT_INP) failed = true;
}
await measured('phone, 412 px');
await measured('phone, fonts held 1.5 s', { delayFonts: true });
await measured('desktop, 1440 px', { width: 1440, height: 900 });
await measured('desktop, fonts held 1.5 s', { delayFonts: true, width: 1440, height: 900 });

// Section links must land on their section even though sections below the
// first screen are only laid out as they come near it.
async function anchors(width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(server.url + '/', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const links = await page.locator('.masthead__nav a').all();
  const misses = [];
  for (const link of links.reverse()) {
    const id = (await link.getAttribute('href')).replace('#', '');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(250);
    await link.click();
    await page.waitForTimeout(1600);
    const offset = await page.evaluate((target) => {
      const element = document.getElementById(target);
      const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const top = element.getBoundingClientRect().top;
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      return atEnd && top >= padding ? 0 : top - padding;
    }, id);
    if (Math.abs(offset) > 4) misses.push(`#${id} off by ${offset.toFixed(0)} px`);
  }
  console.log(`${`anchors, ${width} px`.padEnd(26)} ${misses.length ? misses.join('; ') : 'every section link lands on its section'}`);
  if (misses.length) failed = true;
  await context.close();
}
await anchors(1440, 900);
await anchors(390, 844);

await browser.close();
await server.close();
console.log(failed ? 'TARGET MISSED (CLS 0, INP under 100 ms)' : 'targets met: CLS 0, INP under 100 ms');
process.exitCode = failed ? 1 : 0;
