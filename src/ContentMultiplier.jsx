import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { C, label } from "./tokens.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const CLIENTS = [
  {
    id: "zeroledger",
    name: "ZeroLedger",
    emoji: "⛓",
    systemContext: `Cliente: ZeroLedger — privacy payments em Base L2.
Tom: técnico mas acessível, evita jargão desnecessário.
⚠ RESTRIÇÃO CRÍTICA (UK compliance): NUNCA usar as palavras "rewards", "earn", "referrals" ou "investment" em nenhuma circunstância, em nenhum idioma.
Idioma: escreva sempre em inglês (English only — no exceptions).`,
  },
  {
    id: "base-brasil",
    name: "Base Brasil",
    emoji: "🏔",
    systemContext: `Cliente: Base Brasil — ecossistema Base no Brasil.
Tom: educativo, animado e próximo do público cripto brasileiro.
Público: comunidade cripto BR, desde iniciantes até usuários avançados.
Use português BR natural, pode usar gírias do universo cripto quando apropriado.
Idioma: escreva sempre em português brasileiro.`,
  },
  {
    id: "aco-labs",
    name: "ACO Labs",
    emoji: "🤖",
    systemContext: `Cliente: ACO Labs — AI agents e automação.
Tom: inovador, direto e orientado a resultados práticos.
Foco: demonstrar capacidades reais de automação e agentes de IA, sem hype vazio.
Idioma: escreva sempre em inglês (English only — no exceptions).`,
  },
  {
    id: "aura-mode",
    name: "AURA Mode",
    emoji: "✨",
    systemContext: `Cliente: AURA Mode — IA generativa para criadores BR.
Tom: inspiracional, próximo e criativo.
Público: criadores de conteúdo brasileiros que usam (ou querem usar) IA no processo criativo.
Celebra a criatividade humana potencializada por IA.
Idioma: escreva sempre em português brasileiro.`,
  },
];

const PLATFORMS = [
  {
    id: "twitter",
    label: "X / Twitter",
    icon: "𝕏",
    hint: "280 chars / thread",
    instructions: `- X/Twitter: escreva um único tweet de até 280 caracteres. Se o conteúdo exigir mais espaço, crie uma thread numerada (1/N, 2/N...). Tom direto, conversacional e conciso. Máximo 3 hashtags relevantes.`,
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: "◎",
    hint: "caption + hashtags",
    instructions: `- Instagram: caption envolvente com abertura que prende nos primeiros 2 segundos, emojis estratégicos, call-to-action claro no final. Separe as hashtags (10-15) do texto principal com uma linha em branco.`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: "in",
    hint: "tom profissional",
    instructions: `- LinkedIn: abertura com gancho forte (primeira linha sem contexto extra), 3-4 parágrafos curtos com insight de valor, tom profissional mas humano. Termine com pergunta ou CTA. 3-5 hashtags no final.`,
  },
  {
    id: "farcaster",
    label: "Farcaster",
    icon: "⌁",
    hint: "320 chars · web3",
    instructions: `- Farcaster: cast de até 320 caracteres. Tom nativo web3 — conciso, direto, sem hashtags. Pode referenciar cultura onchain quando relevante. Sem emojis em excesso. Fala com uma audiência que já entende crypto.`,
  },
];

function buildSystemPrompt(client) {
  return `Você é um especialista em copywriting e adaptação de conteúdo para redes sociais da agência 2L Digital.

${client.systemContext}

Sua tarefa é analisar o conteúdo fornecido (arquivos, imagens ou texto) e criar versões adaptadas e prontas para publicar em cada plataforma solicitada.

Entregue apenas os textos finais, sem explicações, introduções ou meta-comentários. O output deve ser copiável e publicável diretamente.`;
}

