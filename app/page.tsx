"use client";

import { IDKitWidget, type ISuccessResult } from "@worldcoin/idkit";
import { gql, request } from "graphql-request";
import { useEffect, useState } from "react";
import { StatCard } from "../components/StatCard";
import { CharterCard } from "../components/CharterCard";
import { Input } from "../components/Input";
import { SubgraphData, MintResult, Charter } from "../types";

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
  const [data, setData] = useState<SubgraphData | null>(null);
  const [status, setStatus] = useState<string>("");
  const [walletAddress, setWalletAddress] = useState<string>("0x1234567890123456789012345678901234567890");
  const [domain, setDomain] = useState<string>("inference");
  const [budgetHbar, setBudgetHbar] = useState<string>("1");
  const [durationDays, setDurationDays] = useState<string>("7");
  const [isVerifying, setIsVerifying] = useState(false);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      setIsLoading(true);
      const subgraphUrl = process.env.NEXT_PUBLIC_SUBGRAPH_URL;
      const isConfigured = !!subgraphUrl && !subgraphUrl.includes("...");

      if (!isConfigured) {
        if (active) {
          setStatus("Subgraph not configured yet. Add a live NEXT_PUBLIC_SUBGRAPH_URL to connect the dashboard.");
          setData(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const result = await request(subgraphUrl, STATS_QUERY);
        if (active) {
          setData(result);
          setStatus("");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Dashboard subgraph error:", error);
        if (active) {
          setStatus("The configured Subgraph is unavailable or not indexed yet.");
          setData(null);
          setIsLoading(false);
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
    <main style={{ minHeight: "100vh", background: "#f8fafc", padding: 32 }} role="main">
      <header style={{ marginBottom: 32, textAlign: "center" }}>
        <h1 style={{ fontSize: 48, margin: 0, color: "#0f172a", fontWeight: 800 }}>MANDATE</h1>
        <p style={{ color: "#64748b", marginTop: 12, fontSize: 18 }}>Human-backed charter layer for autonomous AI agents</p>
      </header>

      {isLoading && (
        <div style={{ 
          marginBottom: 24, 
          background: "#f1f5f9", 
          border: "1px solid #cbd5e1", 
          color: "#64748b", 
          borderRadius: 12, 
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <span style={{ fontSize: 18 }}>⏳</span>
          Loading dashboard data...
        </div>
      )}

      {status && (
        <div style={{ 
          marginBottom: 24, 
          background: status.includes("success") ? "#ecfdf5" : "#fff7ed", 
          border: status.includes("success") ? "1px solid #a7f3d0" : "1px solid #fed7aa", 
          color: status.includes("success") ? "#065f46" : "#9a4d00", 
          borderRadius: 12, 
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <span style={{ fontSize: 18 }}>{status.includes("success") ? "✓" : "⚠"}</span>
          {status}
        </div>
      )}

      {data?.charterStats && (
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 28 }}>
          <StatCard label="Total Charters" value={data.charterStats.totalCharters} />
          <StatCard label="Active Charters" value={data.charterStats.activeCharters} />
          <StatCard label="Total Executions" value={data.charterStats.totalExecutions} />
          <StatCard label="Total Volume (HBAR)" value={(parseInt(data.charterStats.totalVolumeHbar) / 1e8).toFixed(4)} />
        </div>
      )}

      <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24 }}>
        <section>
          <h2 style={{ fontSize: 28, marginBottom: 20, color: "#0f172a", fontWeight: 700 }}>Create Charter</h2>
          <form style={{ 
            background: "white", 
            borderRadius: 16, 
            padding: 24, 
            border: "1px solid #e5e7eb", 
            display: "flex", 
            flexDirection: "column", 
            gap: 16,
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
          }} onSubmit={(e) => e.preventDefault()}>
            <Input 
              label="Wallet address" 
              value={walletAddress} 
              onChange={setWalletAddress}
              placeholder="0x..."
              id="wallet-address"
              required
            />

            <Input 
              label="Domain" 
              value={domain} 
              onChange={setDomain}
              placeholder="e.g., inference"
              id="domain"
              required
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <Input 
                label="Budget (HBAR)" 
                value={budgetHbar} 
                onChange={setBudgetHbar}
                type="number"
                min="0.1"
                step="0.1"
              />

              <Input 
                label="Duration (days)" 
                value={durationDays} 
                onChange={setDurationDays}
                type="number"
                min="1"
                step="1"
              />
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
                  aria-label={isVerifying ? "Verifying World ID" : "Verify with World ID to create charter"}
                  aria-busy={isVerifying}
                  style={{
                    background: isVerifying ? "#94a3b8" : "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: 12,
                    padding: "14px 20px",
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: isVerifying ? "not-allowed" : "pointer",
                    transition: "background 0.2s, transform 0.1s",
                    boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.3)"
                  }}
                  onMouseEnter={(e) => {
                    if (!isVerifying && walletAddress && walletAddress.startsWith("0x")) {
                      e.currentTarget.style.background = "#1d4ed8";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isVerifying ? "#94a3b8" : "#2563eb";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {isVerifying ? "Verifying..." : "Verify with World ID"}
                </button>
              )}
            </IDKitWidget>

            {mintResult && (
              <div style={{ 
                background: "#ecfdf5", 
                border: "1px solid #a7f3d0", 
                borderRadius: 12, 
                padding: 16, 
                color: "#065f46",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>🎉</span>
                  <strong style={{ fontSize: 16 }}>Charter minted successfully!</strong>
                </div>
                <div style={{ fontSize: 14, marginTop: 8 }}>
                  <div><strong>Transaction:</strong> {mintResult.txHash}</div>
                  <div><strong>Charter ID:</strong> {mintResult.charterId}</div>
                </div>
              </div>
            )}
          </form>
        </section>

        <section aria-live="polite">
          <h2 style={{ fontSize: 28, marginBottom: 20, color: "#0f172a", fontWeight: 700 }}>Live Charter Feed</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data?.charters?.map((c: Charter) => (
              <CharterCard key={c.id} charter={c} />
            ))}
            {(!data?.charters || data.charters.length === 0) && (
              <div style={{ 
                background: "white", 
                borderRadius: 12, 
                padding: 24, 
                border: "1px solid #e5e7eb",
                textAlign: "center",
                color: "#6b7280"
              }}>
                No active charters yet. Create one to get started!
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
