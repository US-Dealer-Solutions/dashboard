// Small presentation helpers shared across the UI.

export function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function num(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * Best-effort extraction of the dealership/client name from a campaign name.
 * Assumes the common agency convention where the dealership comes first,
 * separated from the campaign description by a delimiter, e.g.
 *   "Toyota of Downtown - Cold Email Q3"  -> "Toyota of Downtown"
 *   "ABC Motors | LinkedIn"               -> "ABC Motors"
 * If no delimiter is found, the full name is returned.
 */
export function parseDealership(campaignName: string): string {
  const name = (campaignName ?? "").trim();
  if (!name) return "—";
  const match = name.split(/\s*[-–—|:/]{1,2}\s*/)[0]?.trim();
  return match || name;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
