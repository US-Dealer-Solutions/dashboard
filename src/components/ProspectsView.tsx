"use client";

import { useMemo, useState } from "react";
import { Prospect } from "@/lib/types";
import { timeAgo, num } from "@/lib/format";
import { PlatformBadge, StatusPill } from "./ui";

type EngageFilter = "all" | "replied" | "connected" | "opened";
type PlatformFilter = "all" | "instantly" | "heyreach";

export default function ProspectsView({ prospects }: { prospects: Prospect[] }) {
  const [search, setSearch] = useState("");
  const [engage, setEngage] = useState<EngageFilter>("all");
  const [platform, setPlatform] = useState<PlatformFilter>("all");

  const stats = useMemo(
    () => ({
      replied: prospects.filter((p) => p.replied).length,
      connected: prospects.filter((p) => p.connected).length,
      opened: prospects.filter((p) => p.opened).length,
    }),
    [prospects],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prospects.filter((p) => {
      if (platform !== "all" && !p.channels.includes(platform)) return false;
      if (engage === "replied" && !p.replied) return false;
      if (engage === "connected" && !p.connected) return false;
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
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Replied" value={stats.replied} tone="green" />
        <StatTile
          label="Connections accepted"
          value={stats.connected}
          tone="blue"
        />
        <StatTile label="Opened" value={stats.opened} tone="amber" />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, dealership, email…"
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-neutral-900 sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Segmented
            value={engage}
            onChange={(v) => setEngage(v as EngageFilter)}
            options={[
              { value: "all", label: "All" },
              { value: "replied", label: "Replied" },
              { value: "connected", label: "Connected" },
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

      <div className="text-sm text-slate-500 dark:text-slate-400">
        {filtered.length} prospect{filtered.length === 1 ? "" : "s"}
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <ProspectCard key={`${p.platform}-${p.id}`} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProspectCard({ p }: { p: Prospect }) {
  const [showMsg, setShowMsg] = useState(false);
  const initials = p.name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600 dark:bg-neutral-700 dark:text-slate-200">
            {initials || "?"}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900 dark:text-white">
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
              </span>
              {p.channels.map((ch) => (
                <PlatformBadge key={ch} platform={ch} />
              ))}
            </div>
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
              {[p.title, p.company].filter(Boolean).join(" · ") || p.email || ""}
            </div>
            {p.campaignName && (
              <div className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                {p.campaignName}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex flex-wrap justify-end gap-1.5">
            {p.replied && <StatusPill tone="green">Replied</StatusPill>}
            {p.connected && (
              <StatusPill tone="green">Connection accepted</StatusPill>
            )}
            {p.opened && !p.replied && (
              <StatusPill tone="amber">Opened</StatusPill>
            )}
          </div>
          <span className="text-xs text-slate-400">
            {timeAgo(p.lastActivity)}
          </span>
        </div>
      </div>

      {/* Next message */}
      {p.nextMessage ? (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-neutral-950">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Next message · {p.nextMessage.label}
            </div>
            {p.nextMessage.available && (
              <button
                onClick={() => setShowMsg((v) => !v)}
                className="text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
              >
                {showMsg ? "Hide" : "Preview"}
              </button>
            )}
          </div>
          {p.nextMessage.subject && (
            <div className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
              {p.nextMessage.subject}
            </div>
          )}
          {p.nextMessage.available ? (
            showMsg && (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {p.nextMessage.preview}
              </p>
            )
          ) : (
            <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              LinkedIn message copy isn’t available from the HeyReach API.
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          {p.replied
            ? "They replied — sequence paused, your turn."
            : "No further messages queued."}
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "blue" | "amber";
}) {
  const accent = {
    green: "text-emerald-600 dark:text-emerald-400",
    blue: "text-blue-600 dark:text-blue-400",
    amber: "text-amber-600 dark:text-amber-400",
  }[tone];
  return (
    <div className="rounded-xl border border-black/10 bg-white p-3 text-center shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:p-4">
      <div className={`text-2xl font-semibold tabular-nums sm:text-3xl ${accent}`}>
        {num(value)}
      </div>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {label}
      </div>
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
    <div className="inline-flex rounded-lg border border-black/10 bg-slate-50 p-0.5 dark:border-white/10 dark:bg-neutral-800">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === o.value
              ? "bg-white text-black shadow-sm dark:bg-neutral-700 dark:text-white"
              : "text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white"
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
    <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">
      No prospects match these filters yet. As people open, reply, or accept a
      LinkedIn connection, they’ll show up here.
    </div>
  );
}
