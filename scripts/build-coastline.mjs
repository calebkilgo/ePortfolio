// build-coastline.mjs — turn Natural Earth 1:110m land outlines into the compact
// line data the orbit view draws. Output is committed: run again only to change
// the level of detail.
//
//   node scripts/build-coastline.mjs
//
// Format: { scale, lines: number[][] }. Each line is [lon0, lat0, dlon, dlat, ...]
// in units of 1/scale degree, delta-encoded so it compresses well.

import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mesh } from 'topojson-client';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCALE = 50; // 0.02 degree
const TOLERANCE = 0.12; // degrees, Douglas-Peucker
const MIN_POINTS = 6; // drop specks

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    let worst = 0;
    let index = -1;
    for (let i = a + 1; i < b; i++) {
      // A closed ring starts and ends on the same point: measure from that point instead.
      const d = len === 0
        ? Math.hypot(points[i][0] - ax, points[i][1] - ay)
        : Math.abs((points[i][0] - ax) * dy - (points[i][1] - ay) * dx) / len;
      if (d > worst) { worst = d; index = i; }
    }
    if (worst > tolerance && index > 0) {
      keep[index] = 1;
      stack.push([a, index], [index, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const world = JSON.parse(await readFile(require.resolve('world-atlas/land-110m.json'), 'utf8'));
const outline = mesh(world, world.objects.land);
let total = 0;
const lines = [];
for (const raw of outline.coordinates) {
  const points = simplify(raw, TOLERANCE);
  if (points.length < MIN_POINTS) continue;
  const out = [];
  let px = 0;
  let py = 0;
  points.forEach(([lon, lat], i) => {
    const x = Math.round(lon * SCALE);
    const y = Math.round(lat * SCALE);
    if (i === 0) out.push(x, y);
    else out.push(x - px, y - py);
    px = x;
    py = y;
  });
  total += points.length;
  lines.push(out);
}
const file = resolve(root, 'src/data/coast.json');
await writeFile(file, `${JSON.stringify({ scale: SCALE, lines })}\n`);
console.log(`coastline: ${lines.length} lines, ${total} points -> src/data/coast.json`);
