import { useState, useEffect, useRef } from "react";
import { C, label } from "./tokens.js";
import { useClients, serializeIdiomaPerPlatform } from "./hooks/useClients.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["Ativo", "Pausado", "Prospect"];

const STATUS_STYLE = {
  Ativo:    { bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.3)",  text: "#34D399" },
  Pausado:  { bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.3)",  text: "#FBBF24" },
  Prospect: { bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.3)", text: "#9CA3AF" },
};

// Two options only — no mixed-language option
const IDIOMA_OPTIONS = ["Português brasileiro", "English only"];

// Ordered list of all supported platforms for toggle UI.
// Labels must match Notion's multi_select option names exactly.
const PLATFORM_OPTIONS = [
  { label: "X/Twitter", icon: "𝕏" },
  { label: "Instagram",  icon: "◎" },
  { label: "LinkedIn",   icon: "in" },
  { label: "Farcaster",  icon: "⌁" },
  { label: "Discord",    icon: "◈" },
];

const EXTRACT_FIELDS = [
  { key: "nicho",       lbl: "NICHO" },
  { key: "plataformas", lbl: "PLATAFORMAS" },
  { key: "idioma",      lbl: "IDIOMA" },
  { key: "tomDeVoz",    lbl: "TOM DE VOZ" },
  { key: "restricoes",  lbl: "RESTRIÇÕES" },
  { key: "objetivos",   lbl: "OBJETIVOS" },
];

const EXTRACT_SYSTEM = `Você é um extrator de dados para perfis de clientes de agência de marketing.
Analise o conteúdo e retorne APENAS um objeto JSON válido com estas chaves exatas (string vazia "" se não encontrar):

{
  "nicho": "setor ou mercado em uma frase",
  "plataformas": "plataformas de social media separadas por vírgula",
  "idioma": "idioma principal (ex: Português brasileiro, English only)",
  "tomDeVoz": "tom de voz e personalidade da marca",
  "restricoes": "restrições, palavras proibidas ou temas a evitar",
  "objetivos": "objetivos de marketing e negócio"
}

Sem markdown. Sem explicações. Apenas o JSON.`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });
}

