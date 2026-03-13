import { useState, useEffect } from "react";
import { getTimeInTimezone, isInPeakHour } from "../lib/utils.js";
import { monoStyle, smallBtnStyle } from "./ui/index.jsx";

export default function ClientHeader({ client, onClose }) {
  const [clock, setClock] = useState(getTimeInTimezone(client.audience.timezone));

  useEffect(() => {
    const t = setInterval(
      () => setClock(getTimeInTimezone(client.audience.timezone)),
      30000
    );
    return () => clearInterval(t);
  }, [client]);

  const peak = isInPeakHour(client.audience.peakHours, client.audience.timezone);

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${client.color}08, ${client.color}03)`,
        border: `1px solid ${client.color}22`,
        borderRadius: 16,
        padding: "18px 22px",
        marginBottom: 20,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: client.color,
          opacity: 0.4,
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: client.color + "18",
              border: `1px solid ${client.color}33`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            {client.emoji}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#E4E4E7" }}>
              {client.name}
            </div>
            <div style={{ ...monoStyle, fontSize: 11, color: "#555", marginTop: 2 }}>
              {client.role} · {client.revenue} · {client.platforms.join(" + ")}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            ...smallBtnStyle,
            padding: "6px 14px",
            fontSize: 11,
            background: "rgba(255,255,255,0.04)",
            borderColor: "#222",
          }}
        >
          ← Todos os clientes
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
          gap: 10,
          marginTop: 16,
        }}
      >
        <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ ...monoStyle, fontSize: 9, color: "#444", letterSpacing: "0.12em" }}>
            HORÁRIO DO PÚBLICO
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 14 }}>{client.audience.flag}</span>
            <span style={{ ...monoStyle, fontSize: 20, fontWeight: 700, color: "#E4E4E7" }}>
              {clock}
            </span>
            <span style={{ ...monoStyle, fontSize: 10, color: "#444" }}>
              UTC{client.audience.utcOffset >= 0 ? "+" : ""}
              {client.audience.utcOffset}
            </span>
          </div>
        </div>

        <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ ...monoStyle, fontSize: 9, color: "#444", letterSpacing: "0.12em" }}>
            HORÁRIOS DE PICO
          </div>
          <div style={{ marginTop: 4 }}>
            {client.audience.peakHours.map((h, i) => (
              <span
                key={i}
                style={{
                  ...monoStyle,
                  fontSize: 12,
                  color: peak ? "#10B981" : "#888",
                  marginRight: 8,
                }}
              >
                {peak && i === 0 ? "🟢 " : ""}
                {h}
              </span>
            ))}
          </div>
        </div>

        <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ ...monoStyle, fontSize: 9, color: "#444", letterSpacing: "0.12em" }}>
            MELHORES DIAS
          </div>
          <div style={{ ...monoStyle, fontSize: 12, color: "#888", marginTop: 4 }}>
            {client.audience.peakDays.join(" · ")}
          </div>
        </div>

        <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ ...monoStyle, fontSize: 9, color: "#444", letterSpacing: "0.12em" }}>
            AUDIÊNCIA
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4, lineHeight: 1.4 }}>
            {client.audience.demographics}
          </div>
        </div>
      </div>
    </div>
  );
}
