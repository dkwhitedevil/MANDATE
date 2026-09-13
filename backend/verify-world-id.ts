export interface WorldIDProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: "orb" | "device";
  action: string;
  signal: string;
}

export async function verifyWorldIDProof(
  proof: WorldIDProof,
  expectedSignal: string
): Promise<{ valid: boolean; nullifierHash?: string; tier?: number }> {
  try {
    const { verifyCloudProof } = await import("@worldcoin/idkit-core/backend");
    const result = await verifyCloudProof(
      {
        merkle_root: proof.merkle_root,
        nullifier_hash: proof.nullifier_hash,
        proof: proof.proof,
        verification_level: proof.verification_level as any
      },
      process.env.WORLD_APP_ID as `app_${string}`,
      process.env.WORLD_ACTION_ID || "charter-mint",
      expectedSignal
    );

    if (result.success) {
      return {
        valid: true,
        nullifierHash: proof.nullifier_hash,
        tier: proof.verification_level === "orb" ? 1 : 0
      };
    }

    return { valid: false };
  } catch (error) {
    console.error("World ID verification error:", error);
    return { valid: false };
  }
}
