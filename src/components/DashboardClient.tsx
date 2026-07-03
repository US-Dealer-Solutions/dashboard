"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardData } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import OverviewView from "./OverviewView";
import ProspectsView from "./ProspectsView";
import CampaignsView from "./CampaignsView";

type Tab = "prospects" | "overview" | "campaigns";

const TABS: { id: Tab; label: string }[] = [
  { id: "prospects", label: "Prospects" },
  { id: "overview", label: "Analytics" },
  { id: "campaigns", label: "Campaigns" },
];

export default function DashboardClient() {
  const [tab, setTab] = useState<Tab>("prospects");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setData(json as DashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Outreach Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data
              ? `Live from Instantly + HeyReach · updated ${timeAgo(
                  data.fetchedAt,
                )}`
              : "Instantly + HeyReach analytics"}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/80"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {/* Per-platform warnings (non-fatal) */}
      {data?.errors && data.errors.length > 0 && (
        <div className="mb-4 space-y-2">
          {data.errors.map((e, i) => (
            <div
              key={i}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
            >
              <span className="font-medium capitalize">{e.platform}</span>:{" "}
              {e.message}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-black/10 bg-gray-50 p-1 dark:border-white/10 dark:bg-neutral-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-white text-black shadow-sm dark:bg-neutral-700 dark:text-white"
                : "text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Body */}
      {error && !data ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading && !data ? (
        <LoadingState />
      ) : data ? (
        <>
          {tab === "prospects" && <ProspectsView prospects={data.prospects} />}
          {tab === "overview" && <OverviewView data={data} />}
          {tab === "campaigns" && <CampaignsView campaigns={data.campaigns} />}
        </>
      ) : null}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-neutral-800"
        />
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
      <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}
