// fetch-elements.mjs — download current orbital element sets from CelesTrak.
//
//   node scripts/fetch-elements.mjs              write src/data/elements.live.json (git-ignored)
//   node scripts/fetch-elements.mjs --snapshot   write src/data/elements.snapshot.json (committed)
//   node scripts/fetch-elements.mjs --soft       never fail the build: keep what is already there
//
// The site build reads the live file when it exists and the committed snapshot
// otherwise, so a build with no network still works. CelesTrak refreshes its
// data every few hours and blocks clients that poll: this script makes four
// small requests, once per build, and identifies itself.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const soft = args.has('--soft');
const target = resolve(root, 'src/data', args.has('--snapshot') ? 'elements.snapshot.json' : 'elements.live.json');

/** The four groups the Satellite Tracker project loads by default. */
const GROUPS = [
  // Crewed stations only: the rest of the group is modules and debris flying in formation.
  { key: 'stations', keep: new Set([25544, 48274]) },
  { key: 'gps-ops' },
  { key: 'weather' },
  { key: 'science' },
];

const FIELDS = [
  'OBJECT_NAME', 'OBJECT_ID', 'EPOCH', 'MEAN_MOTION', 'ECCENTRICITY', 'INCLINATION',
  'RA_OF_ASC_NODE', 'ARG_OF_PERICENTER', 'MEAN_ANOMALY', 'EPHEMERIS_TYPE', 'CLASSIFICATION_TYPE',
  'NORAD_CAT_ID', 'ELEMENT_SET_NO', 'REV_AT_EPOCH', 'BSTAR', 'MEAN_MOTION_DOT', 'MEAN_MOTION_DDOT',
];

const MAX_AGE_DAYS = 30;

async function fetchGroup(group) {
  const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group.key}&FORMAT=json`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'calebkilgo.dev site build (+https://www.calebkilgo.dev)' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${group.key}: HTTP ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`${group.key}: empty response`);
  return rows;
}

async function main() {
  const now = Date.now();
  const seen = new Set();
  const objects = [];
  for (const group of GROUPS) {
    const rows = await fetchGroup(group);
    for (const row of rows) {
      const id = Number(row.NORAD_CAT_ID);
      if (group.keep && !group.keep.has(id)) continue;
      if (seen.has(id)) continue;
      const ageDays = (now - Date.parse(`${row.EPOCH}Z`)) / 86_400_000;
      if (!(ageDays < MAX_AGE_DAYS)) continue;
      seen.add(id);
      const omm = {};
      for (const field of FIELDS) omm[field] = row[field];
      objects.push({ group: group.key, omm });
    }
  }
  if (objects.length < 20) throw new Error(`only ${objects.length} objects: refusing to write`);
  const payload = {
    source: 'CelesTrak GP data, https://celestrak.org',
    fetched: new Date(now).toISOString(),
    objects,
  };
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(payload, null, 1)}\n`);
  console.log(`elements: ${objects.length} objects -> ${target.replace(root, '.')}`);
}

main().catch((error) => {
  console.warn(`elements: fetch failed (${error.message})${soft ? ', keeping existing data' : ''}`);
  if (!soft) process.exitCode = 1;
});
