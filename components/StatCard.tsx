interface StatCardProps {
  label: string;
  value: any;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>{value}</div>
      <div style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>{label}</div>
    </div>
  );
}