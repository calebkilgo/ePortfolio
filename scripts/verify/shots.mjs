// Screenshots of the built site at the four reference widths, in each mode a
// visitor can arrive in. Uses the Chrome already installed on this machine.
//
//   node scripts/verify/shots.mjs            all modes, all widths
//   node scripts/verify/shots.mjs default    one mode
//
// Output: .verify/shots/<page>-<mode>-<width>.png, plus console errors per run.

import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';

const SIZES = [
  { width: 320, height: 640, scale: 2 },
  { width: 768, height: 1024, scale: 1 },
  { width: 1440, height: 900, scale: 1 },
  { width: 2560, height: 1440, scale: 1 },
];
const MODES = {
  default: {},
  'reduced-motion': { reducedMotion: 'reduce' },
  'no-webgl': { noWebgl: true },
  'no-js': { javaScriptEnabled: false },
};
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'file', path: '/work/satellite-tracker/' },
];

const only = process.argv[2];
const out = '.verify/shots';
await mkdir(out, { recursive: true });
const server = await serve('dist');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const problems = [];

for (const [mode, options] of Object.entries(MODES)) {
  if (only && only !== mode) continue;
  for (const size of SIZES) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: size.scale,
      reducedMotion: options.reducedMotion ?? 'no-preference',
      javaScriptEnabled: options.javaScriptEnabled ?? true,
    });
    if (options.noWebgl) {
      await context.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
          return String(type).startsWith('webgl') ? null : original.call(this, type, ...rest);
        };
      });
    }
    for (const target of PAGES) {
      const page = await context.newPage();
      page.on('console', (message) => {
        if (message.type() === 'error') problems.push(`${target.name} ${mode} ${size.width}: console: ${message.text()}`);
      });
      page.on('pageerror', (error) => problems.push(`${target.name} ${mode} ${size.width}: error: ${error.message}`));
      page.on('requestfailed', (request) => problems.push(`${target.name} ${mode} ${size.width}: failed: ${request.url()}`));
      page.on('response', (response) => {
        if (response.status() >= 400) problems.push(`${target.name} ${mode} ${size.width}: ${response.status()} ${response.url()}`);
      });
      await page.goto(server.url + target.path, { waitUntil: 'load' });
      // Long enough for the orbit view to load, sweep and settle.
      await page.waitForTimeout(options.javaScriptEnabled === false ? 300 : 5200);
      const overflow = await Promise.race([
        page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth).catch(() => 0),
        new Promise((done) => setTimeout(() => done(0), 3000)),
      ]);
      if (overflow > 0) problems.push(`${target.name} ${mode} ${size.width}: horizontal overflow ${overflow}px`);
      const base = `${out}/${target.name}-${mode}-${size.width}`;
      await page.screenshot({ path: `${base}.png` });
      // Walk the page once so lazy images are in place for the full-length capture.
      // Driven from here, not from page timers, so it also works with scripting off.
      const height = await Promise.race([
        page.evaluate(() => document.documentElement.scrollHeight).catch(() => 0),
        new Promise((done) => setTimeout(() => done(0), 3000)),
      ]);
      for (let y = 0; y < height; y += size.height) {
        await page.mouse.wheel(0, size.height);
        await page.waitForTimeout(70);
      }
      await page.mouse.wheel(0, -height - 2000);
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${base}-full.png`, fullPage: true });
      await page.close();
    }
    await context.close();
  }
}

await browser.close();
await server.close();
console.log(problems.length ? problems.join('\n') : 'no console errors, failed requests or overflow');
process.exitCode = problems.length ? 1 : 0;
