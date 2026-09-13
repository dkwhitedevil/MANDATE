import { NextRequest, NextResponse } from "next/server";
import { consumeWorldVerification, createWorldVerificationRecord, validateWorldConfig, verifyRemoteWorldProof } from "../../../../backend/world-id";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const walletAddress = String(body.walletAddress ?? "");
    const proof = body.proof ?? body.worldProof ?? {};
    const action = String(body.action ?? process.env.WORLD_ACTION_ID ?? "charter-mint");
    const appId = String(body.appId ?? process.env.WORLD_APP_ID ?? "");
    const env = String(body.environment ?? process.env.WORLD_ENVIRONMENT ?? "production");

    const config = validateWorldConfig({ appId, action, env, requiredRpKey: true });
    if (!config.ok) {
      return NextResponse.json({ ok: false, error: config.error }, { status: 400 });
    }

    if (!walletAddress || !proof || !proof.nullifier_hash && !proof.nullifierHash) {
      return NextResponse.json({ ok: false, error: "Missing walletAddress or World ID proof payload." }, { status: 400 });
    }

    const remoteResult = await verifyRemoteWorldProof(proof, walletAddress, action, appId, env);
    if (!remoteResult.ok) {
      return NextResponse.json({ ok: false, error: remoteResult.error ?? "World verification failed." }, { status: 401 });
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

    const consumption = consumeWorldVerification(verification);
    if (!consumption.ok) {
      return NextResponse.json({ ok: false, error: consumption.error ?? "Nullifier already used." }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      verification: {
        nullifier,
        action,
        walletAddress,
        environment: config.env,
        appId,
        consumedAt: consumption.record?.createdAt
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected verification error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
