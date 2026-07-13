"use client";

import { useMemo, useState } from "react";
import { Conversation } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { PlatformBadge } from "./ui";

type Filter = "all" | "unread" | "them";

export default function InboxView({
  conversations,
}: {
  conversations: Conversation[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter === "unread" && !c.unread) return false;
      if (filter === "them" && c.lastFrom !== "them") return false;
      if (q) {
        const hay = `${c.name} ${c.company ?? ""} ${c.title ?? ""} ${
          c.lastMessageText
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [conversations, filter, search]);

  if (conversations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">
        No live conversations yet. As your LinkedIn (HeyReach) outreach gets
        replies, the threads will appear here in real time.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations…"
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-neutral-900 sm:max-w-xs"
        />
        <Segmented
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          options={[
            { value: "all", label: "All" },
            { value: "unread", label: "Unread" },
            { value: "them", label: "Awaiting reply" },
          ]}
        />
      </div>

      <div className="text-sm text-slate-500 dark:text-slate-400">
        {filtered.length} conversation{filtered.length === 1 ? "" : "s"}
      </div>

      <div className="space-y-3">
        {filtered.map((c) => (
          <ConversationCard
            key={`${c.platform}-${c.id}`}
            c={c}
            open={openId === c.id}
            onToggle={() => setOpenId((cur) => (cur === c.id ? null : c.id))}
          />
        ))}
      </div>
    </div>
  );
}

function ConversationCard({
  c,
  open,
  onToggle,
}: {
  c: Conversation;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-slate-50 dark:hover:bg-neutral-800"
      >
        <Avatar name={c.name} src={c.imageUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-slate-900 dark:text-white">
              {c.name}
            </span>
            {c.unread && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />
            )}
            <PlatformBadge platform={c.platform} />
          </div>
          {(c.title || c.company) && (
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
              {[c.title, c.company].filter(Boolean).join(" · ")}
            </div>
          )}
          <div className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">
            {c.lastFrom === "us" && (
              <span className="text-slate-400">You: </span>
            )}
            {c.lastMessageText}
          </div>
        </div>
        <div className="shrink-0 text-right text-xs text-slate-400">
          {timeAgo(c.lastMessageAt)}
          <div className="mt-1">{c.totalMessages} msg</div>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-black/5 bg-slate-50 p-4 dark:border-white/5 dark:bg-neutral-950">
          {c.messages.length === 0 ? (
            <p className="text-center text-xs text-slate-400">
              Full thread not available from the API — showing the latest
              message only above.
            </p>
          ) : (
            c.messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.from === "us" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.from === "us"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-800 ring-1 ring-black/5 dark:bg-neutral-800 dark:text-slate-100 dark:ring-white/10"
                  }`}
                >
                  {m.text}
                  <div
                    className={`mt-1 text-[10px] ${
                      m.from === "us" ? "text-blue-100" : "text-slate-400"
                    }`}
                  >
                    {timeAgo(m.at)}
                  </div>
                </div>
              </div>
            ))
          )}
          {c.profileUrl && (
            <div className="pt-1 text-center">
              <a
                href={c.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-blue-700 hover:underline dark:text-blue-400"
              >
                View LinkedIn profile ↗
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600 dark:bg-neutral-700 dark:text-slate-200">
      {initials || "?"}
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
