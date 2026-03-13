import { useState, useEffect } from "react";
import { C, label } from "./tokens.js";
import { useClients } from "./hooks/useClients.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["Ativo", "Pausado", "Prospect"];

const STATUS_STYLE = {
  Ativo:    { bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.3)",  text: "#34D399" },
  Pausado:  { bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.3)",  text: "#FBBF24" },
  Prospect: { bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.3)", text: "#9CA3AF" },
};

const IDIOMA_OPTIONS = [
  "Português brasileiro",
  "English only",
  "Português e Inglês",
];

// Notion page IDs are 32-char hex (with optional dashes)
function isNotionId(id) {
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(id)
    || /^[0-9a-f]{32}$/i.test(id);
}

function toRichText(text) {
  if (!text) return [{ text: { content: "" } }];
  const chunks = [];
  for (let i = 0; i < text.length; i += 2000) {
    chunks.push({ text: { content: text.slice(i, i + 2000) } });
  }
  return chunks;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ value }) {
  const s = STATUS_STYLE[value] ?? STATUS_STYLE.Prospect;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      background: s.bg, border: `1px solid ${s.border}`,
      fontSize: 11, fontWeight: 600, color: s.text,
      fontFamily: "monospace", letterSpacing: "0.08em",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.text, display: "inline-block" }} />
      {value}
    </span>
  );
}

function Field({ lbl, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <label style={{ ...label, color: C.textDim }}>{lbl}</label>
      {children}
    </div>
  );
}

function inputStyle(focused) {
  return {
    width: "100%", display: "block",
    background: C.surfaceAlt,
    border: `1px solid ${focused ? C.brand : C.border}`,
    borderRadius: 10, padding: "10px 13px",
    fontSize: 14, lineHeight: 1.6,
    color: C.textBright, fontFamily: "inherit",
    transition: "border-color 0.15s",
    boxShadow: focused ? "0 0 0 3px rgba(0,82,255,0.08)" : "none",
    outline: "none",
  };
}

