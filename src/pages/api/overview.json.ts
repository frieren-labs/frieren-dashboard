import type { APIRoute } from 'astro';
import { dbPath, dbExists, getDaily, getTotals, getTopFailing, getSlowestTurns } from '../../lib/db';

// JSON parity with `frieren-stats --json` for scripts and the future memory panel.
export const GET: APIRoute = async ({ url }) => {
  const path = dbPath();
  if (!dbExists(path)) {
    return new Response(JSON.stringify({ error: 'no database', path }), { status: 404 });
  }
  const days = Math.min(Math.max(Number(url.searchParams.get('days') ?? 14) || 14, 1), 365);
  return new Response(
    JSON.stringify({
      path,
      daily: getDaily(path, days),
      totals: getTotals(path),
      topFailing: getTopFailing(path, 10),
      slowest: getSlowestTurns(path, 10),
    }),
    { headers: { 'content-type': 'application/json' } },
  );
};
