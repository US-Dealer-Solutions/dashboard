// Small presentational building blocks used across views.
import { Platform } from "@/lib/types";

export function PlatformBadge({ platform }: { platform: Platform }) {
  const styles =
    platform === "instantly"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
      : "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300";
  const label = platform === "instantly" ? "Email" : "LinkedIn";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}
    >
      {label}
    </span>
  );
}

export type Tone = "green" | "amber" | "gray";

/**
 * Colour for a campaign status pill. Live/sending campaigns read green,
 * not-yet-live states (draft, staged, paused) read amber, and finished or
 * unknown states stay neutral.
 */
export function statusTone(status: string, staged = false): Tone {
  if (staged) return "amber";
  const s = (status ?? "").toLowerCase();
  if (/active|in_progress|in progress|running|sending/.test(s)) return "green";
  if (/draft|paused|staged|scheduled/.test(s)) return "amber";
  return "gray";
}

export function StatusPill({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  const map = {
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</div>
      )}
    </div>
  );
}
