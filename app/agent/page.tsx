"use client";

import { gql, request } from "graphql-request";
import { useEffect, useState } from "react";

export default function AgentDemoPage() {
  const [charterId, setCharterId] = useState("");
  const [task, setTask] = useState("Research the current state of AI agent payment protocols");
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [charterState, setCharterState] = useState<any>(null);

  async function fetchCharterState(id: string) {
    if (!id) return;
    const query = gql`
      query GetCharter($id: ID!) {
        charter(id: $id) {
          active
          domain
          budgetHbar
          usedHbar
          remainingHbar
          reputation
          executionCount
          tier
        }
      }
    `;

    const subgraphUrl = process.env.NEXT_PUBLIC_SUBGRAPH_URL;
    const isConfigured = !!subgraphUrl && !subgraphUrl.includes("...");

    if (!isConfigured) {
      setLogs((prev) => [...prev, "Subgraph not configured yet. Set NEXT_PUBLIC_SUBGRAPH_URL to a live deployment."]);
      setCharterState(null);
      return;
    }

    try {
      const data: any = await request(subgraphUrl, query, { id });
      setCharterState(data.charter);
    } catch (error) {
      console.error("Agent chart state error:", error);
      setCharterState(null);
      setLogs((prev) => [...prev, "The live Subgraph is unavailable or the charter is not indexed yet."]);
    }
  }

  useEffect(() => {
    if (!charterId) return;

    let active = true;

    async function load() {
      if (!active) return;
      await fetchCharterState(charterId);
    }

    load();
    return () => {
      active = false;
    };
  }, [charterId]);

  async function runAgent() {
    setRunning(true);
    setLogs([]);

    const response = await fetch("/api/run-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ charterId, task })
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      setRunning(false);
      return;
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(Boolean);
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          setLogs((prev) => [...prev, line.slice(6)]);
        }
      }
    }

    setRunning(false);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#020817", color: "#a7f3d0", fontFamily: "monospace", padding: 32 }}>
      <h1 style={{ color: "white", fontSize: 32, marginBottom: 32 }}>MANDATE Agent Demo</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", color: "#9ca3af", marginBottom: 8 }}>Charter ID</label>
            <input
              value={charterId}
              onChange={(e) => setCharterId(e.target.value)}
              placeholder="Enter your Charter ID"
              style={{ width: "100%", background: "#111827", color: "#a7f3d0", border: "1px solid #374151", borderRadius: 10, padding: 12 }}
            />
          </div>

          <div>
            <label style={{ display: "block", color: "#9ca3af", marginBottom: 8 }}>Task</label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={3}
              style={{ width: "100%", background: "#111827", color: "#a7f3d0", border: "1px solid #374151", borderRadius: 10, padding: 12 }}
            />
          </div>

          <button
            onClick={runAgent}
            disabled={running || !charterId}
            style={{ width: "100%", background: "#15803d", color: "white", fontWeight: 700, borderRadius: 10, padding: 14, opacity: running || !charterId ? 0.6 : 1 }}
          >
            {running ? "Agent Running..." : "Run Agent"}
          </button>

          {charterState && (
            <div style={{ background: "#111827", border: "1px solid #374151", borderRadius: 12, padding: 16 }}>
              <div style={{ color: "white", fontWeight: 700, marginBottom: 12 }}>Live Charter State</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
                <div>Domain: <span style={{ color: "#facc15" }}>{charterState.domain}</span></div>
                <div>Budget: <span style={{ color: "#facc15" }}>{(parseInt(charterState.budgetHbar) / 1e8).toFixed(4)} HBAR</span></div>
                <div>Spent: <span style={{ color: "#f87171" }}>{(parseInt(charterState.usedHbar) / 1e8).toFixed(4)} HBAR</span></div>
                <div>Remaining: <span style={{ color: "#4ade80", fontWeight: 700 }}>{(parseInt(charterState.remainingHbar) / 1e8).toFixed(4)} HBAR</span></div>
                <div>Reputation: <span style={{ color: "#60a5fa" }}>{charterState.reputation}/100</span></div>
                <div>Executions: <span style={{ color: "#c084fc" }}>{charterState.executionCount}</span></div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div style={{ color: "#9ca3af", marginBottom: 8 }}>Agent Terminal</div>
          <div style={{ background: "black", minHeight: 420, borderRadius: 12, padding: 16, border: "1px solid #1f2937", overflowY: "auto" }}>
            {logs.length === 0 && <div style={{ color: "#6b7280" }}>Waiting for agent...</div>}
            {logs.map((log, i) => (
              <div key={i} style={{ fontSize: 14, marginBottom: 4 }}>{log}</div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
