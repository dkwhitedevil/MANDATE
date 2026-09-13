import { Charter } from "../types";

interface CharterCardProps {
  charter: Charter;
}

export function CharterCard({ charter }: CharterCardProps) {
  const remaining = parseInt(charter.remainingHbar) / 1e8;
  const total = parseInt(charter.budgetHbar) / 1e8;
  const pct = total > 0 ? (remaining / total) * 100 : 0;

  const getBarColor = (percentage: number) => {
    if (percentage > 50) return "#10b981";
    if (percentage > 25) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div style={{ 
      background: "white", 
      borderRadius: 12, 
      padding: 16, 
      border: "1px solid #e5e7eb",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      transition: "transform 0.2s, box-shadow 0.2s"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong style={{ color: "#111827" }}>#{charter.id}</strong>
          <span style={{ marginLeft: 8, color: "#6b7280", fontSize: 14 }}>{charter.domain}</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: "#111827" }}>{charter.reputation}/100</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>reputation</div>
        </div>
      </div>
      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
        <span>{remaining.toFixed(4)} HBAR remaining</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ width: "100%", height: 8, background: "#e5e7eb", borderRadius: 999, marginTop: 6 }}>
        <div 
          style={{ 
            width: `${pct}%`, 
            height: 8, 
            background: getBarColor(pct), 
            borderRadius: 999,
            transition: "background 0.3s"
          }} 
        />
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>{charter.executionCount} executions</div>
    </div>
  );
}