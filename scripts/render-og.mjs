// render-og.mjs — photograph the /og/ page into public/og.png (1200 x 630).
//
//   npm run build && npm run og
//
// The card is an ordinary page built with the site's own fonts and styles, so
// it always matches the site. Run this again when the name, the one-line
// description, or the look changes, then commit the PNG. Uses the Chrome
// installed on this machine; the hosted build never needs a browser.

import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { serve } from './verify/serve.mjs';

const server = await serve('dist');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`${server.url}/og/`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
await server.close();

const png = await sharp(shot).png({ compressionLevel: 9, palette: true, colours: 128, effort: 10 }).toBuffer();
await writeFile('public/og.png', png);
console.log(`og: public/og.png, ${(png.length / 1024).toFixed(1)} KB`);
