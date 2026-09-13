"use client";

import { IDKitWidget, type ISuccessResult } from "@worldcoin/idkit";
import { gql, request } from "graphql-request";
import { useEffect, useState } from "react";

const STATS_QUERY = gql`
  query {
    charterStats(id: "global") {
      totalCharters
      activeCharters
      totalExecutions
      totalVolumeHbar
    }
    charters(first: 10, orderBy: createdAt, orderDirection: desc, where: { active: true }) {
      id
      domain
      budgetHbar
      usedHbar
      remainingHbar
      reputation
      tier
      expiresAt
      executionCount
    }
  }
`;

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<string>("");
  const [walletAddress, setWalletAddress] = useState<string>("0x1234567890123456789012345678901234567890");
  const [domain, setDomain] = useState<string>("inference");
  const [budgetHbar, setBudgetHbar] = useState<string>("1");
  const [durationDays, setDurationDays] = useState<string>("7");
  const [isVerifying, setIsVerifying] = useState(false);
  const [mintResult, setMintResult] = useState<any>(null);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      const subgraphUrl = process.env.NEXT_PUBLIC_SUBGRAPH_URL;
      const isConfigured = !!subgraphUrl && !subgraphUrl.includes("...");

      if (!isConfigured) {
        if (active) {
          setStatus("Subgraph not configured yet. Add a live NEXT_PUBLIC_SUBGRAPH_URL to connect the dashboard.");
          setData(null);
        }
        return;
      }

      try {
        const result = await request(subgraphUrl, STATS_QUERY);
        if (active) {
          setData(result);
          setStatus("");
        }
      } catch (error) {
        console.error("Dashboard subgraph error:", error);
        if (active) {
          setStatus("The configured Subgraph is unavailable or not indexed yet.");
          setData(null);
        }
      }
    }

    fetchData();
    return () => {
      active = false;
    };
  }, []);

  const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID || "app_...";
  const action = process.env.NEXT_PUBLIC_WORLD_ACTION_ID || "mandate";

  const verifyAndMint = async (result: ISuccessResult) => {
    if (!walletAddress || !walletAddress.startsWith("0x")) {
      setStatus("Enter a wallet address before verifying.");
      return;
    }

    setIsVerifying(true);
    setStatus("Verifying World ID proof...");

    try {
      const verifyResponse = await fetch("/api/world/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          action,
          appId,
          environment: process.env.WORLD_ENVIRONMENT || "production",
          proof: result
        })
      });

      const verifyPayload = await verifyResponse.json();
      if (!verifyResponse.ok || !verifyPayload.ok) {
        throw new Error(verifyPayload.error || "World ID verification failed.");
      }

      const mintResponse = await fetch("/api/charter/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          domain,
          budgetHbar: Number(budgetHbar),
          durationDays: Number(durationDays),
          action,
          appId,
          environment: process.env.WORLD_ENVIRONMENT || "production",
          proof: result
        })
      });

      const mintPayload = await mintResponse.json();
      if (!mintResponse.ok || !mintPayload.ok) {
        throw new Error(mintPayload.error || "Charter mint failed.");
      }

      setMintResult(mintPayload);
      setStatus("World ID verified and charter minted successfully.");
    } catch (error) {
      console.error("World ID flow error:", error);
      setStatus(error instanceof Error ? error.message : "World ID verification failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f3f4f6", padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 40, margin: 0 }}>MANDATE</h1>
        <p style={{ color: "#4b5563", marginTop: 8 }}>Human-backed charter layer for autonomous AI agents</p>
      </header>

      {status && (
        <div style={{ marginBottom: 24, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a4d00", borderRadius: 12, padding: 12 }}>
          {status}
        </div>
      )}

      {data?.charterStats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 28 }}>
          <StatCard label="Total Charters" value={data.charterStats.totalCharters} />
          <StatCard label="Active Charters" value={data.charterStats.activeCharters} />
          <StatCard label="Total Executions" value={data.charterStats.totalExecutions} />
          <StatCard label="Total Volume (HBAR)" value={(parseInt(data.charterStats.totalVolumeHbar) / 1e8).toFixed(4)} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>Create Charter</h2>
          <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "#374151" }}>
              Wallet address
              <input
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 12px" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "#374151" }}>
              Domain
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 12px" }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "#374151" }}>
                Budget (HBAR)
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={budgetHbar}
                  onChange={(e) => setBudgetHbar(e.target.value)}
                  style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 12px" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "#374151" }}>
                Duration (days)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 12px" }}
                />
              </label>
            </div>

            <IDKitWidget
              app_id={appId}
              action={action}
              signal={walletAddress}
              verification_level="device"
              onSuccess={async (result: ISuccessResult) => {
                await verifyAndMint(result);
              }}
              handleVerify={async (result: ISuccessResult) => {
                await verifyAndMint(result);
              }}
            >
              {({ open }: { open: () => void }) => (
                <button
                  type="button"
                  onClick={open}
                  disabled={isVerifying || !walletAddress || !walletAddress.startsWith("0x")}
                  style={{
                    background: isVerifying ? "#9ca3af" : "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    padding: "12px 16px",
                    fontWeight: 700,
                    cursor: isVerifying ? "not-allowed" : "pointer"
                  }}
                >
                  {isVerifying ? "Verifying..." : "Verify with World ID"}
                </button>
              )}
            </IDKitWidget>

            {mintResult && (
              <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 10, padding: 12, color: "#065f46" }}>
                <strong>Charter minted.</strong>
                <div>Tx: {mintResult.txHash}</div>
                <div>Charter ID: {mintResult.charterId}</div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>Live Charter Feed</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data?.charters?.map((c: any) => (
              <CharterCard key={c.id} charter={c} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #e5e7eb" }}>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
      <div style={{ color: "#6b7280" }}>{label}</div>
    </div>
  );
}

function CharterCard({ charter }: { charter: any }) {
  const remaining = parseInt(charter.remainingHbar) / 1e8;
  const total = parseInt(charter.budgetHbar) / 1e8;
  const pct = total > 0 ? (remaining / total) * 100 : 0;

  return (
    <div style={{ background: "white", borderRadius: 12, padding: 16, border: "1px solid #e5e7eb" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong>#{charter.id}</strong>
          <span style={{ marginLeft: 8, color: "#6b7280" }}>{charter.domain}</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700 }}>{charter.reputation}/100</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>reputation</div>
        </div>
      </div>
      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
        <span>{remaining.toFixed(4)} HBAR remaining</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ width: "100%", height: 8, background: "#e5e7eb", borderRadius: 999, marginTop: 6 }}>
        <div style={{ width: `${pct}%`, height: 8, background: "#2563eb", borderRadius: 999 }} />
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>{charter.executionCount} executions</div>
    </div>
  );
}
