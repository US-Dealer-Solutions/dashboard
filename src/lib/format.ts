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
 * Referral is checked first because those names also contain "F&I".
 * Falls back to the cleaned campaign name if no known track is found.
 */
export function trackFromName(name: string): string {
  const n = (name ?? "").toLowerCase();
  if (/referral/.test(n)) return "Referral Network";
  if (/general manager|\bgm\b|track b/.test(n)) return "General Manager";
  if (/f&i|f\/i|finance|track a/.test(n)) return "F&I / Finance";
  return (name ?? "").trim() || "Other";
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
