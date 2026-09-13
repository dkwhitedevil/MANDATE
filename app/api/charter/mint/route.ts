import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import CharterRegistryABI from "../../../../subgraph/abis/CharterRegistry.json" with { type: "json" };
import { consumeWorldVerification, createWorldVerificationRecord, validateWorldConfig } from "../../../../backend/world-id";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const walletAddress = String(body.walletAddress ?? "");
    const domain = String(body.domain ?? "");
    const budgetHbar = Number(body.budgetHbar ?? 0);
    const durationDays = Number(body.durationDays ?? 0);
    const proof = body.proof ?? body.worldProof ?? {};
    const action = String(body.action ?? process.env.WORLD_ACTION_ID ?? "charter-mint");
    const appId = String(body.appId ?? process.env.WORLD_APP_ID ?? "");
    const env = String(body.environment ?? process.env.WORLD_ENVIRONMENT ?? "production");

    const config = validateWorldConfig({ appId, action, env, requiredRpKey: true });
    if (!config.ok) {
      return NextResponse.json({ ok: false, error: config.error }, { status: 400 });
    }

    if (!walletAddress || !domain || !proof || !proof.nullifier_hash && !proof.nullifierHash) {
      return NextResponse.json({ ok: false, error: "Missing required mint data." }, { status: 400 });
    }

    const nullifier = String(proof.nullifier_hash ?? proof.nullifierHash ?? "");
    const verification = createWorldVerificationRecord({
      nullifier,
      action,
      walletAddress,
      signal: walletAddress,
      appId,
      env: config.env
    });

    const consumed = consumeWorldVerification(verification);
    if (!consumed.ok) {
      return NextResponse.json({ ok: false, error: consumed.error ?? "Nullifier already used." }, { status: 409 });
    }

    const provider = new ethers.JsonRpcProvider(process.env.HEDERA_RPC_URL ?? "https://testnet.hashio.io/api");
    const signer = new ethers.Wallet(requireEnv("HEDERA_PRIVATE_KEY"), provider);
    const contract = new ethers.Contract(requireEnv("CONTRACT_ADDRESS"), CharterRegistryABI, signer);

    const budgetTinybars = BigInt(Math.floor(budgetHbar * 1e8));
    const durationSeconds = BigInt(Math.floor(durationDays * 24 * 60 * 60));
    const nullifierBytes32 = ethers.zeroPadValue(ethers.toBeHex(nullifier), 32);

    const tx = await contract.mintCharter(
      walletAddress,
      nullifierBytes32,
      domain,
      budgetTinybars,
      durationSeconds,
      1,
      ""
    );

    const receipt = await tx.wait();
    const event = receipt?.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((entry: any) => entry?.name === "CharterCreated");

    return NextResponse.json({
      ok: true,
      txHash: receipt?.hash,
      charterId: event?.args?.charterId?.toString(),
      domain,
      budgetHbar,
      durationDays,
      walletAddress,
      appId,
      action,
      environment: config.env
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected charter mint error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
