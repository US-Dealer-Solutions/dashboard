// Shared types for the outreach dashboard.
// These normalize data from Instantly (email) and HeyReach (LinkedIn) into
// a single shape the UI can render without caring about the source platform.

export type Platform = "instantly" | "heyreach";

/** A single outreach campaign, normalized across platforms. */
export interface Campaign {
  id: string;
  platform: Platform;
  name: string;
  /** Audience/track this campaign targets (F&I, General Manager, Referral…). */
  track: string;
  status: string;
  /** True for HeyReach lists that are staged but not yet launched as a campaign. */
  staged: boolean;
  /** Total leads targeted/staged by this campaign. */
  leads: number;
  /** Emails sent (Instantly) or messages sent (HeyReach). */
  sent: number;
  /** Unique opens (Instantly only; 0 for HeyReach). */
  opens: number;
  /** Unique replies. */
  replies: number;
  /** Connection requests accepted (HeyReach only; 0 for Instantly). */
  connectionsAccepted: number;
  /** Connection requests sent (HeyReach only; 0 for Instantly). */
  connectionsSent: number;
  /** Accepted / sent, 0..1 (HeyReach only). */
  connectionAcceptRate: number;
  /** Open rate 0..1 (Instantly only). */
  openRate: number;
  /** Reply rate 0..1. */
  replyRate: number;
  bounced: number;
}

/** The next message queued to send to a prospect. */
export interface NextMessage {
  platform: Platform;
  /** Short label, e.g. "Day 6 email" or "LinkedIn follow-up". */
  label: string;
  /** Email subject line, if applicable. */
  subject: string | null;
  /** Plain-text preview of the body. Null when the copy isn't API-exposed. */
  preview: string | null;
  /** False when the platform doesn't expose the message copy (HeyReach). */
  available: boolean;
}

/** A prospect who has engaged (opened, replied, or connected), normalized. */
export interface Prospect {
  id: string;
  platform: Platform;
  /** Channels this prospect is engaged on (email, LinkedIn, or both if merged). */
  channels: Platform[];
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
  /** True if the prospect accepted a LinkedIn connection request (HeyReach). */
  connected: boolean;
  /** Human-readable connection status, e.g. "Connection accepted". */
  connectionStatus: string | null;
  /** The next message queued for this prospect, if known. */
  nextMessage: NextMessage | null;
  /** Optional profile/LinkedIn URL (HeyReach). */
  profileUrl: string | null;
  /** ISO timestamp of the most recent engagement, if known. */
  lastActivity: string | null;
}

/** One step (message) in a campaign's outreach sequence. */
export interface MessagingStep {
  /** 1-based position in the sequence. */
  order: number;
  /** Cumulative day the message is sent, relative to enrollment (Day 0 = first). */
  day: number;
  /** email, connection_request, linkedin_message, etc. */
  type: string;
  subject: string | null;
  /** Sanitized HTML (email) or plain text (LinkedIn) of the message body. */
  body: string;
  /** Number of A/B variants for this step (1 = single variant). */
  variantCount: number;
}

/** The full message sequence for one campaign. */
export interface CampaignMessaging {
  campaignId: string;
  platform: Platform;
  name: string;
  track: string;
  status: string;
  steps: MessagingStep[];
}

/** A single message within a live conversation. */
export interface ConversationMessage {
  /** "them" = the prospect/correspondent, "us" = the connected account. */
  from: "them" | "us";
  text: string;
  at: string | null;
}

/** A live inbox conversation (e.g. a HeyReach LinkedIn thread). */
export interface Conversation {
  id: string;
  platform: Platform;
  name: string;
  headline: string | null;
  company: string | null;
  title: string | null;
  profileUrl: string | null;
  imageUrl: string | null;
  location: string | null;
  lastMessageAt: string | null;
  lastMessageText: string;
  lastFrom: "them" | "us";
  totalMessages: number;
  unread: boolean;
  /** Full thread when available (the list endpoint may return a subset). */
  messages: ConversationMessage[];
}

/** Aggregated KPI totals for the overview view. */
export interface Totals {
  sent: number;
  opens: number;
  replies: number;
  connectionsAccepted: number;
  connectionsSent: number;
  bounced: number;
  openRate: number;
  replyRate: number;
  connectionAcceptRate: number;
  prospectsOpened: number;
  prospectsReplied: number;
  prospectsConnected: number;
}

export interface DashboardData {
  totals: Totals;
  byPlatform: {
    instantly: Totals;
    heyreach: Totals;
  };
  campaigns: Campaign[];
  prospects: Prospect[];
  messaging: CampaignMessaging[];
  conversations: Conversation[];
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
    connectionsSent: 0,
    bounced: 0,
    openRate: 0,
    replyRate: 0,
    connectionAcceptRate: 0,
    prospectsOpened: 0,
    prospectsReplied: 0,
    prospectsConnected: 0,
  };
}
