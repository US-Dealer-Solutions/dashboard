"use client";

import { useMemo, useState } from "react";
import { Prospect } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { PlatformBadge, StatusPill } from "./ui";

type EngageFilter = "all" | "replied" | "opened";
type PlatformFilter = "all" | "instantly" | "heyreach";

export default function ProspectsView({ prospects }: { prospects: Prospect[] }) {
  const [search, setSearch] = useState("");
  const [engage, setEngage] = useState<EngageFilter>("all");
  const [platform, setPlatform] = useState<PlatformFilter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prospects.filter((p) => {
      if (platform !== "all" && p.platform !== platform) return false;
      if (engage === "replied" && !p.replied) return false;
      if (engage === "opened" && !p.opened) return false;
      if (q) {
        const hay = `${p.name} ${p.email ?? ""} ${p.company ?? ""} ${
          p.title ?? ""
        } ${p.campaignName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [prospects, search, engage, platform]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, company, email…"
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-neutral-900 sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Segmented
            value={engage}
            onChange={(v) => setEngage(v as EngageFilter)}
            options={[
              { value: "all", label: "All" },
              { value: "replied", label: "Replied" },
              { value: "opened", label: "Opened" },
            ]}
          />
          <Segmented
            value={platform}
            onChange={(v) => setPlatform(v as PlatformFilter)}
            options={[
              { value: "all", label: "All" },
              { value: "instantly", label: "Email" },
              { value: "heyreach", label: "LinkedIn" },
            ]}
          />
        </div>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        {filtered.length} prospect{filtered.length === 1 ? "" : "s"}
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-black/10 dark:border-white/10 md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-800 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Prospect</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Campaign</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filtered.map((p) => (
                  <tr
                    key={`${p.platform}-${p.id}`}
                    className="bg-white hover:bg-gray-50 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {p.profileUrl ? (
                          <a
                            href={p.profileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            {p.name}
                          </a>
                        ) : (
                          p.name
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {p.email ?? p.title ?? ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">{p.company ?? "—"}</td>
                    <td className="px-4 py-3">{p.campaignName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <EngagePills p={p} />
                    </td>
                    <td className="px-4 py-3">
                      <PlatformBadge platform={p.platform} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {timeAgo(p.lastActivity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((p) => (
              <div
                key={`${p.platform}-${p.id}`}
                className="rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {p.profileUrl ? (
                        <a
                          href={p.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          {p.name}
                        </a>
                      ) : (
                        p.name
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {[p.title, p.company].filter(Boolean).join(" · ") ||
                        p.email ||
                        ""}
                    </div>
                  </div>
                  <PlatformBadge platform={p.platform} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <EngagePills p={p} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {timeAgo(p.lastActivity)}
                  </span>
                </div>
                {p.campaignName && (
                  <div className="mt-2 truncate text-xs text-gray-500 dark:text-gray-400">
                    {p.campaignName}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EngagePills({ p }: { p: Prospect }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {p.replied && <StatusPill tone="green">Replied</StatusPill>}
      {p.opened && !p.replied && <StatusPill tone="amber">Opened</StatusPill>}
      {!p.opened && !p.replied && <StatusPill tone="gray">Engaged</StatusPill>}
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-black/10 bg-gray-50 p-0.5 dark:border-white/10 dark:bg-neutral-800">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === o.value
              ? "bg-white text-black shadow-sm dark:bg-neutral-700 dark:text-white"
              : "text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-gray-500 dark:border-white/15 dark:text-gray-400">
      No prospects match these filters yet. As people open and reply to your
      outreach, they’ll show up here.
    </div>
  );
}
