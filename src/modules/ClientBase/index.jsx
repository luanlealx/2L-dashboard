import { useState } from "react";
import { CLIENT_PROFILES } from "../../data/clients.js";
import { extractRules } from "../../lib/utils.js";
import {
  monoStyle,
  labelStyle,
  cardStyle,
  chipStyle,
  inputStyle,
  textareaStyle,
  smallBtnStyle,
  primaryBtnStyle,
} from "../../components/ui/index.jsx";

// ─── Client Card (list view) ───────────────────────────────────────────────

function ClientCard({ client, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...cardStyle,
        borderColor: client.color + "22",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "all 0.2s",
        background: `linear-gradient(135deg, ${client.color}06, rgba(255,255,255,0.01))`,
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
          opacity: 0.5,
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: client.color + "18",
            border: `1px solid ${client.color}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {client.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#E4E4E7" }}>
            {client.name}
          </div>
          <div style={{ ...monoStyle, fontSize: 10, color: client.color, marginTop: 2 }}>
            {client.role}
          </div>
        </div>
        <div
          style={{
            ...monoStyle,
            fontSize: 11,
            color: "#10B981",
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: 6,
            padding: "3px 8px",
            flexShrink: 0,
          }}
        >
          {client.revenue}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {client.platforms.map((p) => (
          <span
            key={p}
            style={{
              ...monoStyle,
              fontSize: 10,
              color: "#555",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid #1a1a2e",
              borderRadius: 5,
              padding: "2px 7px",
            }}
          >
            {p}
          </span>
        ))}
      </div>

      <div style={{ fontSize: 12, color: "#444", lineHeight: 1.5 }}>
        {client.audience.flag} {client.audience.demographics}
      </div>
    </button>
  );
}

// ─── Client Detail (full view) ─────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "Visão Geral" },
  { id: "voice", label: "Tom de Voz" },
  { id: "rules", label: "Regras" },
  { id: "metrics", label: "Métricas" },
  { id: "briefing", label: "Briefing Focus" },
];

function ClientDetail({ client, onBack, onEdit }) {
  const [tab, setTab] = useState("overview");

  const rules = extractRules(client.systemPrompt);

  // Extract tone section
  const toneStart = client.systemPrompt.indexOf("TOM DE VOZ:");
  const toneEnd = client.systemPrompt.indexOf("\n\n", toneStart);
  const toneSection =
    toneStart !== -1
      ? client.systemPrompt.substring(toneStart, toneEnd !== -1 ? toneEnd : undefined)
      : "";

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${client.color}08, ${client.color}03)`,
          border: `1px solid ${client.color}22`,
          borderRadius: 16,
          padding: "20px 24px",
          marginBottom: 24,
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
            height: 3,
            background: `linear-gradient(90deg, ${client.color}, ${client.color}44)`,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: client.color + "18",
                border: `1px solid ${client.color}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
              }}
            >
              {client.emoji}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#E4E4E7" }}>
                {client.name}
              </div>
              <div style={{ ...monoStyle, fontSize: 11, color: "#555", marginTop: 3 }}>
                {client.role} · {client.revenue}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {client.platforms.map((p) => (
                  <span
                    key={p}
                    style={{
                      ...monoStyle,
                      fontSize: 10,
                      color: client.color,
                      background: client.color + "12",
                      border: `1px solid ${client.color}33`,
                      borderRadius: 5,
                      padding: "2px 8px",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onEdit}
              style={{
                ...smallBtnStyle,
                color: client.color,
                borderColor: client.color + "33",
                background: client.color + "0a",
              }}
            >
              ✏️ Editar
            </button>
            <button
              onClick={onBack}
              style={{ ...smallBtnStyle, fontSize: 11 }}
            >
              ← Voltar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 2,
          marginBottom: 20,
          borderBottom: "1px solid #0f0f18",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              ...monoStyle,
              fontSize: 12,
              padding: "8px 16px",
              background: "transparent",
              border: "none",
              borderBottom: tab === t.id ? `2px solid ${client.color}` : "2px solid transparent",
              color: tab === t.id ? "#E4E4E7" : "#444",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {[
            { label: "PAÍS / REGIÃO", value: `${client.audience.flag} ${client.audience.country}` },
            { label: "IDIOMA", value: client.audience.language },
            {
              label: "TIMEZONE",
              value: `UTC${client.audience.utcOffset >= 0 ? "+" : ""}${client.audience.utcOffset}`,
            },
            { label: "AUDIÊNCIA", value: client.audience.demographics },
            { label: "HORÁRIOS DE PICO", value: client.audience.peakHours.join(", ") },
            { label: "MELHORES DIAS", value: client.audience.peakDays.join(", ") },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "12px 16px" }}
            >
              <div style={{ ...monoStyle, fontSize: 9, color: "#444", letterSpacing: "0.12em" }}>
                {label}
              </div>
              <div style={{ fontSize: 13, color: "#D4D4D8", marginTop: 6, lineHeight: 1.4 }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "voice" && (
        <div
          style={{
            background: "rgba(0,0,0,0.2)",
            borderRadius: 12,
            padding: 20,
            border: "1px solid #14141e",
          }}
        >
          <div style={{ ...monoStyle, fontSize: 9, color: "#444", letterSpacing: "0.12em", marginBottom: 12 }}>
            TOM DE VOZ & IDENTIDADE
          </div>
          <pre
            style={{
              color: "#888",
              fontSize: 13,
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              margin: 0,
            }}
          >
            {toneSection || client.systemPrompt.substring(0, 600)}
          </pre>
        </div>
      )}

      {tab === "rules" && (
        <div
          style={{
            background: "rgba(0,0,0,0.2)",
            borderRadius: 12,
            padding: 20,
            border: "1px solid #14141e",
          }}
        >
          <div style={{ ...monoStyle, fontSize: 9, color: "#444", letterSpacing: "0.12em", marginBottom: 12 }}>
            REGRAS & RESTRIÇÕES
          </div>
          <pre
            style={{
              color: "#888",
              fontSize: 13,
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              margin: 0,
            }}
          >
            {rules}
          </pre>
        </div>
      )}

      {tab === "metrics" && (
        <div>
          <div style={{ ...labelStyle, marginBottom: 12 }}>MÉTRICAS DO RELATÓRIO MENSAL</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 8,
            }}
          >
            {client.reportMetrics.map((m) => (
              <div
                key={m.id}
                style={{
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  border: "1px solid #14141e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 13, color: "#888" }}>{m.label}</span>
                <span
                  style={{
                    ...monoStyle,
                    fontSize: 9,
                    color: "#333",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid #1a1a2e",
                    borderRadius: 4,
                    padding: "2px 6px",
                  }}
                >
                  {m.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "briefing" && (
        <div
          style={{
            background: `linear-gradient(135deg, ${client.color}06, rgba(0,0,0,0.2))`,
            borderRadius: 12,
            padding: 20,
            border: `1px solid ${client.color}22`,
          }}
        >
          <div style={{ ...monoStyle, fontSize: 9, color: "#444", letterSpacing: "0.12em", marginBottom: 12 }}>
            FOCO DO BRIEFING DIÁRIO
          </div>
          <p style={{ fontSize: 14, color: "#888", lineHeight: 1.7, margin: 0 }}>
            {client.briefingFocus}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Client Form (add/edit) ────────────────────────────────────────────────

function ClientForm({ client, onSave, onCancel }) {
  const isNew = !client;
  const [form, setForm] = useState(
    client || {
      id: "",
      name: "",
      emoji: "🏢",
      color: "#0052FF",
      revenue: "",
      role: "",
      platforms: [],
      audience: {
        country: "",
        flag: "🌐",
        timezone: "UTC",
        utcOffset: 0,
        language: "",
        peakHours: [],
        peakDays: [],
        demographics: "",
      },
      systemPrompt: "",
      reportMetrics: [],
      briefingFocus: "",
    }
  );

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setAudience = (key, val) =>
    setForm((p) => ({ ...p, audience: { ...p.audience, [key]: val } }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    const id = form.id || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    onSave({ ...form, id });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#E4E4E7" }}>
          {isNew ? "Novo Cliente" : `Editar — ${client.name}`}
        </div>
        <button onClick={onCancel} style={smallBtnStyle}>
          ← Cancelar
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Nome */}
        <div style={{ gridColumn: "span 2" }}>
          <div style={labelStyle}>NOME DO CLIENTE</div>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ex: Base Brasil"
            style={inputStyle}
          />
        </div>

        {/* Emoji + Color */}
        <div>
          <div style={labelStyle}>EMOJI</div>
          <input
            value={form.emoji}
            onChange={(e) => set("emoji", e.target.value)}
            placeholder="🏢"
            style={{ ...inputStyle, width: 80 }}
          />
        </div>
        <div>
          <div style={labelStyle}>COR</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="color"
              value={form.color}
              onChange={(e) => set("color", e.target.value)}
              style={{ width: 40, height: 40, border: "none", background: "none", cursor: "pointer" }}
            />
            <input
              value={form.color}
              onChange={(e) => set("color", e.target.value)}
              placeholder="#0052FF"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </div>

        {/* Role + Revenue */}
        <div>
          <div style={labelStyle}>PAPEL / SERVIÇO</div>
          <input
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
            placeholder="Ex: Social Lead"
            style={inputStyle}
          />
        </div>
        <div>
          <div style={labelStyle}>RECEITA MENSAL</div>
          <input
            value={form.revenue}
            onChange={(e) => set("revenue", e.target.value)}
            placeholder="Ex: $1,500/mês"
            style={inputStyle}
          />
        </div>

        {/* Platforms */}
        <div style={{ gridColumn: "span 2" }}>
          <div style={labelStyle}>PLATAFORMAS (separadas por vírgula)</div>
          <input
            value={form.platforms.join(", ")}
            onChange={(e) =>
              set(
                "platforms",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            placeholder="Ex: Twitter/X, Instagram"
            style={inputStyle}
          />
        </div>

        {/* Audience */}
        <div>
          <div style={labelStyle}>PAÍS / REGIÃO</div>
          <input
            value={form.audience.country}
            onChange={(e) => setAudience("country", e.target.value)}
            placeholder="Ex: Brasil"
            style={inputStyle}
          />
        </div>
        <div>
          <div style={labelStyle}>IDIOMA</div>
          <input
            value={form.audience.language}
            onChange={(e) => setAudience("language", e.target.value)}
            placeholder="Ex: PT-BR"
            style={inputStyle}
          />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <div style={labelStyle}>PERFIL DA AUDIÊNCIA</div>
          <input
            value={form.audience.demographics}
            onChange={(e) => setAudience("demographics", e.target.value)}
            placeholder="Ex: Devs, entusiastas crypto, 20-35 anos"
            style={inputStyle}
          />
        </div>

        {/* System Prompt */}
        <div style={{ gridColumn: "span 2" }}>
          <div style={labelStyle}>SYSTEM PROMPT (TOM DE VOZ + REGRAS)</div>
          <textarea
            value={form.systemPrompt}
            onChange={(e) => set("systemPrompt", e.target.value)}
            placeholder="Descreva o tom de voz, regras e exemplos para este cliente..."
            style={{ ...textareaStyle, minHeight: 200 }}
          />
        </div>

        {/* Briefing Focus */}
        <div style={{ gridColumn: "span 2" }}>
          <div style={labelStyle}>FOCO DO BRIEFING DIÁRIO</div>
          <textarea
            value={form.briefingFocus}
            onChange={(e) => set("briefingFocus", e.target.value)}
            placeholder="Quais tópicos o Claude deve pesquisar para este cliente?"
            style={{ ...textareaStyle, minHeight: 80 }}
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
        <button onClick={onCancel} style={smallBtnStyle}>
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!form.name.trim()}
          style={primaryBtnStyle(!form.name.trim())}
        >
          {isNew ? "✚ Adicionar Cliente" : "💾 Salvar Alterações"}
        </button>
      </div>
    </div>
  );
}

// ─── Main ClientBase module ────────────────────────────────────────────────

export default function ClientBase() {
  const [clients, setClients] = useState(() => {
    try {
      const saved = localStorage.getItem("2l-clients");
      return saved ? JSON.parse(saved) : CLIENT_PROFILES;
    } catch {
      return CLIENT_PROFILES;
    }
  });
  const [view, setView] = useState("list"); // list | detail | form
  const [selected, setSelected] = useState(null);
  const [editingClient, setEditingClient] = useState(null);

  const saveClients = (updated) => {
    setClients(updated);
    localStorage.setItem("2l-clients", JSON.stringify(updated));
  };

  const handleSave = (client) => {
    const existing = clients.findIndex((c) => c.id === client.id);
    const updated =
      existing >= 0
        ? clients.map((c) => (c.id === client.id ? client : c))
        : [...clients, client];
    saveClients(updated);
    setView(existing >= 0 ? "detail" : "list");
    if (existing >= 0) setSelected(client);
  };

  const handleDelete = (id) => {
    if (!confirm("Remover este cliente?")) return;
    saveClients(clients.filter((c) => c.id !== id));
    setView("list");
    setSelected(null);
  };

  const totalRevenue = clients
    .filter((c) => c.revenue?.startsWith("$") && !c.revenue.includes("Próprio"))
    .reduce((sum, c) => {
      const match = c.revenue.match(/\$([\d,]+)/);
      return sum + (match ? parseInt(match[1].replace(",", "")) : 0);
    }, 0);

  if (view === "form") {
    return (
      <ClientForm
        client={editingClient}
        onSave={handleSave}
        onCancel={() => {
          setView(editingClient ? "detail" : "list");
          if (!editingClient) setSelected(null);
        }}
      />
    );
  }

  if (view === "detail" && selected) {
    return (
      <ClientDetail
        client={selected}
        onBack={() => setView("list")}
        onEdit={() => {
          setEditingClient(selected);
          setView("form");
        }}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#E4E4E7" }}>
            Base de Clientes
          </div>
          <div style={{ ...monoStyle, fontSize: 11, color: "#444", marginTop: 4 }}>
            {clients.length} clientes · MRR:{" "}
            <span style={{ color: "#10B981" }}>${totalRevenue.toLocaleString()}/mês</span>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            setView("form");
          }}
          style={primaryBtnStyle(false)}
        >
          ✚ Novo Cliente
        </button>
      </div>

      {/* Client grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 14,
        }}
      >
        {clients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            onClick={() => {
              setSelected(client);
              setView("detail");
            }}
          />
        ))}
      </div>

      {clients.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#333",
            ...monoStyle,
            fontSize: 13,
          }}
        >
          Nenhum cliente cadastrado ainda.
        </div>
      )}
    </div>
  );
}
