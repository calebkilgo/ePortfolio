// SGP4 propagation and the quantities the readout shows. Runs at build time
// (to draw the static plate) and in the browser (to keep it live).

import { ecfToLookAngles, eciToEcf, eciToGeodetic, gstime, json2satrec, propagate, sgp4, type SatRec } from './sgp4';
import { EARTH_RADIUS_KM, RAD, type Vec3 } from './math';

/** One element set, packed as a row to keep the payload small. */
export type SatRow = [
  name: string,
  norad: number,
  group: number,
  epoch: string,
  meanMotion: number,
  eccentricity: number,
  inclination: number,
  raan: number,
  argPerigee: number,
  meanAnomaly: number,
  bstar: number,
  meanMotionDot: number,
  meanMotionDdot: number,
];

export interface Sat {
  name: string;
  norad: number;
  group: number;
  rec: SatRec;
  /** Orbital period in minutes. */
  period: number;
  epochMs: number;
}

export interface Site {
  latitude: number;
  longitude: number;
}

export interface Telemetry {
  /** Degrees. */
  lat: number;
  lon: number;
  altKm: number;
  speedKms: number;
  /** Degrees, as seen from the ground site. */
  azimuth: number;
  elevation: number;
}

export function makeSat(row: SatRow): Sat {
  const [name, norad, group, epoch, n, e, i, raan, argp, m, bstar, ndot, nddot] = row;
  const rec = json2satrec({
    OBJECT_NAME: name,
    OBJECT_ID: '',
    EPOCH: epoch,
    MEAN_MOTION: n,
    ECCENTRICITY: e,
    INCLINATION: i,
    RA_OF_ASC_NODE: raan,
    ARG_OF_PERICENTER: argp,
    MEAN_ANOMALY: m,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: 'U',
    NORAD_CAT_ID: norad,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 0,
    BSTAR: bstar,
    MEAN_MOTION_DOT: ndot,
    MEAN_MOTION_DDOT: nddot,
  });
  return { name, norad, group, rec, period: 1440 / n, epochMs: Date.parse(`${epoch}Z`) };
}

/** Earth-fixed position in Earth radii, or null if the propagator rejects the set. */
export function positionAt(sat: Sat, date: Date, gmst: number = gstime(date)): Vec3 | null {
  const state = propagate(sat.rec, date);
  if (!state) return null;
  const p = eciToEcf(state.position, gmst);
  return [p.x / EARTH_RADIUS_KM, p.y / EARTH_RADIUS_KM, p.z / EARTH_RADIUS_KM];
}

/**
 * The orbit as a closed ring in the Earth-fixed frame of this instant: one
 * period of the inertial path, all rotated by the current sidereal angle.
 */
export function ringAt(sat: Sat, date: Date, samples: number): Vec3[] {
  const gmst = gstime(date);
  const since = (date.getTime() - sat.epochMs) / 60_000;
  const ring: Vec3[] = [];
  for (let k = 0; k <= samples; k++) {
    const state = sgp4(sat.rec, since + (k / samples) * sat.period);
    if (!state) continue;
    const p = eciToEcf(state.position, gmst);
    ring.push([p.x / EARTH_RADIUS_KM, p.y / EARTH_RADIUS_KM, p.z / EARTH_RADIUS_KM]);
  }
  return ring;
}

export function telemetryAt(sat: Sat, date: Date, site: Site): Telemetry | null {
  const state = propagate(sat.rec, date);
  if (!state) return null;
  const gmst = gstime(date);
  const geo = eciToGeodetic(state.position, gmst);
  const look = ecfToLookAngles(
    { latitude: site.latitude * RAD, longitude: site.longitude * RAD, height: 0.19 },
    eciToEcf(state.position, gmst),
  );
  const v = state.velocity;
  let lon = geo.longitude / RAD;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  return {
    lat: geo.latitude / RAD,
    lon,
    altKm: geo.height,
    speedKms: Math.hypot(v.x, v.y, v.z),
    azimuth: look.azimuth / RAD,
    elevation: look.elevation / RAD,
  };
}

/** "ISS (ZARYA)" -> "ISS". The catalogue name without its parenthetical. */
export function shortName(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, '').trim();
}
