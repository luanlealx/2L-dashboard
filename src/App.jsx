import { useState } from "react";
import { C } from "./tokens.js";
import MorningBriefing from "./MorningBriefing.jsx";
import ContentMultiplier from "./ContentMultiplier.jsx";

const MODULES = [
  { id: "briefing",    label: "Morning Briefing",    icon: "☀" },
  { id: "multiplier",  label: "Content Multiplier",  icon: "⚡" },
];

export default function App() {
  const [active, setActive] = useState("briefing");

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>

      {/* ── Top nav ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(8,8,13,0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center",
        padding: "0 24px", height: 52,
        gap: 24,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: `linear-gradient(135deg, ${C.brand}, ${C.purple})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
          }}>
            2L
          </div>
          <span style={{
            fontSize: 10, fontFamily: "monospace",
            letterSpacing: "0.2em", color: C.textDim,
            textTransform: "uppercase",
          }}>
            Agency Autopilot
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />

        {/* Module tabs */}
        <div style={{ display: "flex", gap: 2 }}>
          {MODULES.map((m) => {
            const isActive = active === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActive(m.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px",
                  border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                  transition: "all 0.15s",
                  background: isActive ? "rgba(255,255,255,0.06)" : "none",
                  color: isActive ? C.textBright : C.textMuted,
                  borderBottom: isActive ? `2px solid ${C.brand}` : "2px solid transparent",
                  borderRadius: "8px 8px 0 0",
                  marginBottom: isActive ? -1 : 0,
                  paddingBottom: isActive ? 7 : 6,
                }}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Module content ── */}
      {active === "briefing"   && <MorningBriefing />}
      {active === "multiplier" && <ContentMultiplier />}

    </div>
  );
}
