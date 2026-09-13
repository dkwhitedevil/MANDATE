"use client";

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

  useEffect(() => {
    let active = true;

    async function fetchData() {
      const subgraphUrl = process.env.NEXT_PUBLIC_SUBGRAPH_URL;
      if (!subgraphUrl) return;

      const result = await request(subgraphUrl, STATS_QUERY);
      if (active) setData(result);
    }

    fetchData();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#f3f4f6", padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 40, margin: 0 }}>MANDATE</h1>
        <p style={{ color: "#4b5563", marginTop: 8 }}>Human-backed charter layer for autonomous AI agents</p>
      </header>

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
          <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #e5e7eb" }}>
            <p>Use the World ID flow and mint a charter from your wallet.</p>
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
