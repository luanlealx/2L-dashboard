// Shared design tokens and micro-components
// Centralizes styles that were duplicated across the monolith

import { useState } from "react";

// Design tokens as JS objects (compatible with inline styles)
export const monoStyle = { fontFamily: "'JetBrains Mono', monospace" };

export const labelStyle = {
  ...monoStyle,
  fontSize: 10,
  color: "#333",
  letterSpacing: "0.14em",
  marginBottom: 8,
};

export const cardStyle = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid #14141e",
  borderRadius: 14,
  padding: 18,
  position: "relative",
  overflow: "hidden",
};

export const chipStyle = (active) => ({
  background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)",
  border: `1px solid ${active ? "rgba(255,255,255,0.15)" : "#1a1a2e"}`,
  borderRadius: 8,
  padding: "6px 12px",
  color: active ? "#E4E4E7" : "#555",
  fontSize: 12,
  cursor: "pointer",
  transition: "all 0.2s",
  ...monoStyle,
});

export const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid #1a1a2e",
  borderRadius: 10,
  padding: "10px 14px",
  color: "#D4D4D8",
  fontSize: 14,
};

export const textareaStyle = {
  width: "100%",
  minHeight: 100,
  background: "rgba(0,0,0,0.3)",
  border: "1px solid #1a1a2e",
  borderRadius: 12,
  padding: 16,
  color: "#D4D4D8",
  fontSize: 14,
  lineHeight: 1.7,
  resize: "vertical",
};

export const selectStyle = {
  background: "#09090B",
  border: "1px solid #1a1a2e",
  borderRadius: 8,
  padding: "8px 12px",
  color: "#888",
  fontSize: 13,
};

export const smallBtnStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid #1a1a2e",
  borderRadius: 8,
  padding: "6px 12px",
  color: "#555",
  fontSize: 12,
  cursor: "pointer",
  ...monoStyle,
};

export const primaryBtnStyle = (disabled) => ({
  background: disabled ? "#1a1a2e" : "linear-gradient(135deg, #0052FF, #8B5CF6)",
  border: "none",
  borderRadius: 10,
  padding: "10px 24px",
  color: disabled ? "#444" : "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  ...monoStyle,
  letterSpacing: "0.04em",
  transition: "all 0.3s",
});

// Micro-components

export function LoadingDot({ color, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 14,
          height: 14,
          border: `2px solid ${color}33`,
          borderTopColor: color,
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <span style={{ ...monoStyle, fontSize: 12, color: "#555" }}>{text}</span>
    </div>
  );
}

export function CopyButton({ text, style }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} style={{ ...smallBtnStyle, color: copied ? "#10B981" : "#555", ...style }}>
      {copied ? "✓" : "⎘"}
    </button>
  );
}
