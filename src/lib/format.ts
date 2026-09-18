// Small presentation helpers shared across the UI.

export function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function num(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * Detects the audience/track a campaign or list targets from its name.
 * Matches the USDS naming across Instantly and HeyReach, e.g.
 *   "USDS - F&I / Finance Track (TX dealerships)"  -> "F&I / Finance"
 *   "USDS - Track B (General Manager)"             -> "General Manager"
 *   "USDS - Track C (F&I Referral Network)"        -> "Referral Network"
 *   "USDS - TX Franchise Dealers (Registry)"       -> "TX Franchise Dealers"
 * Referral is checked first because those names also contain "F&I". The
 * franchise/registry audience is checked after the personas, so a name
 * carrying both (e.g. "F&I - Franchise Dealers") still groups by persona.
 * Anything unrecognized falls back to a tidied version of the campaign name.
 */
export function trackFromName(name: string): string {
  const n = (name ?? "").toLowerCase();
  if (/referral/.test(n)) return "Referral Network";
  if (/general manager|\bgm\b|track b/.test(n)) return "General Manager";
  if (/f&i|f\/i|finance|track a/.test(n)) return "F&I / Finance";
  if (/franchise|registry/.test(n)) return "TX Franchise Dealers";
  return tidyName(name);
}

/**
 * Turns an unrecognized campaign name into a short group heading by dropping
 * the "USDS - " prefix and a trailing qualifier like "(TX dealerships)", so a
 * newly created campaign still gets a sensible track without a code change.
 */
function tidyName(name: string): string {
  return (
    (name ?? "")
      .replace(/^\s*USDS\s*[-–—:]\s*/i, "")
      .replace(/\s*\([^)]*\)\s*$/, "")
      .trim() || "Other"
  );
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