function PlatformTags({ value }) {
  const tags = value.split(",").map(t => t.trim()).filter(Boolean);
  if (!tags.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
      {tags.map((t, i) => (
        <span key={i} style={{
          fontSize: 11, padding: "2px 9px", borderRadius: 20,
          background: C.brandDim, border: `1px solid ${C.brandBorder}`,
          color: "#6B9FFF", fontFamily: "monospace",
        }}>
          {t}
        </span>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClientBase() {
  const { clients, loading: clientsLoading, refresh } = useClients();
  const [selectedId, setSelectedId] = useState(null);
  const selected = clients.find(c => c.id === selectedId) ?? null;

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveOk, setSaveOk] = useState(false);

  // Focus tracking per field
  const [focused, setFocused] = useState({});
  const onFocus = (k) => setFocused(f => ({ ...f, [k]: true }));
  const onBlur  = (k) => setFocused(f => ({ ...f, [k]: false }));

  // Populate form when selection changes
  useEffect(() => {
    if (!selected) { setForm(null); return; }
    setForm({
      status:     selected.status     ?? "Ativo",
      nicho:      selected.nicho      ?? "",
      plataformas: selected.plataformas ?? "",
      idioma:     selected.idioma     ?? "",
      tomDeVoz:   selected.tomDeVoz   ?? "",
      restricoes: selected.restricoes ?? "",
      objetivos:  selected.objetivos  ?? "",
    });
    setSaveError(null);
    setSaveOk(false);
  }, [selectedId]);

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }));
    setSaveOk(false);
    setSaveError(null);
  }

  async function handleSave() {
    if (!selected || !form || saving) return;

    if (!isNotionId(selected.id)) {
      setSaveError("Este cliente não está conectado ao Notion. Configure NOTION_TOKEN e recarregue a página.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveOk(false);

    try {
      const properties = {
        "Nicho":      { rich_text: toRichText(form.nicho) },
        "Tom de Voz": { rich_text: toRichText(form.tomDeVoz) },
        "Restrições": { rich_text: toRichText(form.restricoes) },
        "Objetivos":  { rich_text: toRichText(form.objetivos) },
        "Idioma":     { select: { name: form.idioma || "Português brasileiro" } },
        "Plataformas": {
          multi_select: form.plataformas
            .split(",").map(s => s.trim()).filter(Boolean).map(name => ({ name })),
        },
        "Status": { status: { name: form.status } },
      };

      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `pages/${selected.id}`,
          method: "PATCH",
          body: { properties },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Notion error ${res.status}`);
      }

      setSaveOk(true);
      refresh();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: C.textBright, letterSpacing: "-0.02em", lineHeight: 1 }}>
          Client Base
        </h1>
        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 8 }}>
          Perfis dos clientes — edite e sincronize com o Notion.
        </p>
      </div>

      {/* Two-panel layout */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

        {/* ── Left: client list ── */}
        <div style={{
          width: 200, flexShrink: 0,
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 14, overflow: "hidden",
          position: "sticky", top: 72,
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: `1px solid ${C.border}`,
            fontSize: 10, fontFamily: "monospace", letterSpacing: "0.18em",
            color: C.textDim, textTransform: "uppercase",
          }}>
            Clientes
          </div>

          {clientsLoading ? (
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  height: 36, borderRadius: 8,
                  background: C.surfaceAlt,
                  opacity: 1 - i * 0.15,
                }} />
              ))}
            </div>
          ) : (
            <div style={{ padding: 8 }}>
              {clients.map((c) => {
                const isActive = selectedId === c.id;
                const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.Prospect;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 9,
                      padding: "9px 10px", borderRadius: 8,
                      background: isActive ? C.brandDim : "none",
                      border: `1px solid ${isActive ? C.brandBorder : "transparent"}`,
                      cursor: "pointer", textAlign: "left",
                      transition: "all 0.12s",
                    }}
                  >
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{c.emoji}</span>
                    <div style={{ overflow: "hidden", flex: 1 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500,
                        color: isActive ? C.textBright : C.text,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {c.name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.text, display: "inline-block", flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: st.text, fontFamily: "monospace" }}>{c.status ?? "Ativo"}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right: detail panel ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected ? (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: "60px 24px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>👥</div>
              <p style={{ fontSize: 14, color: C.textMuted }}>Selecione um cliente para ver o perfil</p>
            </div>
          ) : form && (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: "28px 28px 32px",
            }}>

              {/* Profile header */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                  background: C.surfaceAlt, border: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22,
                }}>
                  {selected.emoji}
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: C.textBright, lineHeight: 1.2 }}>
                    {selected.name}
                  </h2>
                  <div style={{ marginTop: 6 }}>
                    <StatusBadge value={form.status} />
                  </div>
                </div>
              </div>

              {/* ── Status ── */}
              <Field lbl="Status">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = form.status === opt;
                    const s = STATUS_STYLE[opt];
                    return (
                      <button
                        key={opt}
                        onClick={() => set("status", opt)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "5px 13px", borderRadius: 20,
                          cursor: "pointer", fontFamily: "inherit",
                          fontSize: 12, fontWeight: 600,
                          transition: "all 0.12s",
                          background: isSelected ? s.bg : C.surfaceAlt,
                          border: `1px solid ${isSelected ? s.border : C.border}`,
                          color: isSelected ? s.text : C.textMuted,
                        }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? s.text : C.textDim, display: "inline-block" }} />
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* ── Nicho ── */}
              <Field lbl="Nicho">
                <input
                  type="text"
                  value={form.nicho}
                  onChange={(e) => set("nicho", e.target.value)}
                  onFocus={() => onFocus("nicho")}
                  onBlur={() => onBlur("nicho")}
                  placeholder="Ex: Privacy payments em Base L2"
                  style={inputStyle(focused.nicho)}
                />
              </Field>

              {/* ── Plataformas ── */}
              <Field lbl="Plataformas · separadas por vírgula">
                <input
                  type="text"
                  value={form.plataformas}
                  onChange={(e) => set("plataformas", e.target.value)}
                  onFocus={() => onFocus("plataformas")}
                  onBlur={() => onBlur("plataformas")}
                  placeholder="Ex: Instagram, X / Twitter, LinkedIn"
                  style={inputStyle(focused.plataformas)}
                />
                <PlatformTags value={form.plataformas} />
              </Field>

              {/* ── Idioma ── */}
              <Field lbl="Idioma">
                <div style={{ position: "relative" }}>
                  <select
                    value={form.idioma}
                    onChange={(e) => set("idioma", e.target.value)}
                    style={{
                      ...inputStyle(focused.idioma),
                      appearance: "none", WebkitAppearance: "none",
                      paddingRight: 36, cursor: "pointer",
                    }}
                    onFocus={() => onFocus("idioma")}
                    onBlur={() => onBlur("idioma")}
                  >
                    <option value="">— selecione —</option>
                    {IDIOMA_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <span style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)",
                    color: C.textDim, fontSize: 10, pointerEvents: "none",
                  }}>▼</span>
                </div>
              </Field>

              {/* ── Tom de Voz ── */}
              <Field lbl="Tom de Voz">
                <textarea
                  value={form.tomDeVoz}
                  onChange={(e) => set("tomDeVoz", e.target.value)}
                  onFocus={() => onFocus("tomDeVoz")}
                  onBlur={() => onBlur("tomDeVoz")}
                  placeholder="Descreva o tom, personalidade e estilo de comunicação..."
                  rows={3}
                  style={{ ...inputStyle(focused.tomDeVoz), resize: "vertical" }}
                />
              </Field>

              {/* ── Restrições ── */}
              <Field lbl="Restrições">
                <textarea
                  value={form.restricoes}
                  onChange={(e) => set("restricoes", e.target.value)}
                  onFocus={() => onFocus("restricoes")}
                  onBlur={() => onBlur("restricoes")}
                  placeholder="Palavras proibidas, compliance, temas a evitar..."
                  rows={3}
                  style={{ ...inputStyle(focused.restricoes), resize: "vertical" }}
                />
              </Field>

              {/* ── Objetivos ── */}
              <Field lbl="Objetivos">
                <textarea
                  value={form.objetivos}
                  onChange={(e) => set("objetivos", e.target.value)}
                  onFocus={() => onFocus("objetivos")}
                  onBlur={() => onBlur("objetivos")}
                  placeholder="Metas de negócio, métricas-alvo, focos estratégicos..."
                  rows={3}
                  style={{ ...inputStyle(focused.objetivos), resize: "vertical" }}
                />
              </Field>

              {/* ── Save row ── */}
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: "11px 28px", borderRadius: 10,
                    border: "none", cursor: saving ? "not-allowed" : "pointer",
                    fontSize: 14, fontWeight: 600, fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 8,
                    transition: "all 0.15s",
                    background: saving ? C.surface : C.brand,
                    color: saving ? C.textDim : "#fff",
                    boxShadow: saving ? "none" : "0 4px 18px rgba(0,82,255,0.3)",
                  }}
                >
                  {saving ? (
                    <>
                      <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Salvando...
                    </>
                  ) : "Salvar"}
                </button>

                {saveOk && (
                  <span style={{ fontSize: 13, color: "#34D399", display: "flex", alignItems: "center", gap: 5 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Salvo no Notion
                  </span>
                )}
              </div>

              {/* ── Save error ── */}
              {saveError && (
                <div style={{
                  marginTop: 14, padding: "12px 14px", borderRadius: 9,
                  background: C.errorBg, border: `1px solid ${C.errorBorder}`,
                  fontSize: 13, color: C.errorText,
                }}>
                  {saveError}
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
