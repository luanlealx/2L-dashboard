import { useState, useEffect } from "react";
import { C, label } from "./tokens.js";
import { useClients } from "./hooks/useClients.js";

const CALENDAR_DB   = "095fcad2-a607-4087-81ab-e72ee8a9b789";
const DELIVERIES_DB = "69f232c0-cf1a-42c6-9195-bbd4dcdc1613";

const STATUS_COLORS = {
  "Ativo":    { bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.3)",  text: "#4ade80" },
  "Pausado":  { bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)", text: "#fbbf24" },
  "Prospect": { bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.3)", text: "#a78bfa" },
};

const PRIORITY_COLORS = {
  "Alta":  { bg: "rgba(239,68,68,0.12)",  text: "#f87171" },
  "Média": { bg: "rgba(251,191,36,0.12)", text: "#fbbf24" },
  "Baixa": { bg: "rgba(34,197,94,0.12)",  text: "#4ade80" },
};

function todayISO() { return new Date().toISOString().split("T")[0]; }

function getProp(props, ...keys) {
  for (const k of keys) if (props[k]) return props[k];
  return null;
}

function getText(prop) {
  if (!prop) return "";
  if (prop.type === "title")        return prop.title.map(t => t.plain_text).join("").trim();
  if (prop.type === "rich_text")    return prop.rich_text.map(t => t.plain_text).join("").trim();
  if (prop.type === "select")       return prop.select?.name ?? "";
  if (prop.type === "status")       return prop.status?.name ?? "";
  if (prop.type === "date")         return prop.date?.start ?? "";
  if (prop.type === "multi_select") return prop.multi_select.map(s => s.name).join(", ");
  return "";
}

async function notionQuery(dbId, filter) {
  const res = await fetch("/api/notion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: `databases/${dbId}/query`,
      method: "POST",
      body: { page_size: 20, ...(filter ? { filter } : {}) },
    }),
  });
  if (!res.ok) throw new Error(`Notion ${res.status}`);
  return res.json();
}

async function notionCreate(dbId, properties) {
  const res = await fetch("/api/notion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: "pages",
      method: "POST",
      body: { parent: { database_id: dbId }, properties },
    }),
  });
  if (!res.ok) throw new Error(`Notion ${res.status}`);
  return res.json();
}

// ─── Modal nova entrega ────────────────────────────────────────────────────────

