"use client";

import { Campaign } from "@/lib/types";
import { num, pct } from "@/lib/format";
import { PlatformBadge } from "./ui";

export default function CampaignsView({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-gray-500 dark:border-white/15 dark:text-gray-400">
        No campaigns found.
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-black/10 dark:border-white/10 md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Campaign</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Sent</th>
              <th className="px-4 py-3 text-right font-medium">Open rate</th>
              <th className="px-4 py-3 text-right font-medium">Replies</th>
              <th className="px-4 py-3 text-right font-medium">Reply rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {campaigns.map((c) => (
              <tr
                key={`${c.platform}-${c.id}`}
                className="bg-white hover:bg-gray-50 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">
                  <PlatformBadge platform={c.platform} />
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {c.status}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {num(c.sent)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {c.platform === "instantly" ? pct(c.openRate) : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {num(c.replies)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {pct(c.replyRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {campaigns.map((c) => (
          <div
            key={`${c.platform}-${c.id}`}
            className="rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">{c.name}</div>
              <PlatformBadge platform={c.platform} />
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {c.status}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="Sent" value={num(c.sent)} />
              <Stat
                label="Open"
                value={c.platform === "instantly" ? pct(c.openRate) : "—"}
              />
              <Stat label="Reply" value={pct(c.replyRate)} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 py-2 dark:bg-neutral-800">
      <div className="text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}
