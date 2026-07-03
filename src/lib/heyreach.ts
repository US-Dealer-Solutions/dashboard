// HeyReach API client (LinkedIn outreach automation).
// Docs (Postman): https://documenter.getpostman.com/view/23808049/2sA2xb5F75
// Auth: X-API-KEY: <API_KEY>  (Settings → Integrations → Public API)
// Note: most list/stat endpoints are POST with a JSON body { offset, limit, ... }.

import { Campaign, Prospect } from "./types";
import { parseDealership } from "./format";

const BASE = "https://api.heyreach.io/api/public";

function apiKey(): string | null {
  return process.env.HEYREACH_API_KEY?.trim() || null;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error("HEYREACH_API_KEY is not set");

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "X-API-KEY": key,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `HeyReach ${path} -> ${res.status} ${res.statusText} ${text.slice(0, 300)}`,
    );
  }
  return (await res.json()) as T;
}

// ---- Raw API shapes (only fields we use) ----

interface RawCampaign {
  id: number;
  name: string;
  status: string;
  // Lead totals appear under different keys depending on the account; we try
  // several and fall back to uniqueLeadsContacted from the stats endpoint.
  totalLeads?: number;
  leadsCount?: number;
  progressStats?: { totalUsers?: number; totalLeads?: number };
}

interface CampaignListResponse {
  totalCount: number;
  items: RawCampaign[];
}

interface OverallStats {
  overallStats?: {
    messagesSent?: number;
    totalMessageReplies?: number;
    connectionsSent?: number;
    connectionsAccepted?: number;
    uniqueLeadsContacted?: number;
    messageReplyRate?: number;
    connectionAcceptanceRate?: number;
  };
}

interface ConversationMessage {
  isIncoming?: boolean;
  sentAt?: string;
  createdAt?: string;
}

interface Conversation {
  leadId?: number | string;
  leadName?: string;
  profileUrl?: string;
  companyName?: string;
  position?: string;
  campaignId?: number;
  messages?: ConversationMessage[];
}

interface ConversationsResponse {
  totalCount: number;
  items?: Conversation[];
  conversations?: Conversation[];
}

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

/** List all campaigns, following pagination. */
async function listRawCampaigns(): Promise<RawCampaign[]> {
  const out: RawCampaign[] = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const resp = await post<CampaignListResponse>("/campaign/GetAll", {
      offset,
      limit: 100,
    });
    const items = resp.items ?? [];
    out.push(...items);
    if (out.length >= (resp.totalCount ?? out.length) || items.length === 0) break;
  }
  return out;
}

/**
 * Fetch campaigns with per-campaign stats. HeyReach has no per-campaign
 * analytics endpoint, so we call GetOverallStats once per campaign with a
 * campaignIds filter.
 */
export async function getCampaigns(): Promise<Campaign[]> {
  const raw = await listRawCampaigns();
  const stats = await Promise.all(
    raw.map((c) =>
      post<OverallStats>("/stats/GetOverallStats", {
        accountIds: [],
        campaignIds: [c.id],
        // No date bounds -> lifetime stats.
      }).catch(() => ({}) as OverallStats),
    ),
  );

  return raw.map((c, i) => {
    const s = stats[i].overallStats ?? {};
    const sent = s.messagesSent ?? 0;
    const replies = s.totalMessageReplies ?? 0;
    const name = c.name ?? "(untitled)";
    const leads =
      c.totalLeads ??
      c.leadsCount ??
      c.progressStats?.totalLeads ??
      c.progressStats?.totalUsers ??
      s.uniqueLeadsContacted ??
      0;
    return {
      id: String(c.id),
      platform: "heyreach" as const,
      name,
      dealership: parseDealership(name),
      status: c.status ?? "",
      leads,
      sent,
      opens: 0, // not applicable to LinkedIn outreach
      replies,
      connectionsAccepted: s.connectionsAccepted ?? 0,
      openRate: 0,
      replyRate: s.messageReplyRate ?? rate(replies, sent),
      bounced: 0,
    };
  });
}

/**
 * Prospects who replied. HeyReach has no reliable "opened" signal, so the
 * dependable engagement signal is an incoming message in the inbox.
 */
export async function getEngagedProspects(
  campaignNames: Map<string, string>,
): Promise<Prospect[]> {
  const byId = new Map<string, Prospect>();

  for (let offset = 0; offset < 5000; offset += 50) {
    const resp = await post<ConversationsResponse>(
      "/inbox/GetConversationsV2",
      { offset, limit: 50, filters: {} },
    );
    const convos = resp.items ?? resp.conversations ?? [];
    if (convos.length === 0) break;

    for (const c of convos) {
      const msgs = c.messages ?? [];
      const replied = msgs.some((m) => m.isIncoming === true);
      if (!replied) continue; // only surface prospects who actually replied

      const incoming = msgs.filter((m) => m.isIncoming === true);
      const last = incoming[incoming.length - 1];
      const id = String(c.leadId ?? c.profileUrl ?? c.leadName ?? Math.random());
      const cid = c.campaignId != null ? String(c.campaignId) : null;

      byId.set(id, {
        id,
        platform: "heyreach",
        name: c.leadName ?? "(unknown)",
        email: null,
        company: c.companyName ?? null,
        title: c.position ?? null,
        campaignId: cid,
        campaignName: cid ? campaignNames.get(cid) ?? null : null,
        opened: false,
        replied: true,
        profileUrl: c.profileUrl ?? null,
        lastActivity: last?.sentAt ?? last?.createdAt ?? null,
      });
    }

    if (convos.length >= (resp.totalCount ?? convos.length)) break;
  }

  return [...byId.values()];
}
