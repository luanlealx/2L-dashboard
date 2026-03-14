import { useState, useEffect, useRef } from "react";
import { C, label } from "./tokens.js";
import { useClients } from "./hooks/useClients.js";

const CALENDAR_DB = "095fcad2-a607-4087-81ab-e72ee8a9b789";

const COLUMNS = ["Ideia", "Draft", "Review", "Aprovado", "Agendado", "Publicado"];

const COLUMN_COLORS = {
  "Ideia":     C.textDim,
  "Draft":     "#6B9FFF",
  "Review":    "#fbbf24",
  "Aprovado":  "#4ade80",
  "Agendado":  "#a78bfa",
  "Publicado": "#34d399",
};

const PLATFORMS = ["X/Twitter", "Instagram", "LinkedIn", "Farcaster"];
const FORMATS   = ["Thread", "Post único", "Carrossel", "Vídeo", "Story", "Artigo"];

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

function todayISO() { return new Date().toISOString().split("T")[0]; }

async function notionQuery(filter) {
  const res = await fetch("/api/notion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: `databases/${CALENDAR_DB}/query`,
      method: "POST",
      body: { page_size: 100, ...(filter ? { filter } : {}) },
    }),
  });
  if (!res.ok) throw new Error(`Notion ${res.status}`);
  return res.json();
}

async function notionPatch(pageId, properties) {
  const res = await fetch("/api/notion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: `pages/${pageId}`,
      method: "PATCH",
      body: { properties },
    }),
  });
  if (!res.ok) throw new Error(`Notion ${res.status}`);
  return res.json();
}

async function notionCreate(properties) {
  const res = await fetch("/api/notion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: "pages",
      method: "POST",
      body: { parent: { database_id: CALENDAR_DB }, properties },
    }),
  });
  if (!res.ok) throw new Error(`Notion ${res.status}`);
  return res.json();
}

// ─── Modal novo post ───────────────────────────────────────────────────────────

