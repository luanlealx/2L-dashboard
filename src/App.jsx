import { useState } from "react";
import { C } from "./tokens.js";
import MorningBriefing from "./MorningBriefing.jsx";
import ContentMultiplier from "./ContentMultiplier.jsx";
import ClientBase from "./ClientBase.jsx";

const MODULES = [
  { id: "briefing",   label: "Morning Briefing",   icon: "☀" },
  { id: "multiplier", label: "Content Multiplier",  icon: "⚡" },
  { id: "clients",    label: "Client Base",         icon: "👥" },
];

export default function App() {
  const [active, setActive] = useState("briefing");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: C.surfaceAlt,
        borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0,
        zIndex: 50,
      }}>

        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
              background: `linear-gradient(135deg, ${C.brand}, ${C.purple})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
            }}>
              2L
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.textBright, lineHeight: 1 }}>
                2L Digital
              </div>
              <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "0.18em", color: C.textDim, textTransform: "uppercase", marginTop: 4 }}>
                Autopilot
              </div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {MODULES.map((m) => {
            const isActive = active === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActive(m.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", marginBottom: 2,
                  borderRadius: 8, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                  textAlign: "left", transition: "all 0.12s",
                  background: isActive ? "rgba(0,82,255,0.1)" : "none",
                  color: isActive ? C.textBright : C.textMuted,
                  borderLeft: `2px solid ${isActive ? C.brand : "transparent"}`,
                  paddingLeft: isActive ? 10 : 12,
                }}
              >
                <span style={{ fontSize: 15, flexShrink: 0 }}>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: "16px 20px", borderTop: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: `linear-gradient(135deg, ${C.brand}, ${C.purple})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#fff",
          }}>
            2L
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.text, lineHeight: 1 }}>2L Agency</div>
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 3, fontFamily: "monospace" }}>workspace</div>
          </div>
        </div>

      </aside>

      {/* ── Module content ── */}
      <main style={{ marginLeft: 220, flex: 1, minHeight: "100vh" }}>
        {active === "briefing"   && <MorningBriefing />}
        {active === "multiplier" && <ContentMultiplier />}
        {active === "clients"    && <ClientBase />}
      </main>

    </div>
  );
}
