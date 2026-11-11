// The data the orbit view loads after first paint: element sets and coastline.
// Served as its own file so the script chunk stays cacheable while this changes daily.

import type { APIRoute } from 'astro';
import { orbit, site } from '../../content';
import { coastline, fetchedAt, GROUPS, rows } from '../../lib/orbit/data';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      fetched: fetchedAt.toISOString(),
      groups: GROUPS,
      site: { latitude: site.base.latitude, longitude: site.base.longitude, label: orbit.site },
      targets: orbit.targets,
      sats: rows,
      coast: coastline,
    }),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
