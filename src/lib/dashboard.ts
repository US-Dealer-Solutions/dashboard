// Aggregates Instantly + HeyReach into one DashboardData payload.
// If one platform's key is missing or its API errors, we record a non-fatal
// error and still return the other platform's data.

import * as instantly from "./instantly";
import * as heyreach from "./heyreach";
import {
  Campaign,
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
  return t;
}

async function loadPlatform(
  platform: Platform,
  errors: DashboardData["errors"],
): Promise<{ campaigns: Campaign[]; prospects: Prospect[] }> {
  const client = platform === "instantly" ? instantly : heyreach;
  try {
    const campaigns = await client.getCampaigns();
    const names = new Map(campaigns.map((c) => [c.id, c.name]));
    const prospects = await client.getEngagedProspects(names);
    return { campaigns, prospects };
  } catch (err) {
    errors.push({
      platform,
      message: err instanceof Error ? err.message : String(err),
    });
    return { campaigns: [], prospects: [] };
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const errors: DashboardData["errors"] = [];

  const [inst, hey] = await Promise.all([
    loadPlatform("instantly", errors),
    loadPlatform("heyreach", errors),
  ]);

  const campaigns = [...inst.campaigns, ...hey.campaigns];
  const prospects = [...inst.prospects, ...hey.prospects].sort((a, b) => {
    // Replied first, then most recent activity.
    if (a.replied !== b.replied) return a.replied ? -1 : 1;
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
    errors,
    fetchedAt: new Date().toISOString(),
  };
}
