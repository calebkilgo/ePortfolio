// Geometry shared by the build-time drawing and the browser scene.
//
// Frame: Earth-centred, Earth-fixed, in Earth radii. +x through 0°N 0°E,
// +y through 0°N 90°E, +z through the north pole.
// View: orthographic. x right, y up, z toward the viewer.

export type Vec3 = readonly [number, number, number];

export interface Basis {
  /** Screen right. */
  readonly e: Vec3;
  /** Screen up. */
  readonly n: Vec3;
  /** Toward the viewer. */
  readonly u: Vec3;
}

export const RAD = Math.PI / 180;
export const EARTH_RADIUS_KM = 6378.137;

/** The view the page opens on: above the western Atlantic, Huntsville upper left. */
export const HOME_VIEW = { lon: -62, lat: 24 } as const;
/** Half the side of the square frame, in Earth radii. Low Earth orbit fits inside. */
export const EXTENT = 1.25;
/** SVG user units per Earth radius. */
export const UNITS = 600;

export function basis(lonDeg: number, latDeg: number): Basis {
  const l = lonDeg * RAD;
  const p = latDeg * RAD;
  const cl = Math.cos(l);
  const sl = Math.sin(l);
  const cp = Math.cos(p);
  const sp = Math.sin(p);
  return { e: [-sl, cl, 0], n: [-sp * cl, -sp * sl, cp], u: [cp * cl, cp * sl, sp] };
}

/** Unit vector for a geodetic direction (spherical Earth is enough for drawing). */
export function unit(lonDeg: number, latDeg: number): Vec3 {
  const l = lonDeg * RAD;
  const p = latDeg * RAD;
  const cp = Math.cos(p);
  return [cp * Math.cos(l), cp * Math.sin(l), Math.sin(p)];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function toView(p: Vec3, b: Basis): Vec3 {
  return [dot(p, b.e), dot(p, b.n), dot(p, b.u)];
}

/** False when the Earth is in the way. */
export function isVisible(v: Vec3): boolean {
  return v[2] >= 0 || v[0] * v[0] + v[1] * v[1] > 1;
}
