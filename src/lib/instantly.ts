// Instantly.ai API v2 client.
// Docs: https://developer.instantly.ai  | OpenAPI: https://api.instantly.ai/openapi/api_v2.json
// Auth: Authorization: Bearer <API_KEY>  (create at app.instantly.ai → Settings → Integrations → API Keys)

import { Campaign, Prospect } from "./types";
import { trackFromName } from "./format";

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

interface RawCampaignListItem {
  id: string;
  name: string;
  status: number;
}

interface CampaignListResponse {
  items: RawCampaignListItem[];
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

/** List every campaign (all statuses, including drafts), following pagination. */
async function listAllCampaigns(): Promise<RawCampaignListItem[]> {
  const out: RawCampaignListItem[] = [];
  let cursor: string | null | undefined;
  for (let page = 0; page < 20; page++) {
    const qs = cursor
      ? `?limit=100&starting_after=${encodeURIComponent(cursor)}`
      : "?limit=100";
    const resp = await req<CampaignListResponse>(`/campaigns${qs}`);
    out.push(...(resp.items ?? []));
    cursor = resp.next_starting_after;
    if (!cursor) break;
  }
  return out;
}

/** Count leads assigned to a campaign (drafts have no analytics lead count). */
async function countLeads(campaignId: string): Promise<number> {
  let total = 0;
  let cursor: string | null | undefined;
  // Cap at 20 pages (2,000 leads) to stay cheap; good enough for a count badge.
  for (let page = 0; page < 20; page++) {
    const body: Record<string, unknown> = { campaign: campaignId, limit: 100 };
    if (cursor) body.starting_after = cursor;
    const resp = await req<LeadsListResponse>("/leads/list", {
      method: "POST",
      body,
    });
    total += resp.items?.length ?? 0;
    cursor = resp.next_starting_after;
    if (!cursor) break;
  }
  return total;
}

/**
 * Fetch all campaigns (source of truth = the campaigns list so drafts appear),
 * merge in analytics for metrics, and resolve a lead count for each.
 */
export async function getCampaigns(): Promise<Campaign[]> {
  const [list, analytics] = await Promise.all([
    listAllCampaigns(),
    req<RawAnalytics[]>("/campaigns/analytics").catch(() => [] as RawAnalytics[]),
  ]);
  const byId = new Map(analytics.map((a) => [a.campaign_id, a]));

  return Promise.all(
    list.map(async (c): Promise<Campaign> => {
      const a = byId.get(c.id);
      const sent = a?.emails_sent_count ?? 0;
      const opens = a?.open_count_unique ?? a?.open_count ?? 0;
      const replies = a?.reply_count_unique ?? a?.reply_count ?? 0;
      // Prefer the analytics lead count; fall back to counting leads for drafts.
      const leads = a?.leads_count ?? (await countLeads(c.id).catch(() => 0));
      const name = c.name ?? "(untitled)";
      return {
        id: c.id,
        platform: "instantly",
        name,
        track: trackFromName(name),
        status: STATUS_LABEL[c.status] ?? String(c.status ?? ""),
        staged: false,
        leads,
        sent,
        opens,
        replies,
        connectionsAccepted: 0,
        openRate: rate(opens, sent),
        replyRate: rate(replies, sent),
        bounced: a?.bounced_count ?? 0,
      };
    }),
  );
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