function NewPostModal({ clients, onClose, onCreated }) {
  const [title,    setTitle]    = useState("");
  const [clientNm, setClientNm] = useState(clients[0]?.name ?? "");
  const [platform, setPlatform] = useState("X/Twitter");
  const [format,   setFormat]   = useState("Post único");
  const [date,     setDate]     = useState(todayISO());
  const [status,   setStatus]   = useState("Ideia");
  const [copy,     setCopy]     = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      await notionCreate({
        Name:       { title:     [{ text: { content: title.trim() } }] },
        Cliente:    { rich_text: [{ text: { content: clientNm } }] },
        Plataforma: { select:    { name: platform } },
        Formato:    { select:    { name: format } },
        Status:     { select:    { name: status } },
        Data:       { date:      { start: date } },
        ...(copy.trim() ? { Copy: { rich_text: [{ text: { content: copy.trim() } }] } } : {}),
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
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 500, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "28px 28px 24px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.textBright, marginBottom: 20 }}>+ Novo post</div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ ...label, color: C.textMuted }}>Título</div>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do post…" style={inputStyle} />
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...label, color: C.textMuted }}>Cliente</div>
            <select value={clientNm} onChange={e => setClientNm(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {clients.map(c => <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...label, color: C.textMuted }}>Status</div>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {COLUMNS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...label, color: C.textMuted }}>Plataforma</div>
            <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...label, color: C.textMuted }}>Formato</div>
            <select value={format} onChange={e => setFormat(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {FORMATS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ ...label, color: C.textMuted }}>Data</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ ...label, color: C.textMuted }}>Copy <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>· opcional</span></div>
          <textarea value={copy} onChange={e => setCopy(e.target.value)} placeholder="Texto do post…" rows={4} style={{ ...inputStyle, resize: "none" }} />
        </div>

        {error && <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 14, background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.errorText, fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, background: "none", border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>Cancelar</button>
          <button onClick={submit} disabled={saving || !title.trim()} style={{ padding: "9px 18px", borderRadius: 8, background: saving || !title.trim() ? C.border : C.brand, border: "none", color: saving || !title.trim() ? C.textMuted : "#fff", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: saving || !title.trim() ? "not-allowed" : "pointer" }}>
            {saving ? "Criando…" : "Criar post"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function PostCard({ post, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, post.id)}
      style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: "12px 14px", cursor: "grab",
        userSelect: "none", transition: "border-color 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = C.brand}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      <div style={{ fontSize: 13, fontWeight: 500, color: C.textBright, lineHeight: 1.4, marginBottom: 8 }}>
        {post.title}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {post.client && (
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted }}>
            {post.clientEmoji} {post.client}
          </span>
        )}
        {post.platform && (
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted }}>
            {post.platform}
          </span>
        )}
        {post.format && (
          <span style={{ fontSize: 10, color: C.textDim }}>
            {post.format}
          </span>
        )}
      </div>
      {post.date && (
        <div style={{ fontSize: 10, fontFamily: "monospace", color: C.textDim, marginTop: 8 }}>
          {new Date(post.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        </div>
      )}
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({ name, posts, onDragStart, onDrop }) {
  const [over, setOver] = useState(false);
  const color = COLUMN_COLORS[name] ?? C.textMuted;

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { setOver(false); onDrop(e, name); }}
      style={{
        minWidth: 220, flex: "1 1 220px",
        background: over ? "rgba(0,82,255,0.05)" : C.surfaceAlt,
        border: `1px solid ${over ? C.brandBorder : C.border}`,
        borderRadius: 12, padding: "14px 12px",
        transition: "all 0.15s",
      }}
    >
      {/* Column header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.textBright }}>{name}</span>
        </div>
        <span style={{ fontSize: 11, color: C.textDim, fontFamily: "monospace" }}>{posts.length}</span>
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {posts.map(p => (
          <PostCard key={p.id} post={p} onDragStart={onDragStart} />
        ))}
        {posts.length === 0 && (
          <div style={{ padding: "20px 0", textAlign: "center", color: C.textDim, fontSize: 12 }}>
            Vazio
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ContentCalendar() {
  const { clients } = useClients();
  const [posts,      setPosts]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [showModal,  setShowModal]  = useState(false);
  const [tick,       setTick]       = useState(0);
  const draggingId = useRef(null);

  // emoji map from clients
  const emojiMap = Object.fromEntries(clients.map(c => [c.name, c.emoji]));

  useEffect(() => {
    setLoading(true);
    setError("");
    notionQuery()
      .then(data => {
        const items = (data.results ?? []).map(p => ({
          id:          p.id,
          title:       getText(getProp(p.properties, "Name", "Nome", "Título")) || "Sem título",
          client:      getText(getProp(p.properties, "Cliente", "cliente")) || "",
          platform:    getText(getProp(p.properties, "Plataforma", "plataforma")) || "",
          format:      getText(getProp(p.properties, "Formato", "formato")) || "",
          status:      getText(getProp(p.properties, "Status", "status")) || "Ideia",
          date:        getText(getProp(p.properties, "Data", "data")) || "",
        }));
        setPosts(items.map(p => ({ ...p, clientEmoji: emojiMap[p.client] ?? "🏢" })));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tick, clients.length]);

  function onDragStart(e, id) {
    draggingId.current = id;
    e.dataTransfer.effectAllowed = "move";
  }

  async function onDrop(e, targetStatus) {
    const id = draggingId.current;
    if (!id) return;
    const post = posts.find(p => p.id === id);
    if (!post || post.status === targetStatus) return;

    // Optimistic update
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: targetStatus } : p));

    try {
      await notionPatch(id, { Status: { select: { name: targetStatus } } });
    } catch (e) {
      // Revert on error
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: post.status } : p));
      setError(`Erro ao mover: ${e.message}`);
    } finally {
      draggingId.current = null;
    }
  }

  const byStatus = COLUMNS.reduce((acc, col) => {
    acc[col] = posts.filter(p => p.status === col || (!COLUMNS.includes(p.status) && col === "Ideia"));
    return acc;
  }, {});

  return (
    <div style={{ padding: "40px 32px 80px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ ...label, color: C.brand }}>Calendário de Conteúdo</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: C.textBright, margin: 0 }}>
            Kanban de posts
          </h1>
          <p style={{ fontSize: 13, color: C.textMuted, marginTop: 6 }}>
            Arraste os cards entre as colunas para atualizar o status no Notion.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ padding: "10px 20px", borderRadius: 9, border: "none", background: C.brand, color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", flexShrink: 0 }}
        >
          + Novo post
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "10px 16px", borderRadius: 8, marginBottom: 20, background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.errorText, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Board */}
      {loading ? (
        <div style={{ color: C.textDim, fontSize: 14, padding: "40px 0" }}>Carregando posts…</div>
      ) : (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16, WebkitOverflowScrolling: "touch" }}>
          {COLUMNS.map(col => (
            <Column
              key={col}
              name={col}
              posts={byStatus[col] ?? []}
              onDragStart={onDragStart}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NewPostModal
          clients={clients}
          onClose={() => setShowModal(false)}
          onCreated={() => setTick(t => t + 1)}
        />
      )}
    </div>
  );
}
