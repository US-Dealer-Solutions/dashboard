// HeyReach API client (LinkedIn outreach automation).
// Docs (Postman): https://documenter.getpostman.com/view/23808049/2sA2xb5F75
// Auth: X-API-KEY: <API_KEY>  (Settings → Integrations → Public API)
// Note: most list/stat endpoints are POST with a JSON body { offset, limit, ... }.

import {
  Campaign,
  CampaignMessaging,
  Conversation,
  ConversationMessage,
  Prospect,
} from "./types";
import { trackFromName } from "./format";

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

interface RawList {
  id: number;
  name: string;
  totalItemsCount?: number;
  campaignIds?: number[];
}

interface ListGetAllResponse {
  totalCount: number;
  items: RawList[];
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

// Actual shape returned by /inbox/GetConversationsV2.
interface RawInboxMessage {
  createdAt?: string;
  body?: string;
  subject?: string;
  sender?: string; // "CORRESPONDENT" = them; anything else = the connected account
  isInMail?: boolean;
}

interface RawCorrespondent {
  firstName?: string;
  lastName?: string;
  headline?: string;
  companyName?: string;
  position?: string;
  location?: string;
  profileUrl?: string;
  imageUrl?: string;
}

interface RawConvo {
  id?: string;
  read?: boolean;
  lastMessageAt?: string;
  lastMessageText?: string;
  lastMessageSender?: string;
  totalMessages?: number;
  campaignId?: number;
  correspondentProfile?: RawCorrespondent;
  messages?: RawInboxMessage[];
}

interface InboxResponse {
  totalCount: number;
  items?: RawConvo[];
}

function normalizeConvo(c: RawConvo): Conversation {
  const p = c.correspondentProfile ?? {};
  const name =
    [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "(unknown)";
  const messages: ConversationMessage[] = (c.messages ?? [])
    .map((m) => ({
      from: (m.sender === "CORRESPONDENT" ? "them" : "us") as "them" | "us",
      text: m.body ?? "",
      at: m.createdAt ?? null,
    }))
    .sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));
  return {
    id: String(c.id ?? p.profileUrl ?? name),
    platform: "heyreach",
    name,
    headline: p.headline?.trim() || null,
    company: p.companyName?.trim() || null,
    title: p.position?.trim() || null,
    profileUrl: p.profileUrl ?? null,
    imageUrl: p.imageUrl ?? null,
    location: p.location?.trim() || null,
    lastMessageAt: c.lastMessageAt ?? null,
    lastMessageText: c.lastMessageText ?? "",
    lastFrom: c.lastMessageSender === "CORRESPONDENT" ? "them" : "us",
    totalMessages: c.totalMessages ?? messages.length,
    unread: c.read === false,
    messages,
  };
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

/** List all lead lists (leads are staged here before a campaign is built). */
async function listRawLists(): Promise<RawList[]> {
  const out: RawList[] = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const resp = await post<ListGetAllResponse>("/list/GetAll", {
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
 * Returns HeyReach campaigns (with per-campaign stats) plus lead lists that
 * aren't yet attached to a campaign, so staged leads still show on the board.
 * HeyReach has no per-campaign analytics endpoint, so we call GetOverallStats
 * once per campaign with a campaignIds filter.
 */
export async function getCampaigns(): Promise<Campaign[]> {
  const [raw, lists] = await Promise.all([listRawCampaigns(), listRawLists()]);

  const stats = await Promise.all(
    raw.map((c) =>
      post<OverallStats>("/stats/GetOverallStats", {
        accountIds: [],
        campaignIds: [c.id],
        // No date bounds -> lifetime stats.
      }).catch(() => ({}) as OverallStats),
    ),
  );

  const campaigns: Campaign[] = raw.map((c, i) => {
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
      platform: "heyreach",
      name,
      track: trackFromName(name),
      status: c.status ?? "",
      staged: false,
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

  // Show lists that aren't yet attached to any campaign as "staged" entries.
  const staged: Campaign[] = lists
    .filter((l) => !(l.campaignIds && l.campaignIds.length > 0))
    .map((l) => ({
      id: `list-${l.id}`,
      platform: "heyreach",
      name: l.name ?? "(untitled list)",
      track: trackFromName(l.name ?? ""),
      status: "List (staged)",
      staged: true,
      leads: l.totalItemsCount ?? 0,
      sent: 0,
      opens: 0,
      replies: 0,
      connectionsAccepted: 0,
      openRate: 0,
      replyRate: 0,
      bounced: 0,
    }));

  return [...campaigns, ...staged];
}

/**
 * HeyReach message sequences. The public API does not expose the written
 * connection-note / message copy for staged lists — it only becomes available
 * once a campaign is launched on top of a list. Until then this returns [].
 */
export async function getMessaging(): Promise<CampaignMessaging[]> {
  return [];
}

/** Fetch and normalize every inbox conversation, following pagination. */
async function fetchAllConvos(): Promise<RawConvo[]> {
  const out: RawConvo[] = [];
  for (let offset = 0; offset < 5000; offset += 50) {
    const resp = await post<InboxResponse>("/inbox/GetConversationsV2", {
      offset,
      limit: 50,
      filters: {},
    });
    const items = resp.items ?? [];
    out.push(...items);
    if (items.length === 0 || out.length >= (resp.totalCount ?? out.length))
      break;
  }
  return out;
}

/** All live inbox conversations, newest first. */
export async function getConversations(): Promise<Conversation[]> {
  const raw = await fetchAllConvos();
  return raw
    .map(normalizeConvo)
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
}

/**
 * Prospects who replied to our outreach. We only count conversations tied to a
 * campaign (campaignId set) so unrelated inbound LinkedIn messages don't show
 * up as dealership prospects.
 */
export async function getEngagedProspects(
  campaignNames: Map<string, string>,
): Promise<Prospect[]> {
  const raw = await fetchAllConvos();
  const byId = new Map<string, Prospect>();

  for (const c of raw) {
    if (c.campaignId == null) continue; // skip non-campaign inbox threads
    const msgs = c.messages ?? [];
    const replied =
      c.lastMessageSender === "CORRESPONDENT" ||
      msgs.some((m) => m.sender === "CORRESPONDENT");
    if (!replied) continue;

    const conv = normalizeConvo(c);
    const cid = String(c.campaignId);
    byId.set(conv.id, {
      id: conv.id,
      platform: "heyreach",
      name: conv.name,
      email: null,
      company: conv.company,
      title: conv.title,
      campaignId: cid,
      campaignName: campaignNames.get(cid) ?? null,
      opened: false,
      replied: true,
      profileUrl: conv.profileUrl,
      lastActivity: conv.lastMessageAt,
    });
  }

  return [...byId.values()];
}
