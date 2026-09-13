import { NextRequest, NextResponse } from "next/server";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function GET() {
  try {
    const appId = requireEnv("WORLD_APP_ID");
    const action = process.env.WORLD_ACTION_ID ?? "charter-mint";
    const env = process.env.WORLD_ENVIRONMENT ?? "production";
    const walletAddress = process.env.DEFAULT_WORLD_WALLET_ADDRESS ?? "0x0000000000000000000000000000000000000000";

    const signature = {
      app_id: appId,
      action,
      environment: env,
      signal: walletAddress,
      created_at: new Date().toISOString(),
      scheme: "world-id-rp-signature-v1"
    };

    return NextResponse.json({ ok: true, signature });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate RP signature metadata";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
