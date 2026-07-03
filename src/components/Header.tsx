"use client";

import { timeAgo } from "@/lib/format";

/** Brand monogram badge — "UDS" on a deep navy→blue gradient. */
function LogoMark() {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-blue-700 shadow-sm ring-1 ring-white/10">
      <span className="text-sm font-bold tracking-tight text-white">UDS</span>
    </div>
  );
}

export default function Header({
  fetchedAt,
  loading,
  onRefresh,
}: {
  fetchedAt: string | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-neutral-950/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <LogoMark />
          <div className="leading-tight">
            <div className="text-base font-semibold tracking-tight text-slate-900 dark:text-white sm:text-lg">
              US Dealer Solutions
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Outreach Dashboard
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-slate-400 dark:text-slate-500 sm:inline">
            {fetchedAt ? `Updated ${timeAgo(fetchedAt)}` : ""}
          </span>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            <span className="hidden sm:inline">
              {loading ? "Refreshing…" : "Refresh"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