// Toggle a platform label in/out of a comma-separated string,
// preserving PLATFORM_OPTIONS display order.
function togglePlatformStr(current, label) {
  const active = new Set(current.split(",").map(s => s.trim()).filter(Boolean));
  if (active.has(label)) active.delete(label);
  else active.add(label);
  return PLATFORM_OPTIONS.map(p => p.label).filter(l => active.has(l)).join(", ");
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClientBase() {
  const { clients, loading: clientsLoading, refresh } = useClients();
  const [selectedId, setSelectedId] = useState(null);
  const selected = clients.find(c => c.id === selectedId) ?? null;

  const [form, setForm]       = useState(null);
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveOk, setSaveOk]   = useState(false);

  // Document extraction state
  const [pasteText, setPasteText]     = useState("");
  const [pasteFocused, setPasteFocused] = useState(false);
  const [extracting, setExtracting]   = useState(false);
  const [extractError, setExtractError] = useState(null);
  const [extracted, setExtracted]     = useState(null);
  const extractFileRef = useRef(null);

  // Focus tracking per field
  const [focused, setFocused] = useState({});
  const onFocus = (k) => setFocused(f => ({ ...f, [k]: true }));
  const onBlur  = (k) => setFocused(f => ({ ...f, [k]: false }));

  // Populate form when selection changes
  useEffect(() => {
    if (!selected) { setForm(null); return; }
    setForm({
      status:              selected.status              ?? "Ativo",
      nicho:               selected.nicho               ?? "",
      plataformas:         selected.plataformas         ?? "",
      tomDeVoz:            selected.tomDeVoz            ?? "",
      restricoes:          selected.restricoes          ?? "",
      objetivos:           selected.objetivos           ?? "",
      idiomaPorPlataforma: selected.idiomaPorPlataforma ?? {},
    });
    setSaveError(null);
    setSaveOk(false);
    setExtracted(null);
    setExtractError(null);
  }, [selectedId]);

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }));
    setSaveOk(false);
    setSaveError(null);
  }

  // ── Extraction core ──────────────────────────────────────────────────────────

  async function runExtraction(messageContent) {
    setExtracting(true);
    setExtractError(null);
    setExtracted(null);
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          system: EXTRACT_SYSTEM,
          messages: [{ role: "user", content: messageContent }],
        }),
      });
      if (!res.ok) throw new Error(`Claude error ${res.status}`);
      const data = await res.json();
      const raw = data?.content?.[0]?.text ?? "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Não foi possível extrair dados do documento.");
      setExtracted(JSON.parse(match[0]));
    } catch (err) {
      setExtractError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  async function handleExtractText() {
    if (!pasteText.trim() || extracting) return;
    await runExtraction([{ type: "text", text: pasteText }]);
  }

  async function handleExtractFile(file) {
    let content;
    if (file.type === "application/pdf") {
      const data = await readAsBase64(file);
      content = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
        { type: "text", text: "Extraia as informações do cliente/marca acima e retorne o JSON." },
      ];
    } else {
      const text = await readAsText(file);
      content = [{ type: "text", text }];
    }
    await runExtraction(content);
  }

  function applyExtracted() {
    if (!extracted) return;
    setForm(f => ({
      ...f,
      ...Object.fromEntries(Object.entries(extracted).filter(([, v]) => v)),
    }));
    setExtracted(null);
  }

  // ── Save to Notion ───────────────────────────────────────────────────────────

  async function handleSave() {
    if (!selected || !form || saving) return;

    if (!isNotionId(selected.id)) {
      setSaveError(
        `Este cliente não está conectado ao Notion (id: "${selected.id}"). ` +
        "Verifique se NOTION_TOKEN está configurado e recarregue a página."
      );
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveOk(false);

    try {
      const properties = {
        "Nicho":                 { rich_text: toRichText(form.nicho) },
        "Tom de Voz":            { rich_text: toRichText(form.tomDeVoz) },
        "Restrições":            { rich_text: toRichText(form.restricoes) },
        "Objetivos":             { rich_text: toRichText(form.objetivos) },
        "Idioma por Plataforma": { rich_text: toRichText(serializeIdiomaPerPlatform(form.idiomaPorPlataforma)) },
        "Plataformas": {
          multi_select: form.plataformas
            .split(",").map(s => s.trim()).filter(Boolean).map(name => ({ name })),
        },
        "Status": { select: { name: form.status } },
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

  // ── Derived ──────────────────────────────────────────────────────────────────

  const activePlatforms = form
    ? new Set(form.plataformas.split(",").map(s => s.trim()).filter(Boolean))
    : new Set();

  const platformTags = form
    ? PLATFORM_OPTIONS.map(p => p.label).filter(l => activePlatforms.has(l))
    : [];

  // ── Render ───────────────────────────────────────────────────────────────────

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
                <div key={i} style={{ height: 36, borderRadius: 8, background: C.surfaceAlt, opacity: 1 - i * 0.15 }} />
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
                      cursor: "pointer", textAlign: "left", transition: "all 0.12s",
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
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.text, flexShrink: 0, display: "inline-block" }} />
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
              borderRadius: 14, padding: "60px 24px", textAlign: "center",
            }}>
              <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>👥</div>
              <p style={{ fontSize: 14, color: C.textMuted }}>Selecione um cliente para ver o perfil</p>
            </div>
          ) : form && (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: "28px 28px 32px",
            }}>

              {/* ── Profile header ── */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
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

              {/* ── Preencher com documento ── */}
              <div style={{
                marginBottom: 28, padding: "16px", borderRadius: 12,
                background: C.surfaceAlt, border: `1px solid ${C.border}`,
              }}>
                <label style={{ ...label, color: C.textDim, marginBottom: 10 }}>
                  Preencher com documento
                </label>

                {/* Paste textarea */}
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  onFocus={() => setPasteFocused(true)}
                  onBlur={() => setPasteFocused(false)}
                  placeholder={"Cole um briefing, proposta ou texto do cliente aqui..."}
                  rows={4}
                  style={{
                    width: "100%", display: "block",
                    background: C.surface,
                    border: `1px solid ${pasteFocused ? C.brand : C.border}`,
                    borderRadius: 9, padding: "10px 12px",
                    fontSize: 13, lineHeight: 1.6,
                    color: C.textBright, resize: "none", fontFamily: "inherit",
                    transition: "border-color 0.15s",
                    boxShadow: pasteFocused ? "0 0 0 3px rgba(0,82,255,0.08)" : "none",
                    outline: "none", marginBottom: 10,
                  }}
                />

                {/* Action row */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={handleExtractText}
                    disabled={extracting || !pasteText.trim()}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 14px", borderRadius: 8, border: "none",
                      background: pasteText.trim() && !extracting ? C.brand : C.surface,
                      color: pasteText.trim() && !extracting ? "#fff" : C.textDim,
                      fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                      cursor: pasteText.trim() && !extracting ? "pointer" : "not-allowed",
                      transition: "all 0.15s",
                    }}
                  >
                    {extracting ? (
                      <>
                        <svg className="spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                        Extraindo...
                      </>
                    ) : "Extrair do texto"}
                  </button>

                  <span style={{ fontSize: 11, color: C.textDim, fontFamily: "monospace" }}>ou</span>

                  <button
                    onClick={() => extractFileRef.current?.click()}
                    disabled={extracting}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "7px 12px", borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      background: "none", cursor: extracting ? "not-allowed" : "pointer",
                      fontSize: 12, fontWeight: 500, fontFamily: "inherit",
                      color: C.textMuted, transition: "all 0.15s",
                    }}
                  >
                    📄 Upload de arquivo
                  </button>
                  <input
                    ref={extractFileRef}
                    type="file"
                    accept=".pdf,.txt,.md"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files[0]) handleExtractFile(e.target.files[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              {/* ── Extraction error ── */}
              {extractError && (
                <div style={{
                  marginBottom: 20, padding: "11px 14px", borderRadius: 9,
                  background: C.errorBg, border: `1px solid ${C.errorBorder}`,
                  fontSize: 13, color: C.errorText,
                }}>
                  {extractError}
                </div>
              )}

              {/* ── Extraction preview ── */}
              {extracted && (
                <div className="slide-up" style={{
                  marginBottom: 28, borderRadius: 12, overflow: "hidden",
                  border: `1px solid ${C.brandBorder}`, background: C.surfaceAlt,
                }}>
                  <div style={{
                    padding: "11px 16px", borderBottom: `1px solid ${C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.brand, display: "inline-block" }} />
                      <span style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.16em", color: C.brand, textTransform: "uppercase" }}>
                        Dados extraídos
                      </span>
                    </div>
                    <button
                      onClick={() => setExtracted(null)}
                      style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px" }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
                    {EXTRACT_FIELDS.map(({ key, lbl }) => {
                      const val = extracted[key];
                      if (!val) return null;
                      return (
                        <div key={key} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <span style={{
                            fontSize: 9, color: C.textDim, fontFamily: "monospace",
                            letterSpacing: "0.12em", textTransform: "uppercase",
                            width: 76, flexShrink: 0, paddingTop: 3,
                          }}>
                            {lbl}
                          </span>
                          <span style={{ fontSize: 13, color: C.text, flex: 1, lineHeight: 1.5 }}>{val}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
                    <button
                      onClick={applyExtracted}
                      style={{
                        padding: "7px 16px", borderRadius: 8, border: "none",
                        background: C.brand, color: "#fff",
                        fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                      }}
                    >
                      Aplicar ao formulário
                    </button>
                    <button
                      onClick={() => setExtracted(null)}
                      style={{
                        padding: "7px 14px", borderRadius: 8,
                        background: "none", border: `1px solid ${C.border}`,
                        color: C.textMuted, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                      }}
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              )}

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
                          fontSize: 12, fontWeight: 600, transition: "all 0.12s",
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

              {/* ── Plataformas (multi-select toggle) ── */}
              <Field lbl="Plataformas">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PLATFORM_OPTIONS.map(({ label: lbl, icon }) => {
                    const isOn = activePlatforms.has(lbl);
                    return (
                      <button
                        key={lbl}
                        onClick={() => set("plataformas", togglePlatformStr(form.plataformas, lbl))}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 7,
                          padding: "7px 13px", borderRadius: 8,
                          cursor: "pointer", fontFamily: "inherit",
                          fontSize: 13, fontWeight: 500, transition: "all 0.12s",
                          background: isOn ? C.brandDim : C.surfaceAlt,
                          border: `1px solid ${isOn ? C.brandBorder : C.border}`,
                          color: isOn ? "#6B9FFF" : C.textMuted,
                        }}
                      >
                        <span style={{ fontWeight: 700, fontFamily: "monospace", fontSize: 12 }}>{icon}</span>
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* ── Idioma por Plataforma ── */}
              {platformTags.length > 0 && (
                <Field lbl="Idioma por Plataforma">
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {platformTags.map((platform) => (
                      <div key={platform} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          fontSize: 11, color: C.textMuted, fontFamily: "monospace",
                          background: C.surfaceAlt, border: `1px solid ${C.border}`,
                          borderRadius: 6, padding: "5px 10px",
                          flexShrink: 0, minWidth: 110, textAlign: "center",
                        }}>
                          {platform}
                        </span>
                        <span style={{ color: C.textDim, fontSize: 12, flexShrink: 0 }}>→</span>
                        <div style={{ flex: 1, position: "relative" }}>
                          <select
                            value={form.idiomaPorPlataforma?.[platform] ?? ""}
                            onChange={(e) => set("idiomaPorPlataforma", {
                              ...form.idiomaPorPlataforma,
                              [platform]: e.target.value,
                            })}
                            style={{
                              width: "100%", background: C.surfaceAlt,
                              border: `1px solid ${C.border}`, borderRadius: 8,
                              padding: "7px 32px 7px 11px",
                              fontSize: 13, color: C.textBright,
                              fontFamily: "inherit", cursor: "pointer",
                              appearance: "none", WebkitAppearance: "none",
                              outline: "none",
                            }}
                          >
                            <option value="">— selecione —</option>
                            {IDIOMA_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <span style={{
                            position: "absolute", right: 10, top: "50%",
                            transform: "translateY(-50%)",
                            color: C.textDim, fontSize: 9, pointerEvents: "none",
                          }}>▼</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Field>
              )}

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
                  fontSize: 13, color: C.errorText, fontFamily: "monospace",
                  lineHeight: 1.5,
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
