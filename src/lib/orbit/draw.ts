// Path helpers for the SVG plate, used at build time and by the no-WebGL fallback.

import { EXTENT, isVisible, toView, unit, UNITS, type Basis, type Vec3 } from './math';

export interface Mark {
  x: number;
  y: number;
}

/** Where a point lands on the plate, or null if it is hidden or out of frame. */
export function place(point: Vec3, b: Basis): Mark | null {
  const v = toView(point, b);
  if (!isVisible(v) || Math.abs(v[0]) > EXTENT || Math.abs(v[1]) > EXTENT) return null;
  return { x: Math.round(v[0] * UNITS), y: Math.round(-v[1] * UNITS) };
}

/** One path of zero-length segments. Square stroke caps turn each into a dot. */
export function dotsPath(points: Iterable<Vec3 | null>, b: Basis): string {
  let d = '';
  for (const point of points) {
    if (!point) continue;
    const mark = place(point, b);
    if (mark) d += `M${mark.x} ${mark.y}h0`;
  }
  return d;
}

export interface Coastline {
  /** Units per degree. */
  scale: number;
  /** [lon0, lat0, dlon, dlat, ...] per line. */
  lines: number[][];
}

/** Coastline as strips of Earth-fixed unit vectors. */
export function coastStrips({ scale, lines }: Coastline): Vec3[][] {
  return lines.map((line) => {
    const strip: Vec3[] = [];
    let x = 0;
    let y = 0;
    for (let i = 0; i < line.length; i += 2) {
      x += line[i] ?? 0;
      y += line[i + 1] ?? 0;
      strip.push(unit(x / scale, y / scale));
    }
    return strip;
  });
}

/** Meridians and parallels every `step` degrees. */
export function graticuleStrips(step = 30, sample = 3): Vec3[][] {
  const strips: Vec3[][] = [];
  for (let lon = -180; lon < 180; lon += step) {
    const strip: Vec3[] = [];
    for (let lat = -90; lat <= 90; lat += sample) strip.push(unit(lon, lat));
    strips.push(strip);
  }
  for (let lat = -90 + step; lat < 90; lat += step) {
    const strip: Vec3[] = [];
    for (let lon = -180; lon <= 180; lon += sample) strip.push(unit(lon, lat));
    strips.push(strip);
  }
  return strips;
}
