// Lighthouse, mobile profile, against the production build served locally.
//
//   node scripts/verify/lighthouse.mjs [runs]
//
// Default Lighthouse settings: emulated mid-range phone, simulated slow 4G
// (150 ms round trip, 1.6 Mbps down), 4x CPU slowdown. Each page is run
// several times and the median run by performance score is reported.
// Reports are written to .verify/lighthouse/.

import { mkdir, writeFile } from 'node:fs/promises';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { serve } from './serve.mjs';

const RUNS = Number(process.argv[2] ?? 3);
const PAGES = ['/', '/work/satellite-tracker/'];
const LIMITS = { lcp: 1200, cls: 0, tbt: 100 };

await mkdir('.verify/lighthouse', { recursive: true });
const server = await serve('dist');
let failed = false;

/** One run in its own browser: a fresh profile every time, as a first-time visitor has. */
async function run(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'] });
    try {
      return await lighthouse(url, { port: chrome.port, output: ['json', 'html'], logLevel: 'error' });
    } catch (error) {
      console.warn(`  run failed (${error.message}), retrying`);
    } finally {
      await chrome.kill();
    }
  }
  throw new Error(`Lighthouse could not complete a run for ${url}`);
}

for (const path of PAGES) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    runs.push(await run(server.url + path));
  }
  runs.sort((a, b) => a.lhr.categories.performance.score - b.lhr.categories.performance.score);
  const median = runs[Math.floor(runs.length / 2)];
  const { lhr } = median;
  const name = path === '/' ? 'home' : path.replace(/\//g, '-').replace(/^-|-$/g, '');
  await writeFile(`.verify/lighthouse/${name}.json`, median.report[0]);
  await writeFile(`.verify/lighthouse/${name}.html`, median.report[1]);

  const score = (id) => Math.round(lhr.categories[id].score * 100);
  const value = (id) => lhr.audits[id].numericValue;
  const scores = {
    performance: score('performance'),
    accessibility: score('accessibility'),
    'best-practices': score('best-practices'),
    seo: score('seo'),
  };
  const metrics = {
    fcp: Math.round(value('first-contentful-paint')),
    lcp: Math.round(value('largest-contentful-paint')),
    tbt: Math.round(value('total-blocking-time')),
    cls: Number(value('cumulative-layout-shift').toFixed(4)),
    si: Math.round(value('speed-index')),
  };
  console.log(`\n${path}`);
  console.log('  scores ', JSON.stringify(scores), `(all runs, performance: ${runs.map((r) => Math.round(r.lhr.categories.performance.score * 100)).join(', ')})`);
  console.log('  metrics', JSON.stringify(metrics));

  const misses = [];
  for (const [category, got] of Object.entries(scores)) if (got < 100) misses.push(`${category} ${got}`);
  if (metrics.lcp > LIMITS.lcp) misses.push(`LCP ${metrics.lcp} ms`);
  if (metrics.cls > LIMITS.cls) misses.push(`CLS ${metrics.cls}`);
  if (metrics.tbt > LIMITS.tbt) misses.push(`TBT ${metrics.tbt} ms`);
  for (const category of Object.values(lhr.categories)) {
    for (const ref of category.auditRefs) {
      const audit = lhr.audits[ref.id];
      if (ref.weight > 0 && audit.score !== null && audit.score < 1 && category.id !== 'performance') {
        misses.push(`audit ${ref.id}: ${audit.title}`);
      }
    }
  }
  if (misses.length) {
    failed = true;
    console.log('  MISSED ', misses.join('; '));
  } else {
    console.log('  all targets met');
  }
}

await server.close();
process.exitCode = failed ? 1 : 0;
