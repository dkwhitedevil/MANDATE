export interface CharterStats {
  totalCharters: string;
  activeCharters: string;
  totalExecutions: string;
  totalVolumeHbar: string;
}

export interface Charter {
  id: string;
  domain: string;
  budgetHbar: string;
  usedHbar: string;
  remainingHbar: string;
  reputation: string;
  tier: string;
  expiresAt: string;
  executionCount: string;
  active: boolean;
}

export interface SubgraphData {
  charterStats: CharterStats;
  charters: Charter[];
}

export interface MintResult {
  txHash: string;
  charterId: string;
}

export interface VerifyPayload {
  ok: boolean;
  error?: string;
}