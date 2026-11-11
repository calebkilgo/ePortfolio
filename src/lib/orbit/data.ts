// Build-time access to the element sets and the coastline.
// The live file (fetched by `npm run build`) wins when it is newer than the
// committed snapshot; with no network the snapshot is used.

import coast from '../../data/coast.json';
import snapshot from '../../data/elements.snapshot.json';
import type { Coastline } from './draw';
import type { SatRow } from './track';

interface ElementFile {
  source: string;
  fetched: string;
  objects: { group: string; omm: Record<string, string | number> }[];
}

const committed = snapshot as unknown as ElementFile;
const fresh = Object.values(
  import.meta.glob<ElementFile>('../../data/elements.live.json', { eager: true, import: 'default' }),
)[0];
const file = fresh && fresh.fetched > committed.fetched ? fresh : committed;

export const GROUPS = ['stations', 'gps-ops', 'weather', 'science'] as const;

export const fetchedAt = new Date(file.fetched);

export const rows: SatRow[] = file.objects.map(({ group, omm }) => [
  String(omm['OBJECT_NAME']),
  Number(omm['NORAD_CAT_ID']),
  Math.max(0, GROUPS.indexOf(group as (typeof GROUPS)[number])),
  String(omm['EPOCH']),
  Number(omm['MEAN_MOTION']),
  Number(omm['ECCENTRICITY']),
  Number(omm['INCLINATION']),
  Number(omm['RA_OF_ASC_NODE']),
  Number(omm['ARG_OF_PERICENTER']),
  Number(omm['MEAN_ANOMALY']),
  Number(omm['BSTAR']),
  Number(omm['MEAN_MOTION_DOT']),
  Number(omm['MEAN_MOTION_DDOT']),
]);

export const coastline = coast as Coastline;
