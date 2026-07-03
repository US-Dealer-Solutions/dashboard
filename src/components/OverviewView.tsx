"use client";

import { DashboardData } from "@/lib/types";
import { num, pct } from "@/lib/format";
import { KpiCard } from "./ui";

export default function OverviewView({ data }: { data: DashboardData }) {
  const t = data.totals;
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Combined totals
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Messages sent" value={num(t.sent)} />
          <KpiCard
            label="Open rate"
            value={pct(t.openRate)}
            sub={`${num(t.opens)} opens (email)`}
          />
          <KpiCard
            label="Reply rate"
            value={pct(t.replyRate)}
            sub={`${num(t.replies)} replies`}
          />
          <KpiCard
            label="Connections"
            value={num(t.connectionsAccepted)}
            sub="accepted (LinkedIn)"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Prospects engaged
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Replied" value={num(t.prospectsReplied)} />
          <KpiCard label="Opened (no reply)" value={num(t.prospectsOpened)} />
          <KpiCard label="Bounced" value={num(t.bounced)} />
          <KpiCard label="Campaigns" value={num(data.campaigns.length)} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <PlatformPanel
          title="Instantly · Email"
          accent="text-blue-600 dark:text-blue-400"
          totals={data.byPlatform.instantly}
          showOpens
        />
        <PlatformPanel
          title="HeyReach · LinkedIn"
          accent="text-violet-600 dark:text-violet-400"
          totals={data.byPlatform.heyreach}
          showConnections
        />
      </section>
    </div>
  );
}

function PlatformPanel({
  title,
  accent,
  totals,
  showOpens,
  showConnections,
}: {
  title: string;
  accent: string;
  totals: DashboardData["byPlatform"]["instantly"];
  showOpens?: boolean;
  showConnections?: boolean;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <h3 className={`text-sm font-semibold ${accent}`}>{title}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-y-3 text-sm">
        <Row label="Sent" value={num(totals.sent)} />
        <Row label="Replies" value={num(totals.replies)} />
        <Row label="Reply rate" value={pct(totals.replyRate)} />
        {showOpens && <Row label="Open rate" value={pct(totals.openRate)} />}
        {showConnections && (
          <Row label="Connections" value={num(totals.connectionsAccepted)} />
        )}
        <Row label="Replied prospects" value={num(totals.prospectsReplied)} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
