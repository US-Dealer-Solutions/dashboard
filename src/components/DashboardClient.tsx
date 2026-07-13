"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardData } from "@/lib/types";
import Header from "./Header";
import OverviewView from "./OverviewView";
import ProspectsView from "./ProspectsView";
import CampaignsView from "./CampaignsView";
import MessagingView from "./MessagingView";
import InboxView from "./InboxView";

type Tab = "prospects" | "inbox" | "overview" | "campaigns" | "messaging";

const TABS: { id: Tab; label: string }[] = [
  { id: "prospects", label: "Prospects" },
  { id: "inbox", label: "Inbox" },
  { id: "overview", label: "Analytics" },
  { id: "campaigns", label: "Campaigns" },
  { id: "messaging", label: "Messaging" },
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
    <div className="flex min-h-screen flex-col">
      <Header fetchedAt={data?.fetchedAt ?? null} loading={loading} onRefresh={load} />

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
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
        <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-black/10 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-neutral-900">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? "bg-blue-700 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
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
            {tab === "inbox" && (
              <InboxView conversations={data.conversations} />
            )}
            {tab === "overview" && <OverviewView data={data} />}
            {tab === "campaigns" && <CampaignsView campaigns={data.campaigns} />}
            {tab === "messaging" && <MessagingView messaging={data.messaging} />}
          </>
        ) : null}
      </div>

      <footer className="border-t border-black/5 py-6 text-center text-xs text-slate-400 dark:border-white/5 dark:text-slate-600">
        US Dealer Solutions · Outreach Dashboard
      </footer>
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
