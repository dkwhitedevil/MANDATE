interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  step?: number;
  id?: string;
  required?: boolean;
}

export function Input({ label, value, onChange, placeholder, type = "text", min, step, id, required }: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, color: "#374151", fontSize: 14 }} htmlFor={inputId}>
      <span>
        {label}
        {required && <span style={{ color: "#ef4444", marginLeft: 2 }} aria-hidden="true">*</span>}
      </span>
      <input
        id={inputId}
        type={type}
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        aria-label={label}
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