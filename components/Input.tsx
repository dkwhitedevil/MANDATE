interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  step?: number;
}

export function Input({ label, value, onChange, placeholder, type = "text", min, step }: InputProps) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "#374151", fontSize: 14 }}>
      {label}
      <input
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ 
          border: "1px solid #d1d5db", 
          borderRadius: 8, 
          padding: "10px 12px",
          fontSize: 14,
          transition: "border-color 0.2s, box-shadow 0.2s"
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "#2563eb";
          e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "#d1d5db";
          e.target.style.boxShadow = "none";
        }}
      />
    </label>
  );
}