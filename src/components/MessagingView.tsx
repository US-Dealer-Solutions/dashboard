"use client";

import { useMemo, useState } from "react";
import { CampaignMessaging, MessagingStep } from "@/lib/types";
import { PlatformBadge, StatusPill, statusTone } from "./ui";

export default function MessagingView({
  messaging,
}: {
  messaging: CampaignMessaging[];
}) {
  // Group sequences by audience track.
  const groups = useMemo(() => {
    const map = new Map<string, CampaignMessaging[]>();
    for (const m of messaging) {
      const key = m.track || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [messaging]);

  const hasSteps = messaging.some((m) => m.steps.length > 0);

  if (!hasSteps) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">
        No message copy available yet. Email sequences appear here once your
        Instantly campaigns have steps written; LinkedIn copy appears once your
        HeyReach campaigns are launched.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        The exact copy being sent at each step of the sequence. Personalization
        tokens like <code className="rounded bg-slate-100 px-1 dark:bg-neutral-800">{"{{firstName}}"}</code>{" "}
        are filled per prospect when the message sends.
      </p>

      {groups.map(([track, seqs]) => (
        <section key={track} className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
            {track}
          </h2>
          {seqs.map((seq) => (
            <SequenceCard key={`${seq.platform}-${seq.campaignId}`} seq={seq} />
          ))}
        </section>
      ))}
    </div>
  );
}

function SequenceCard({ seq }: { seq: CampaignMessaging }) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 px-4 py-3 dark:border-white/5">
        <div className="min-w-0">
          <div className="truncate font-medium text-slate-900 dark:text-white">
            {seq.name}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {seq.steps.length} step{seq.steps.length === 1 ? "" : "s"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone={statusTone(seq.status)}>{seq.status}</StatusPill>
          <PlatformBadge platform={seq.platform} />
        </div>
      </div>
      <div className="divide-y divide-black/5 dark:divide-white/5">
        {seq.steps.map((step, i) => (
          <StepRow key={i} step={step} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}

function StepRow({
  step,
  defaultOpen,
}: {
  step: MessagingStep;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const label =
    step.type === "email"
      ? step.subject ?? "(follow-up · same thread)"
      : humanType(step.type);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-neutral-800"
      >
        <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-blue-700 px-2 text-xs font-semibold text-white">
          Day {step.day}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
          {label}
        </span>
        {step.variantCount > 1 && (
          <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">
            {step.variantCount} variants
          </span>
        )}
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          {step.type === "email" && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Subject:</span>{" "}
              {step.subject ?? "(none — continues previous thread)"}
            </div>
          )}
          <div
            className="prose-email max-w-none rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 dark:bg-neutral-950 dark:text-slate-200"
            // Body is sanitized server-side in lib/sanitize.ts before it reaches here.
            dangerouslySetInnerHTML={{ __html: step.body || "<em>(empty)</em>" }}
          />
        </div>
      )}
    </div>
  );
}

function humanType(type: string): string {
  const map: Record<string, string> = {
    connection_request: "LinkedIn connection request",
    linkedin_message: "LinkedIn message",
    linkedin_connection: "LinkedIn connection request",
    inmail: "LinkedIn InMail",
    view_profile: "View profile",
  };
  return map[type] ?? type.replace(/_/g, " ");
}
