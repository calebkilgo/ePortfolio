// npm run verify — every check, in order, against the current build in dist/.
//
//   budget      compressed bytes: initial JavaScript, page weight
//   swap        layout shift when web fonts replace their fallbacks, 21 widths, every page
//   vitals      INP under a 4x CPU slowdown, CLS with and without delayed fonts
//   lighthouse  mobile profile, all four categories, home and one project page
//   shots       screenshots at 320 / 768 / 1440 / 2560 in four modes, with console and overflow checks
//
// Run `npm run build` first. Results and screenshots land in .verify/.

import { spawnSync } from 'node:child_process';

const steps = [
  ['budget', ['scripts/verify/budget.mjs']],
  ['swap: home', ['scripts/verify/swap.mjs']],
  ['swap: satellite-tracker', ['scripts/verify/swap.mjs', 'work/satellite-tracker']],
  ['swap: cfs-traceability', ['scripts/verify/swap.mjs', 'work/cfs-traceability']],
  ['swap: smart-assistant', ['scripts/verify/swap.mjs', 'work/smart-assistant']],
  ['swap: smart-mirror', ['scripts/verify/swap.mjs', 'work/smart-mirror']],
  ['vitals', ['scripts/verify/vitals.mjs']],
  ['lighthouse', ['scripts/verify/lighthouse.mjs', '3']],
  ['shots', ['scripts/verify/shots.mjs']],
];

const only = process.argv[2];
const results = [];
for (const [name, args] of steps) {
  if (only && !name.startsWith(only)) continue;
  console.log(`\n── ${name} ${'─'.repeat(Math.max(0, 60 - name.length))}`);
  const run = spawnSync(process.execPath, args, { stdio: 'inherit' });
  results.push([name, run.status === 0]);
}

console.log(`\n── summary ${'─'.repeat(53)}`);
for (const [name, passed] of results) console.log(`${passed ? 'pass' : 'FAIL'}  ${name}`);
process.exitCode = results.every(([, passed]) => passed) ? 0 : 1;
