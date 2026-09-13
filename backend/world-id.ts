export type VerificationEnvironment = "local" | "dev" | "staging" | "production" | "test";

export interface WorldVerificationRecord {
  nullifier: string;
  action: string;
  walletAddress: string;
  signal: string;
  appId: string;
  env: string;
  createdAt: string;
}

export interface WorldIDProof {
  merkle_root?: string;
  nullifier_hash?: string;
  nullifierHash?: string;
  proof?: string;
  verification_level?: "orb" | "device";
  action?: string;
  signal?: string;
}

const verificationStore = new Map<string, WorldVerificationRecord>();

export function normalizeAddress(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function validateWorldConfig(config: {
  appId?: string;
  action?: string;
  env?: string;
  requiredRpKey?: boolean;
}): { ok: boolean; error?: string; env: string } {
  const env = config.env ?? process.env.WORLD_ENVIRONMENT ?? "local";
  const errors: string[] = [];

  if (!config.appId || !config.appId.startsWith("app_")) {
    errors.push("WORLD_APP_ID must be set to a valid app_... value.");
  }

  if (!config.action || !config.action.trim()) {
    errors.push("WORLD_ACTION_ID must be set to a valid action name.");
  }

  if (!/^(local|dev|staging|production|test)$/i.test(env)) {
    errors.push("WORLD_ENVIRONMENT must be one of: local, dev, staging, production, or test.");
  }

  if (config.requiredRpKey && !process.env.WORLD_RP_PRIVATE_KEY && !process.env.WORLD_RP_SECRET) {
    errors.push("WORLD_RP_PRIVATE_KEY or WORLD_RP_SECRET must be configured for server-side RP signing.");
  }

  return {
    ok: errors.length === 0,
    error: errors.length > 0 ? errors.join(" | ") : undefined,
    env: env.toLowerCase()
  };
}

export function createWorldVerificationRecord(input: {
  nullifier: string;
  action: string;
  walletAddress: string;
  appId: string;
  env: string;
  signal?: string;
}): WorldVerificationRecord {
  const walletAddress = normalizeAddress(input.walletAddress);
  const signal = normalizeAddress(input.signal ?? input.walletAddress);

  if (!input.nullifier || !input.nullifier.trim()) {
    throw new Error("World proof must include a non-empty nullifier.");
  }

  return {
    nullifier: input.nullifier.trim(),
    action: input.action.trim(),
    walletAddress,
    signal,
    appId: input.appId.trim(),
    env: input.env.trim().toLowerCase(),
    createdAt: new Date().toISOString()
  };
}

export function consumeWorldVerification(record: WorldVerificationRecord): {
  ok: boolean;
  error?: string;
  record?: WorldVerificationRecord;
} {
  if (!record.nullifier || !record.action) {
    return { ok: false, error: "World verification record is incomplete." };
  }

  const normalizedSignal = normalizeAddress(record.signal);
  const normalizedWallet = normalizeAddress(record.walletAddress);

  if (normalizedSignal !== normalizedWallet) {
    return { ok: false, error: "Wallet address does not match the proof signal." };
  }

  const key = `${record.appId}:${record.env}:${record.action}:${record.nullifier}`;

  if (verificationStore.has(key)) {
    return {
      ok: false,
      error: "This World ID nullifier has already been used for this action."
    };
  }

  verificationStore.set(key, record);

  return {
    ok: true,
    record
  };
}

export async function verifyRemoteWorldProof(
  proof: WorldIDProof,
  walletAddress: string,
  action: string,
  appId?: string,
  environment?: string
): Promise<{ ok: boolean; error?: string; response?: Record<string, unknown> }> {
  const effectiveAppId = appId ?? process.env.WORLD_APP_ID;
  const effectiveAction = action || process.env.WORLD_ACTION_ID || "charter-mint";
  const apiKey = process.env.WORLD_API_KEY;

  if (!apiKey || !effectiveAppId) {
    return { ok: true, response: { skipped: true, reason: "No World API key configured; local checks only." } };
  }

  try {
    const response = await fetch(`https://developer.worldcoin.org/api/v4/verify/${effectiveAppId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        merkle_root: proof.merkle_root,
        nullifier_hash: proof.nullifier_hash ?? proof.nullifierHash,
        proof: proof.proof,
        verification_level: proof.verification_level ?? "orb",
        signal: walletAddress,
        action: effectiveAction,
        environment: environment ?? process.env.WORLD_ENVIRONMENT ?? "production"
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        error: `World verification failed (${response.status}): ${JSON.stringify(payload)}`
      };
    }

    return {
      ok: Boolean(payload?.success ?? payload?.verified ?? true),
      error: payload?.success === false || payload?.verified === false ? String(payload?.message ?? "World verification failed") : undefined,
      response: payload
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "World verification error"
    };
  }
}
