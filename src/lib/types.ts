// Shared types for the outreach dashboard.
// These normalize data from Instantly (email) and HeyReach (LinkedIn) into
// a single shape the UI can render without caring about the source platform.

export type Platform = "instantly" | "heyreach";

/** A single outreach campaign, normalized across platforms. */
export interface Campaign {
  id: string;
  platform: Platform;
  name: string;
  status: string;
  /** Emails sent (Instantly) or messages sent (HeyReach). */
  sent: number;
  /** Unique opens (Instantly only; 0 for HeyReach). */
  opens: number;
  /** Unique replies. */
  replies: number;
  /** Connection requests accepted (HeyReach only; 0 for Instantly). */
  connectionsAccepted: number;
  /** Open rate 0..1 (Instantly only). */
  openRate: number;
  /** Reply rate 0..1. */
  replyRate: number;
  bounced: number;
}

/** A prospect who has engaged (opened and/or replied), normalized. */
export interface Prospect {
  id: string;
  platform: Platform;
  name: string;
  email: string | null;
  company: string | null;
  title: string | null;
  campaignId: string | null;
  campaignName: string | null;
  /** True if the prospect opened at least one email (Instantly). */
  opened: boolean;
  /** True if the prospect replied. */
  replied: boolean;
  /** Optional profile/LinkedIn URL (HeyReach). */
  profileUrl: string | null;
  /** ISO timestamp of the most recent engagement, if known. */
  lastActivity: string | null;
}

/** Aggregated KPI totals for the overview view. */
export interface Totals {
  sent: number;
  opens: number;
  replies: number;
  connectionsAccepted: number;
  bounced: number;
  openRate: number;
  replyRate: number;
  prospectsOpened: number;
  prospectsReplied: number;
}

export interface DashboardData {
  totals: Totals;
  byPlatform: {
    instantly: Totals;
    heyreach: Totals;
  };
  campaigns: Campaign[];
  prospects: Prospect[];
  /** Non-fatal errors per platform (e.g. one API key missing/invalid). */
  errors: { platform: Platform; message: string }[];
  fetchedAt: string;
}

export function emptyTotals(): Totals {
  return {
    sent: 0,
    opens: 0,
    replies: 0,
    connectionsAccepted: 0,
    bounced: 0,
    openRate: 0,
    replyRate: 0,
    prospectsOpened: 0,
    prospectsReplied: 0,
  };
}
