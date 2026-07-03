"use client";

import { useMemo } from "react";
import { Campaign } from "@/lib/types";
import { num, pct } from "@/lib/format";
import { PlatformBadge, StatusPill } from "./ui";

export default function CampaignsView({ campaigns }: { campaigns: Campaign[] }) {
  // Group campaigns by audience/track so email + LinkedIn for the same
  // audience sit together.
  const groups = useMemo(() => {
    const map = new Map<string, Campaign[]>();
    for (const c of campaigns) {
      const key = c.track || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [campaigns]);

  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">
        No campaigns or lists found yet. Once your Instantly campaigns and
        HeyReach lists are created, each audience track and its lead counts will
        appear here.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map(([track, list]) => {
        const totalLeads = list.reduce((s, c) => s + c.leads, 0);
        return (
          <section key={track} className="space-y-3">
            {/* Track header */}
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
                {track}
              </h2>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {num(totalLeads)} leads · {list.length} campaign
                {list.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-black/10 dark:border-white/10 md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-neutral-800 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Campaign / List</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Leads</th>
                    <th className="px-4 py-3 text-right font-medium">Sent</th>
                    <th className="px-4 py-3 text-right font-medium">Open rate</th>
                    <th className="px-4 py-3 text-right font-medium">Replies</th>
                    <th className="px-4 py-3 text-right font-medium">Reply rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {list.map((c) => (
                    <tr
                      key={`${c.platform}-${c.id}`}
                      className="bg-white hover:bg-slate-50 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                    >
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3">
                        <PlatformBadge platform={c.platform} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={c.staged ? "amber" : "gray"}>
                          {c.status}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {num(c.leads)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {c.staged ? "—" : num(c.sent)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {c.platform === "instantly" && !c.staged
                          ? pct(c.openRate)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {c.staged ? "—" : num(c.replies)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {c.staged ? "—" : pct(c.replyRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {list.map((c) => (
                <div
                  key={`${c.platform}-${c.id}`}
                  className="rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">{c.name}</div>
                    <PlatformBadge platform={c.platform} />
                  </div>
                  <div className="mt-1">
                    <StatusPill tone={c.staged ? "amber" : "gray"}>
                      {c.status}
                    </StatusPill>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <Stat label="Leads" value={num(c.leads)} />
                    <Stat label="Sent" value={c.staged ? "—" : num(c.sent)} />
                    <Stat
                      label="Open"
                      value={
                        c.platform === "instantly" && !c.staged
                          ? pct(c.openRate)
                          : "—"
                      }
                    />
                    <Stat
                      label="Reply"
                      value={c.staged ? "—" : pct(c.replyRate)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2 dark:bg-neutral-800">
      <div className="text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