function NewDeliveryModal({ clients, onClose, onCreated }) {
  const [task,     setTask]     = useState("");
  const [clientNm, setClientNm] = useState(clients[0]?.name ?? "");
  const [priority, setPriority] = useState("Média");
  const [dueDate,  setDueDate]  = useState(todayISO());
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  async function submit() {
    if (!task.trim()) return;
    setSaving(true);
    setError("");
    try {
      await notionCreate(DELIVERIES_DB, {
        Name:          { title:     [{ text: { content: task.trim() } }] },
        Cliente:       { rich_text: [{ text: { content: clientNm } }] },
        Prioridade:    { select:    { name: priority } },
        Status:        { select:    { name: "A fazer" } },
        "Data Limite": { date:      { start: dueDate } },
      });
      onCreated();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 8, outline: "none",
    background: C.bg, border: `1px solid ${C.border}`,
    color: C.textBright, fontSize: 14, fontFamily: "inherit",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "28px 28px 24px" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.textBright, marginBottom: 20 }}>Nova entrega</div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ ...label, color: C.textMuted }}>Tarefa</div>
          <input autoFocus value={task} onChange={e => setTask(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Descreva a entrega…" style={inputStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ ...label, color: C.textMuted }}>Cliente</div>
          <select value={clientNm} onChange={e => setClientNm(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {clients.map(c => <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...label, color: C.textMuted }}>Prioridade</div>
            <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {["Alta", "Média", "Baixa"].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...label, color: C.textMuted }}>Data limite</div>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {error && <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 14, background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.errorText, fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, background: "none", border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>Cancelar</button>
          <button onClick={submit} disabled={saving || !task.trim()} style={{ padding: "9px 18px", borderRadius: 8, background: saving || !task.trim() ? C.border : C.brand, border: "none", color: saving || !task.trim() ? C.textMuted : "#fff", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: saving || !task.trim() ? "not-allowed" : "pointer" }}>
            {saving ? "Criando…" : "Criar entrega"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home({ onNavigate }) {
  const { clients } = useClients();
  const [todayPosts,  setTodayPosts]  = useState([]);
  const [deliveries,  setDeliveries]  = useState([]);
  const [loadingP,    setLoadingP]    = useState(true);
  const [loadingD,    setLoadingD]    = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [deliveryTick, setDeliveryTick] = useState(0);

  // Posts de hoje do Calendar
  useEffect(() => {
    setLoadingP(true);
    notionQuery(CALENDAR_DB, {
      property: "Data",
      date: { equals: todayISO() },
    })
      .then(data => {
        const items = (data.results ?? []).map(p => ({
          id:        p.id,
          title:     getText(getProp(p.properties, "Name", "Nome", "Título")) || "Sem título",
          client:    getText(getProp(p.properties, "Cliente", "cliente")) || "",
          platform:  getText(getProp(p.properties, "Plataforma", "plataforma")) || "",
          format:    getText(getProp(p.properties, "Formato", "formato")) || "",
          status:    getText(getProp(p.properties, "Status", "status")) || "",
        }));
        setTodayPosts(items);
      })
      .catch(() => {})
      .finally(() => setLoadingP(false));
  }, []);

  // Entregas pendentes
  useEffect(() => {
    setLoadingD(true);
    notionQuery(DELIVERIES_DB, {
      or: [
        { property: "Status", select: { equals: "A fazer" } },
        { property: "Status", select: { equals: "Em andamento" } },
      ],
    })
      .then(data => {
        const items = (data.results ?? []).slice(0, 6).map(p => ({
          id:       p.id,
          task:     getText(getProp(p.properties, "Name", "Nome")) || "Sem título",
          client:   getText(getProp(p.properties, "Cliente", "cliente")) || "",
          priority: getText(getProp(p.properties, "Prioridade", "prioridade")) || "",
          due:      getText(getProp(p.properties, "Data Limite", "Due Date")) || "",
        }));
        setDeliveries(items);
      })
      .catch(() => {})
      .finally(() => setLoadingD(false));
  }, [deliveryTick]);

  function SectionHead({ title, action }) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 3, height: 14, borderRadius: 2, background: C.brand, display: "inline-block" }} />
          <span style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: "0.16em", color: C.brand, textTransform: "uppercase" }}>{title}</span>
        </div>
        {action}
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 40px 80px", maxWidth: 1000, margin: "0 auto" }}>

      <div style={{ marginBottom: 36 }}>
        <div style={{ ...label, color: C.brand }}>Overview</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: C.textBright, margin: 0 }}>
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>

        {/* ── 1. Clientes ativos ── */}
        <div style={{ gridColumn: "1 / -1" }}>
          <SectionHead title="Clientes ativos" />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {clients.map(c => {
              const sc = STATUS_COLORS[c.status] ?? STATUS_COLORS["Ativo"];
              return (
                <button
                  key={c.id}
                  onClick={() => onNavigate?.("clients", c.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 12, cursor: "pointer", background: C.surface, border: `1px solid ${C.border}`, textAlign: "left", fontFamily: "inherit", transition: "border-color 0.15s", flex: "1 1 180px" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.brand}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                >
                  <span style={{ fontSize: 22 }}>{c.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textBright }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.plataformas || c.nicho || "—"}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "monospace", padding: "3px 8px", borderRadius: 20, flexShrink: 0, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}>{c.status || "Ativo"}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 2. Posts de hoje ── */}
        <div>
          <SectionHead
            title="Posts de hoje"
            action={<button onClick={() => onNavigate?.("calendar")} style={{ fontSize: 11, color: C.brand, background: "none", border: "none", cursor: "pointer", fontFamily: "monospace" }}>Ver calendário →</button>}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {loadingP ? (
              <div style={{ color: C.textDim, fontSize: 13, padding: "20px 0" }}>Carregando…</div>
            ) : todayPosts.length === 0 ? (
              <div style={{ padding: "20px 18px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, textAlign: "center" }}>
                Nenhum post agendado para hoje.{" "}
                <button onClick={() => onNavigate?.("calendar")} style={{ color: C.brand, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Abrir calendário →</button>
              </div>
            ) : todayPosts.map(p => (
              <div key={p.id} style={{ padding: "10px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.textBright, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>{[p.client, p.platform, p.format].filter(Boolean).join(" · ")}</div>
                </div>
                {p.status && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.textMuted, flexShrink: 0 }}>{p.status}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. Entregas pendentes ── */}
        <div>
          <SectionHead
            title="Entregas pendentes"
            action={<button onClick={() => setShowModal(true)} style={{ fontSize: 11, fontFamily: "monospace", padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.brandBorder}`, background: C.brandDim, color: C.brand, cursor: "pointer" }}>+ Nova tarefa</button>}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {loadingD ? (
              <div style={{ color: C.textDim, fontSize: 13, padding: "20px 0" }}>Carregando…</div>
            ) : deliveries.length === 0 ? (
              <div style={{ padding: "20px 18px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.textDim, fontSize: 13, textAlign: "center" }}>Nenhuma entrega pendente.</div>
            ) : deliveries.map(d => {
              const pc = PRIORITY_COLORS[d.priority];
              return (
                <div key={d.id} style={{ padding: "10px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: C.textBright, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.task}</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>{[d.client, d.due].filter(Boolean).join(" · ")}</div>
                  </div>
                  {pc && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, flexShrink: 0, background: pc.bg, color: pc.text }}>{d.priority}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. Ações rápidas ── */}
        <div style={{ gridColumn: "1 / -1" }}>
          <SectionHead title="Ações rápidas" />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { icon: "☀", label: "Morning Briefing",  target: "briefing" },
              { icon: "🔍", label: "Daily Briefing",    target: "daily" },
              { icon: "📅", label: "Calendário",        target: "calendar" },
              { icon: "⚡", label: "Multiplicar",       target: "multiplier" },
              { icon: "👥", label: "Clientes",          target: "clients" },
            ].map(a => (
              <button
                key={a.target}
                onClick={() => onNavigate?.(a.target)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 20px", borderRadius: 12, cursor: "pointer", background: C.surface, border: `1px solid ${C.border}`, fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: C.textMuted, transition: "all 0.15s", flex: "1 1 140px" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.brand; e.currentTarget.style.color = C.textBright; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
              >
                <span style={{ fontSize: 18 }}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {showModal && (
        <NewDeliveryModal
          clients={clients}
          onClose={() => setShowModal(false)}
          onCreated={() => setDeliveryTick(t => t + 1)}
        />
      )}
    </div>
  );
}