function buildUserPrompt(selectedPlatforms, context) {
  const names = selectedPlatforms.map(id => PLATFORMS.find(p => p.id === id).label).join(", ");
  const instructions = selectedPlatforms
    .map(id => PLATFORMS.find(p => p.id === id).instructions)
    .join("\n");

  return `Analise o conteúdo acima e crie versões adaptadas para: ${names}.
${context ? `\nContexto adicional: ${context}\n` : ""}
Use exatamente o seguinte formato para cada plataforma:

## [NOME DA PLATAFORMA]
[conteúdo adaptado, pronto para publicar]

Diretrizes por plataforma:
${instructions}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileType(file) {
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "text/csv" || file.name.endsWith(".csv")) return "csv";
  if (
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel" ||
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls")
  ) return "xlsx";
  return null;
}

function fileIcon(file) {
  const t = getFileType(file);
  if (t === "pdf") return "📄";
  if (t === "image") return "🖼";
  if (t === "csv" || t === "xlsx") return "📊";
  return "📎";
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

function readXlsxAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const text = wb.SheetNames.map((name) => {
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
          return wb.SheetNames.length > 1 ? `[${name}]\n${csv}` : csv;
        }).join("\n\n");
        resolve(text);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PromptPreview({ client, selectedPlatforms, context }) {
  const userPrompt = buildUserPrompt(selectedPlatforms, context || "[contexto adicional]");
  const systemPrompt = buildSystemPrompt(client);
  const blockStyle = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
    fontSize: 12,
    fontFamily: "monospace",
  };
  const tagStyle = {
    fontSize: 10,
    color: C.textDim,
    background: C.surfaceAlt,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    padding: "2px 8px",
    display: "inline-block",
  };
  const preStyle = {
    padding: "12px 14px",
    color: C.textMuted,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    lineHeight: 1.65,
    margin: 0,
  };

  return (
    <div style={blockStyle}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
        <span style={tagStyle}>SYSTEM</span>
      </div>
      <pre style={preStyle}>{systemPrompt}</pre>

      <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <span style={tagStyle}>USUÁRIO</span>
      </div>
      <pre style={preStyle}>{`[conteúdo dos arquivos]\n\n${userPrompt}`}</pre>
    </div>
  );
}

function ResultCards({ text }) {
  const [copied, setCopied] = useState(null);

  function copy(content, id) {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  // Parse ## sections
  const sections = [];
  let current = null;
  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { title: line.replace("## ", "").trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  // Fallback if no ## found
  if (!sections.length) {
    return (
      <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px" }}>
        <pre style={{ fontSize: 14, color: C.text, whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.7, margin: 0 }}>
          {text}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {sections.map((section, i) => {
        const content = section.lines.join("\n").trim();
        const isCopied = copied === i;
        return (
          <div key={i} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
            {/* Card header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", background: C.surface, borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 3, height: 14, borderRadius: 2, background: C.brand, display: "inline-block" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textBright }}>{section.title}</span>
              </div>
              <button
                onClick={() => copy(content, i)}
                style={{
                  fontSize: 11, fontFamily: "monospace",
                  background: isCopied ? C.brandDim : "none",
                  border: `1px solid ${isCopied ? C.brandBorder : C.border}`,
                  color: isCopied ? "#6B9FFF" : C.textDim,
                  borderRadius: 6, padding: "3px 10px", cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {isCopied ? "✓ copiado" : "copiar"}
              </button>
            </div>
            {/* Card content */}
            <div style={{ padding: "16px 20px" }}>
              <pre style={{ fontSize: 14, color: C.text, whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.75, margin: 0 }}>
                {content}
              </pre>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContentMultiplier() {
  const [client,          setClient]          = useState(CLIENTS[0]);
  const [files,           setFiles]           = useState([]);
  const [context,         setContext]         = useState("");
  const [platforms,       setPlatforms]       = useState(["instagram"]);
  const [result,          setResult]          = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState(null);
  const [showPrompt,      setShowPrompt]      = useState(false);
  const [dragOver,        setDragOver]        = useState(false);
  const [contextFocused,  setContextFocused]  = useState(false);
  const [btnHover,        setBtnHover]        = useState(false);
  const fileInputRef = useRef(null);

  function addFiles(fileList) {
    const valid = Array.from(fileList).filter(f => getFileType(f) !== null);
    setFiles(prev => [...prev, ...valid].slice(0, 5));
  }

  function togglePlatform(id) {
    setPlatforms(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(p => p !== id) : prev
        : [...prev, id]
    );
  }

  async function handleGenerate() {
    const hasContent = files.length > 0 || context.trim().length > 0;
    if (!hasContent || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Build content array: files first, then text prompt
      const content = [];

      for (const file of files) {
        const ft = getFileType(file);
        if (ft === "pdf") {
          const data = await readAsBase64(file);
          content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
        } else if (ft === "image") {
          const data = await readAsBase64(file);
          content.push({ type: "image", source: { type: "base64", media_type: file.type, data } });
        } else if (ft === "csv") {
          const text = await readAsText(file);
          content.push({ type: "text", text: `Dados tabulares (${file.name}):\n\n${text}` });
        } else if (ft === "xlsx") {
          const text = await readXlsxAsText(file);
          content.push({ type: "text", text: `Dados tabulares (${file.name}):\n\n${text}` });
        }
      }

      content.push({ type: "text", text: buildUserPrompt(platforms, context) });

      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2500,
          system: buildSystemPrompt(client),
          messages: [{ role: "user", content }],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status}`);
      }

      const data = await res.json();
      setResult(data?.content?.[0]?.text ?? "Resposta vazia.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const canGenerate = !loading && (files.length > 0 || context.trim().length > 0);

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "48px 24px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: C.textBright, letterSpacing: "-0.02em", lineHeight: 1 }}>
          Content Multiplier
        </h1>
        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 8 }}>
          Envie arquivos ou cole um contexto — gere versões prontas para cada plataforma.
        </p>
      </div>

      {/* ── Client selector ── */}
      <div style={{ marginBottom: 28 }}>
        <label style={{ ...label, color: C.textDim }}>Cliente</label>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
          {CLIENTS.map((c) => {
            const active = client.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => { setClient(c); setResult(null); setError(null); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                  padding: "7px 12px", borderRadius: 8, cursor: "pointer",
                  fontSize: 13, fontWeight: 500, fontFamily: "inherit",
                  transition: "all 0.15s",
                  ...(active ? {
                    background: C.brand,
                    border: `1px solid ${C.brand}`,
                    color: "#fff",
                    boxShadow: "0 4px 16px rgba(0,82,255,0.35)",
                  } : {
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    color: C.textMuted,
                  }),
                }}
              >
                <span style={{ fontSize: 14 }}>{c.emoji}</span>
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── File upload ── */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ ...label, color: C.textDim }}>
          Arquivos{" "}
          <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
            · PDF, PNG, JPG, WEBP, CSV, XLSX · máx. 5
          </span>
        </label>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `1.5px dashed ${dragOver ? C.brand : C.border}`,
            borderRadius: 12, padding: "32px 20px",
            textAlign: "center", cursor: "pointer",
            background: dragOver ? C.brandDim : C.surfaceAlt,
            transition: "all 0.15s",
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.7 }}>📎</div>
          <p style={{ fontSize: 13, color: C.textMuted }}>
            Clique para selecionar ou arraste aqui
          </p>
          <p style={{ fontSize: 11, color: C.textDim, marginTop: 4, fontFamily: "monospace" }}>
            PDF · PNG · JPG · WEBP · CSV · XLSX
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,image/jpeg,image/png,image/webp,.csv,.xlsx,.xls"
            style={{ display: "none" }}
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {files.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 12px", borderRadius: 8,
                background: C.surface, border: `1px solid ${C.border}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{fileIcon(f)}</span>
                  <span style={{ fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.name}
                  </span>
                  <span style={{ fontSize: 11, color: C.textDim, flexShrink: 0, fontFamily: "monospace" }}>
                    {formatBytes(f.size)}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter((_, idx) => idx !== i)); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: C.textDim, fontSize: 18, lineHeight: 1, padding: "0 4px",
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Context ── */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ ...label, color: C.textDim }}>
          Contexto adicional{" "}
          <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>· opcional</span>
        </label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          onFocus={() => setContextFocused(true)}
          onBlur={() => setContextFocused(false)}
          placeholder="Tom de voz, CTA desejado, público-alvo, restrições..."
          rows={3}
          style={{
            width: "100%", display: "block",
            background: C.surfaceAlt,
            border: `1px solid ${contextFocused ? C.brand : C.border}`,
            borderRadius: 10, padding: "12px 14px",
            fontSize: 14, lineHeight: 1.6,
            color: C.textBright, resize: "none", fontFamily: "inherit",
            transition: "border-color 0.15s",
            boxShadow: contextFocused ? "0 0 0 3px rgba(0,82,255,0.1)" : "none",
          }}
        />
      </div>

      {/* ── Platform selector ── */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ ...label, color: C.textDim }}>Plataformas</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PLATFORMS.map((p) => {
            const active = platforms.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 16px", borderRadius: 8,
                  cursor: "pointer", fontFamily: "inherit",
                  fontSize: 13, fontWeight: 500,
                  transition: "all 0.15s",
                  ...(active ? {
                    background: C.brandDim,
                    border: `1px solid ${C.brandBorder}`,
                    color: "#6B9FFF",
                  } : {
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    color: C.textMuted,
                  }),
                }}
              >
                <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{p.icon}</span>
                <span>{p.label}</span>
                <span style={{
                  fontSize: 10, fontFamily: "monospace",
                  color: active ? "rgba(107,159,255,0.7)" : C.textDim,
                }}>
                  {p.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Ver Prompt ── */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            fontSize: 11, color: C.textDim, fontFamily: "monospace",
            letterSpacing: "0.12em", padding: 0,
          }}
        >
          <span style={{
            display: "inline-block",
            transition: "transform 0.2s",
            transform: showPrompt ? "rotate(90deg)" : "none",
            fontSize: 8,
          }}>
            ▶
          </span>
          VER PROMPT
        </button>
        {showPrompt && (
          <PromptPreview client={client} selectedPlatforms={platforms} context={context} />
        )}
      </div>

      {/* ── Generate button ── */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
        style={{
          width: "100%", padding: "14px 24px",
          borderRadius: 12, border: "none", cursor: canGenerate ? "pointer" : "not-allowed",
          fontSize: 15, fontWeight: 600, fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "all 0.15s",
          ...(canGenerate ? {
            background: btnHover ? C.brandHover : C.brand,
            color: "#fff",
            boxShadow: btnHover ? "0 6px 28px rgba(0,82,255,0.45)" : "0 4px 20px rgba(0,82,255,0.3)",
          } : {
            background: C.surface, color: C.textDim,
            border: `1px solid ${C.border}`, boxShadow: "none",
          }),
        }}
      >
        {loading ? (
          <>
            <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            Multiplicando conteúdo...
          </>
        ) : (
          <>
            Multiplicar Conteúdo
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"/>
              <polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/>
              <line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </>
        )}
      </button>

      {/* ── Error ── */}
      {error && (
        <div style={{
          marginTop: 16, padding: "14px 16px", borderRadius: 10,
          background: C.errorBg, border: `1px solid ${C.errorBorder}`,
          color: C.errorText, fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* ── Result ── */}
      {result && (
        <div className="slide-up" style={{ marginTop: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.brand, display: "inline-block" }} />
              <span style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.18em", color: C.brand, textTransform: "uppercase" }}>
                Resultado
              </span>
            </div>
            <button
              onClick={() => setResult(null)}
              style={{ fontSize: 12, color: C.textDim, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              limpar
            </button>
          </div>
          <ResultCards text={result} />
        </div>
      )}

    </div>
  );
}
