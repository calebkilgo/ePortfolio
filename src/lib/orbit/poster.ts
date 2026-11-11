// The static plate: the same scene the browser draws, projected once at build
// time into SVG path data. It is what a visitor sees before any script runs,
// and all a visitor without WebGL or JavaScript ever needs.

import { coastline, rows } from './data';
import { coastStrips, dotsPath, graticuleStrips, place, type Mark } from './draw';
import { basis, EXTENT, HOME_VIEW, toView, unit, UNITS, type Basis, type Vec3 } from './math';
import { gstime } from './sgp4';
import { makeSat, positionAt } from './track';

type Strip = Vec3[];

/** Keep the near hemisphere, cutting each strip exactly at the limb. */
function clipFront(strip: Strip, b: Basis): Strip[] {
  const out: Strip[] = [];
  let current: Vec3[] = [];
  let previous: Vec3 | undefined;
  for (const point of strip) {
    const v = toView(point, b);
    if (previous) {
      const crosses = previous[2] >= 0 !== v[2] >= 0;
      if (crosses) {
        const t = previous[2] / (previous[2] - v[2]);
        const x = previous[0] + (v[0] - previous[0]) * t;
        const y = previous[1] + (v[1] - previous[1]) * t;
        const length = Math.hypot(x, y) || 1;
        const edge: Vec3 = [x / length, y / length, 0];
        if (v[2] >= 0) current = [edge];
        else {
          current.push(edge);
          out.push(current);
          current = [];
        }
      }
    }
    if (v[2] >= 0) current.push(v);
    previous = v;
  }
  if (current.length > 1) out.push(current);
  return out;
}

/** Compact path data: integer user units, relative segments. */
function toPath(strips: Strip[]): string {
  let d = '';
  for (const strip of strips) {
    let px = 0;
    let py = 0;
    let started = false;
    for (const v of strip) {
      const x = Math.round(v[0] * UNITS);
      const y = Math.round(-v[1] * UNITS);
      if (!started) {
        d += `M${x} ${y}l`;
        started = true;
      } else if (x !== px || y !== py) {
        d += `${x - px} ${y - py} `;
      }
      px = x;
      py = y;
    }
    d = d.trimEnd();
  }
  return d.replace(/ -/g, '-').replace(/l(?=M|$)/g, '');
}

export interface Plate {
  size: number;
  radius: number;
  graticule: string;
  coast: string;
  /** One path of zero-length segments: stroke caps draw the dots. */
  dots: string;
  count: number;
  site: Mark | null;
  target: Mark | null;
}

export function plate(date: Date, site: { latitude: number; longitude: number }, targetNorad: number): Plate {
  const b = basis(HOME_VIEW.lon, HOME_VIEW.lat);
  const sats = rows.map(makeSat);
  const target = sats.find((sat) => sat.norad === targetNorad);
  const gmst = gstime(date);
  const targetPosition = target ? positionAt(target, date, gmst) : null;
  return {
    size: Math.round(EXTENT * UNITS * 2),
    radius: UNITS,
    graticule: toPath(graticuleStrips().flatMap((strip) => clipFront(strip, b))),
    coast: toPath(coastStrips(coastline).flatMap((strip) => clipFront(strip, b))),
    dots: dotsPath(sats.map((sat) => positionAt(sat, date, gmst)), b),
    count: sats.length,
    site: place(unit(site.longitude, site.latitude), b),
    target: targetPosition ? place(targetPosition, b) : null,
  };
}
