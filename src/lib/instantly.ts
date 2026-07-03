// Instantly.ai API v2 client.
// Docs: https://developer.instantly.ai  | OpenAPI: https://api.instantly.ai/openapi/api_v2.json
// Auth: Authorization: Bearer <API_KEY>  (create at app.instantly.ai → Settings → Integrations → API Keys)

import { Campaign, Prospect } from "./types";
import { parseDealership } from "./format";

const BASE = "https://api.instantly.ai/api/v2";

function apiKey(): string | null {
  return process.env.INSTANTLY_API_KEY?.trim() || null;
}

async function req<T>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error("INSTANTLY_API_KEY is not set");

  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    // Always hit the live API; never serve a stale cached value.
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Instantly ${path} -> ${res.status} ${res.statusText} ${text.slice(0, 300)}`,
    );
  }
  return (await res.json()) as T;
}

// ---- Raw API response shapes (only the fields we use) ----

interface RawAnalytics {
  campaign_id: string;
  campaign_name: string;
  campaign_status: number;
  leads_count?: number;
  emails_sent_count?: number;
  contacted_count?: number;
  open_count_unique?: number;
  open_count?: number;
  reply_count_unique?: number;
  reply_count?: number;
  bounced_count?: number;
}

interface RawLead {
  id: string;
  campaign?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  job_title?: string;
  email_open_count?: number;
  email_reply_count?: number;
  status_summary?: {
    lastStep?: { timestamp_executed?: string };
  };
}

interface LeadsListResponse {
  items: RawLead[];
  next_starting_after?: string | null;
}

const STATUS_LABEL: Record<number, string> = {
  0: "Draft",
  1: "Active",
  2: "Paused",
  3: "Completed",
  4: "Running Subsequences",
  [-1]: "Accounts Unhealthy",
  [-2]: "Bounce Protect",
  [-99]: "Account Suspended",
};

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

/** Fetch per-campaign analytics and normalize to the shared Campaign shape. */
export async function getCampaigns(): Promise<Campaign[]> {
  // Omitting `id`/`ids` returns analytics for all campaigns.
  const rows = await req<RawAnalytics[]>("/campaigns/analytics");
  return rows.map((r) => {
    const sent = r.emails_sent_count ?? 0;
    const opens = r.open_count_unique ?? r.open_count ?? 0;
    const replies = r.reply_count_unique ?? r.reply_count ?? 0;
    const name = r.campaign_name ?? "(untitled)";
    return {
      id: r.campaign_id,
      platform: "instantly" as const,
      name,
      dealership: parseDealership(name),
      status: STATUS_LABEL[r.campaign_status] ?? String(r.campaign_status ?? ""),
      leads: r.leads_count ?? 0,
      sent,
      opens,
      replies,
      connectionsAccepted: 0,
      openRate: rate(opens, sent),
      replyRate: rate(replies, sent),
      bounced: r.bounced_count ?? 0,
    };
  });
}

/** List leads matching a server-side filter, following pagination. */
async function listLeads(filter: string, cap = 500): Promise<RawLead[]> {
  const out: RawLead[] = [];
  let cursor: string | null | undefined = undefined;
  // Guard against runaway loops; cap total pages.
  for (let page = 0; page < 20 && out.length < cap; page++) {
    const body: Record<string, unknown> = { filter, limit: 100 };
    if (cursor) body.starting_after = cursor;
    const resp: LeadsListResponse = await req<LeadsListResponse>(
      "/leads/list",
      { method: "POST", body },
    );
    out.push(...(resp.items ?? []));
    cursor = resp.next_starting_after;
    if (!cursor) break;
  }
  return out;
}

function leadToProspect(
  lead: RawLead,
  campaignNames: Map<string, string>,
): Prospect {
  const name =
    [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim() ||
    lead.email ||
    "(unknown)";
  return {
    id: lead.id,
    platform: "instantly",
    name,
    email: lead.email ?? null,
    company: lead.company_name ?? null,
    title: lead.job_title ?? null,
    campaignId: lead.campaign ?? null,
    campaignName: lead.campaign ? campaignNames.get(lead.campaign) ?? null : null,
    opened: (lead.email_open_count ?? 0) > 0,
    replied: (lead.email_reply_count ?? 0) > 0,
    profileUrl: null,
    lastActivity: lead.status_summary?.lastStep?.timestamp_executed ?? null,
  };
}

/**
 * Prospects who engaged: everyone who replied, plus everyone who opened
 * but hasn't replied. Deduplicated by lead id.
 */
export async function getEngagedProspects(
  campaignNames: Map<string, string>,
): Promise<Prospect[]> {
  const [replied, openedNoReply] = await Promise.all([
    listLeads("FILTER_VAL_REPLIED"),
    listLeads("FILTER_VAL_OPENED_NO_REPLY"),
  ]);
  const byId = new Map<string, Prospect>();
  for (const lead of [...replied, ...openedNoReply]) {
    if (!byId.has(lead.id)) byId.set(lead.id, leadToProspect(lead, campaignNames));
  }
  return [...byId.values()];
}
