// Aggregates Instantly + HeyReach into one DashboardData payload.
// If one platform's key is missing or its API errors, we record a non-fatal
// error and still return the other platform's data.

import * as instantly from "./instantly";
import * as heyreach from "./heyreach";
import {
  Campaign,
  CampaignMessaging,
  Conversation,
  DashboardData,
  Platform,
  Prospect,
  Totals,
  emptyTotals,
} from "./types";

function totalsFor(campaigns: Campaign[], prospects: Prospect[]): Totals {
  const t = emptyTotals();
  for (const c of campaigns) {
    t.sent += c.sent;
    t.opens += c.opens;
    t.replies += c.replies;
    t.connectionsAccepted += c.connectionsAccepted;
    t.bounced += c.bounced;
  }
  t.openRate = t.sent > 0 ? t.opens / t.sent : 0;
  t.replyRate = t.sent > 0 ? t.replies / t.sent : 0;
  t.prospectsOpened = prospects.filter((p) => p.opened).length;
  t.prospectsReplied = prospects.filter((p) => p.replied).length;
  t.prospectsConnected = prospects.filter((p) => p.connected).length;
  return t;
}

/**
 * Merge duplicate prospects (same person surfacing from more than one source
 * or channel) into one row, keyed by email or normalized name+company.
 */
function dedupeProspects(prospects: Prospect[]): Prospect[] {
  const byKey = new Map<string, Prospect>();
  for (const p of prospects) {
    const key = (
      p.email?.toLowerCase().trim() ||
      `${p.name}|${p.company ?? ""}`.toLowerCase().trim()
    ).replace(/\s+/g, " ");
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...p, channels: [...p.channels] });
      continue;
    }
    // Merge engagement flags and channels into the existing record.
    existing.opened = existing.opened || p.opened;
    existing.replied = existing.replied || p.replied;
    existing.connected = existing.connected || p.connected;
    existing.connectionStatus = existing.connectionStatus ?? p.connectionStatus;
    existing.email = existing.email ?? p.email;
    existing.company = existing.company ?? p.company;
    existing.title = existing.title ?? p.title;
    existing.profileUrl = existing.profileUrl ?? p.profileUrl;
    existing.campaignName = existing.campaignName ?? p.campaignName;
    existing.nextMessage = existing.nextMessage ?? p.nextMessage;
    for (const ch of p.channels)
      if (!existing.channels.includes(ch)) existing.channels.push(ch);
    if ((p.lastActivity ?? "") > (existing.lastActivity ?? ""))
      existing.lastActivity = p.lastActivity;
  }
  return [...byKey.values()];
}

async function loadPlatform(
  platform: Platform,
  errors: DashboardData["errors"],
): Promise<{
  campaigns: Campaign[];
  prospects: Prospect[];
  messaging: CampaignMessaging[];
  conversations: Conversation[];
}> {
  const client = platform === "instantly" ? instantly : heyreach;
  try {
    const [campaigns, messaging, conversations] = await Promise.all([
      client.getCampaigns(),
      client.getMessaging(),
      client.getConversations(),
    ]);
    const names = new Map(campaigns.map((c) => [c.id, c.name]));
    const prospects = await client.getEngagedProspects(names);
    return { campaigns, prospects, messaging, conversations };
  } catch (err) {
    errors.push({
      platform,
      message: err instanceof Error ? err.message : String(err),
    });
    return { campaigns: [], prospects: [], messaging: [], conversations: [] };
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const errors: DashboardData["errors"] = [];

  const [inst, hey] = await Promise.all([
    loadPlatform("instantly", errors),
    loadPlatform("heyreach", errors),
  ]);

  const campaigns = [...inst.campaigns, ...hey.campaigns];
  const messaging: CampaignMessaging[] = [...inst.messaging, ...hey.messaging];
  const conversations: Conversation[] = [
    ...inst.conversations,
    ...hey.conversations,
  ].sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
  const prospects = dedupeProspects([
    ...inst.prospects,
    ...hey.prospects,
  ]).sort((a, b) => {
    // Replied first, then connected, then opened, then most recent activity.
    const rank = (p: Prospect) =>
      p.replied ? 0 : p.connected ? 1 : p.opened ? 2 : 3;
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "");
  });

  return {
    totals: totalsFor(campaigns, prospects),
    byPlatform: {
      instantly: totalsFor(inst.campaigns, inst.prospects),
      heyreach: totalsFor(hey.campaigns, hey.prospects),
    },
    campaigns,
    prospects,
    messaging,
    conversations,
    errors,
    fetchedAt: new Date().toISOString(),
  };
}
