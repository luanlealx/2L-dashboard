import { useState, useEffect, useRef } from "react";
import { CLIENT_PROFILES, PLATFORM_METRICS, MONTHS } from "../../data/clients.js";
import { callClaude } from "../../lib/claude.js";
import { processFile, fmtSize, ACCEPTED_EXTENSIONS, MAX_FILES } from "../../lib/utils.js";
import { monoStyle, labelStyle, cardStyle, chipStyle, smallBtnStyle, primaryBtnStyle, inputStyle, textareaStyle, selectStyle, LoadingDot } from "../../components/ui/index.jsx";

// Safe extraction of rules section from system prompt
const extractRules = (systemPrompt) => {
  const rulesIdx = systemPrompt.indexOf("REGRAS");
  if (rulesIdx === -1) return "Seguir tom de voz padrão do cliente.";
  const formatosIdx = systemPrompt.indexOf("FORMATOS", rulesIdx);
  const exemplosIdx = systemPrompt.indexOf("EXEMPLOS", rulesIdx);
  const candidates = [formatosIdx, exemplosIdx].filter(i => i > rulesIdx);
  const endIdx = candidates.length > 0 ? Math.min(...candidates) : systemPrompt.length;
  return systemPrompt.substring(rulesIdx, endIdx).trim();
};

export default function ReportGenerator({ activeClient }) {
  const [clientId, setClientId] = useState(activeClient || null);
  const [month, setMonth] = useState(new Date().getMonth() > 0 ? new Date().getMonth() - 1 : 11);
  const [year, setYear] = useState(new Date().getMonth() > 0 ? new Date().getFullYear() : new Date().getFullYear() - 1);
  // platformData = { x: { followers: "14200", ... }, instagram: { ... }, general: { ... } }
  const [platformData, setPlatformData] = useState({});
  const [autoFilled, setAutoFilled] = useState({}); // "x.followers": "high"
  const [detectedPlatforms, setDetectedPlatforms] = useState([]); // ["x", "instagram", ...]
  const [activePlatform, setActivePlatform] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState("");
  const [filePlatformMap, setFilePlatformMap] = useState({}); // fileId → platform
  const [notes, setNotes] = useState("");
  const [report, setReport] = useState("");
  const [generating, setGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [genPhase, setGenPhase] = useState("");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(activeClient ? "upload" : "select");
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState([]);
  const [viewingReport, setViewingReport] = useState(null);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [copiedH, setCopiedH] = useState(null);
  const fileInputRef = useRef(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("agency_report_history");
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  const saveHistory = (entries) => {
    setHistory(entries);
    try { localStorage.setItem("agency_report_history", JSON.stringify(entries)); } catch {}
  };

  const saveToHistory = (reportText) => {
    const entry = {
      id: Date.now(),
      clientId,
      month,
      year,
      platforms: detectedPlatforms.filter(p => p !== "general"),
      platformData: { ...platformData },
      report: reportText,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      fileCount: files.length,
    };
    const updated = [entry, ...history].slice(0, 100); // max 100 reports
    saveHistory(updated);
  };

  const deleteHistoryEntry = (id) => {
    const updated = history.filter(h => h.id !== id);
    saveHistory(updated);
    if (viewingReport?.id === id) setViewingReport(null);
  };

  useEffect(() => {
    if (activeClient) {
      setClientId(activeClient);
      setStep(prev => prev === "report" ? "report" : prev === "input" ? "input" : "upload");
    }
  }, [activeClient]);

  const client = CLIENT_PROFILES.find(c => c.id === clientId);
  const imageFiles = files.filter(f => f.kind === "image");
  const sheetFiles = files.filter(f => f.kind === "spreadsheet");

  // Count filled metrics across all platforms
  const filledCount = detectedPlatforms.reduce((sum, pId) => {
    const pm = PLATFORM_METRICS[pId];
    if (!pm || !platformData[pId]) return sum;
    return sum + pm.metrics.filter(m => platformData[pId][m.id]).length;
  }, 0);
  const totalMetrics = detectedPlatforms.reduce((sum, pId) => {
    const pm = PLATFORM_METRICS[pId];
    return sum + (pm ? pm.metrics.length : 0);
  }, 0);

  // File handling
  const handleFiles = async (fileList) => {
    setFileError("");
    const incoming = Array.from(fileList);
    if (files.length + incoming.length > MAX_FILES) {
      setFileError(`Máximo ${MAX_FILES} arquivos. Você tem ${files.length}, tentou adicionar ${incoming.length}.`);
      return;
    }
    const results = [];
    for (const f of incoming) {
      try { results.push(await processFile(f)); } catch (e) { setFileError(e.message); }
    }
    if (results.length) setFiles(prev => [...prev, ...results]);
  };
  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setFilePlatformMap(prev => { const n = { ...prev }; delete n[id]; return n; });
  };
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);

  // ─── EXTRACT: Claude identifies platforms + extracts all metrics ───
  const extractMetrics = async () => {
    if (!client) return;
    setExtracting(true);

    // Build the schema showing ALL platform metrics
    const allPlatformsSchema = Object.entries(PLATFORM_METRICS)
      .filter(([k]) => k !== "general")
      .map(([key, p]) => {
        const fields = p.metrics.map(m => `    "${m.id}": "${m.label}" (${m.type === "number" ? "número" : "texto"})`).join("\n");
        return `  "${key}": { // ${p.emoji} ${p.name}\n${fields}\n  }`;
      }).join(",\n");

    const generalSchema = PLATFORM_METRICS.general.metrics
      .map(m => `    "${m.id}": "${m.label}" (${m.type === "textarea" ? "texto livre" : "texto"})`)
      .join("\n");

    const sheetCtx = sheetFiles.length > 0
      ? "\n\nDADOS DAS PLANILHAS:\n" + sheetFiles.map(f => `[${f.name}] (${f.totalRows} linhas)\n${f.csvText}`).join("\n") : "";

    const extractPrompt = `Analise TODOS os arquivos enviados. Identifique de qual REDE SOCIAL cada print/planilha pertence e extraia as métricas.

CLIENTE: ${client.name}
PLATAFORMAS DO CLIENTE: ${client.platforms.join(", ")}
MÊS: ${MONTHS[month]} ${year}

PARA CADA ARQUIVO: identifique a plataforma pelo visual do dashboard, nome de colunas, ou tipo de dados.

SCHEMA DE MÉTRICAS POR PLATAFORMA:
{
${allPlatformsSchema},
  "general": {
${generalSchema}
  }
}
${sheetCtx}
${imageFiles.length > 0 ? `\n📸 ${imageFiles.length} SCREENSHOT(S) — Para cada imagem:
1. IDENTIFIQUE a plataforma (Twitter/X, Instagram, TikTok, YouTube, LinkedIn, Discord, ou general)
2. LEIA todos os números visíveis
3. MAPEIE para as métricas do schema acima` : ""}

RESPONDA APENAS JSON válido:
{
  "file_platforms": {
    "nome_arquivo.png": "x",
    "analytics.csv": "instagram"
  },
  "platforms": {
    "x": {
      "followers": "14200",
      "impressions": "523000",
      "engagement_rate": "3.5"
    },
    "instagram": {
      "followers": "8500",
      "reach": "125000"
    },
    "general": {
      "highlights": "resumo dos destaques"
    }
  },
  "confidence": {
    "x.followers": "high",
    "x.impressions": "medium",
    "instagram.followers": "high"
  },
  "observations": "insights extras, discrepâncias, coisas notáveis"
}

REGRAS:
- Use EXATAMENTE os platform keys: x, instagram, tiktok, youtube, linkedin, discord, general
- Use EXATAMENTE os metric_id do schema acima
- Numéricos: apenas número (ex: "14200", "3.5", "523000")
- Se não encontrar dado, OMITA — não invente
- Se um arquivo não é de nenhuma rede específica, classifique como "general"
- confidence: high (número claro), medium (inferido), low (incerto)
- Consolide dados de múltiplos arquivos da mesma rede`;

    try {
      const contentBlocks = [{ type: "text", text: extractPrompt }];
      for (const img of imageFiles) {
        contentBlocks.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64 } });
      }
      const raw = await callClaude([{ role: "user", content: contentBlocks }], 2500, 120000);
      const jsonStr = raw.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(jsonStr);

      // Apply file-to-platform mapping
      if (parsed.file_platforms) {
        const newMap = {};
        for (const [fname, plat] of Object.entries(parsed.file_platforms)) {
          const matchFile = files.find(f => f.name === fname || f.name.includes(fname.split(".")[0]));
          if (matchFile) newMap[matchFile.id] = plat;
        }
        setFilePlatformMap(newMap);
      }

      // Apply platform data
      if (parsed.platforms) {
        const newData = {};
        const detected = [];
        for (const [platKey, metrics] of Object.entries(parsed.platforms)) {
          if (PLATFORM_METRICS[platKey] && Object.keys(metrics).length > 0) {
            newData[platKey] = {};
            detected.push(platKey);
            for (const [mKey, mVal] of Object.entries(metrics)) {
              if (mVal && PLATFORM_METRICS[platKey].metrics.some(m => m.id === mKey)) {
                newData[platKey][mKey] = String(mVal);
              }
            }
          }
        }
        // Always include general
        if (!detected.includes("general")) {
          detected.push("general");
          newData.general = newData.general || {};
        }
        setPlatformData(newData);
        setDetectedPlatforms(detected);
        setActivePlatform(detected.find(p => p !== "general") || detected[0]);
      }

      // Apply confidence
      if (parsed.confidence) {
        setAutoFilled(parsed.confidence);
      }

      // Apply observations
      if (parsed.observations?.trim()) {
        setNotes(prev => prev ? prev + "\n\n🤖 IA: " + parsed.observations : "🤖 IA: " + parsed.observations);
      }
    } catch (e) {
      console.error("Extract error:", e);
      setFileError("Não consegui extrair métricas automaticamente. Use o modo manual.");
      // Fallback: init with client platforms
      const fallbackPlatforms = [];
      const fallbackData = {};
      for (const p of client.platforms) {
        const key = p.toLowerCase().replace("twitter/", "").replace(" ", "");
        if (PLATFORM_METRICS[key]) { fallbackPlatforms.push(key); fallbackData[key] = {}; }
      }
      if (!fallbackPlatforms.includes("general")) { fallbackPlatforms.push("general"); fallbackData.general = {}; }
      setDetectedPlatforms(fallbackPlatforms);
      setPlatformData(fallbackData);
      setActivePlatform(fallbackPlatforms[0]);
    }
    setExtracting(false);
    setStep("input");
  };

  // Manual mode: init platforms from client profile
  const initManual = () => {
    const plats = [];
    const data = {};
    for (const p of (client?.platforms || [])) {
      const key = p.toLowerCase().replace("twitter/", "").replace(" ", "");
      if (PLATFORM_METRICS[key]) { plats.push(key); data[key] = {}; }
    }
    if (!plats.includes("general")) { plats.push("general"); data.general = {}; }
    setDetectedPlatforms(plats);
    setPlatformData(data);
    setActivePlatform(plats[0]);
    setStep("input");
  };

  // Add a platform manually
  const addPlatform = (key) => {
    if (!detectedPlatforms.includes(key)) {
      setDetectedPlatforms(prev => [...prev, key]);
      setPlatformData(prev => ({ ...prev, [key]: {} }));
      setActivePlatform(key);
    }
  };

  // Remove a platform
  const removePlatform = (key) => {
    if (key === "general") return;
    setDetectedPlatforms(prev => prev.filter(p => p !== key));
    setPlatformData(prev => { const n = { ...prev }; delete n[key]; return n; });
    if (activePlatform === key) setActivePlatform(detectedPlatforms.find(p => p !== key) || "general");
  };

  // Update a single metric
  const updateMetric = (platKey, metricId, value) => {
    setPlatformData(prev => ({
      ...prev,
      [platKey]: { ...prev[platKey], [metricId]: value },
    }));
    // Remove autofill badge when user edits
    const afKey = `${platKey}.${metricId}`;
    if (autoFilled[afKey]) {
      setAutoFilled(prev => { const n = { ...prev }; delete n[afKey]; return n; });
    }
  };

  // ─── Generate report ───
  const generate = async () => {
    setGenerating(true);
    setGenPhase(files.length > 0 ? "analyzing" : "writing");

    // Build metrics text organized by platform
    const metricsText = detectedPlatforms.map(pId => {
      const pm = PLATFORM_METRICS[pId];
      if (!pm) return "";
      const data = platformData[pId] || {};
      const lines = pm.metrics.map(m => {
        const val = data[m.id];
        const conf = autoFilled[`${pId}.${m.id}`];
        return `  ${m.label}: ${val || "Não informado"}${conf ? ` [${conf}]` : ""}`;
      }).join("\n");
      return `\n${pm.emoji} ${pm.name}:\n${lines}`;
    }).join("\n");

    const hasCompliance = client.systemPrompt.includes("COMPLIANCE") || client.systemPrompt.includes("INVIOLÁVEIS");
    const sheetContext = sheetFiles.length > 0
      ? "\n\n📊 PLANILHAS:\n" + sheetFiles.map(f => `[${f.name}] (${f.totalRows} linhas${f.truncated ? ", top 200" : ""})\n${f.csvText}`).join("\n") : "";
    const notesContext = notes.trim()
      ? `\n\n📝 OBSERVAÇÕES DO CEO:\n${notes.trim().substring(0, 2000)}\nIncorpore — são insights operacionais.\n` : "";

    const platformNames = detectedPlatforms.filter(p => p !== "general").map(p => PLATFORM_METRICS[p]?.name).join(", ");

    const promptText = `Você é o analista sênior da Agência 2L. Gere relatório mensal PROFISSIONAL.

CLIENTE: ${client.emoji} ${client.name}
CONTRATO: ${client.revenue} — ${client.role}
PLATAFORMAS ANALISADAS: ${platformNames}
MÊS: ${MONTHS[month]} ${year}
AUDIÊNCIA: ${client.audience.demographics} (${client.audience.country})
IDIOMA CONTEÚDO: ${client.audience.language} | IDIOMA RELATÓRIO: PT-BR

MÉTRICAS POR PLATAFORMA (revisadas pelo CEO):
${metricsText}
${sheetContext}${notesContext}
${imageFiles.length > 0 ? `\n🖼️ ${imageFiles.length} SCREENSHOT(S) — Cruze dados visuais com métricas reportadas.\n` : ""}
${hasCompliance ? `⚠️ COMPLIANCE:\n${extractRules(client.systemPrompt)}\n` : ""}
ESTRUTURA:

## 📊 Resumo Executivo
Overview cross-platform: visão holística da presença digital no mês. 3-5 frases.

${detectedPlatforms.filter(p => p !== "general").map(pId => {
  const pm = PLATFORM_METRICS[pId];
  return `## ${pm.emoji} ${pm.name}\nAnálise de todas as métricas dessa plataforma. Crescimento, engagement, destaques e problemas.`;
}).join("\n\n")}

## 🔥 Destaques Cross-Platform
O que funcionou melhor em TODAS as redes. Padrões comuns. APENAS dados reais.

## ⚠️ Análise Crítica
Problemas, gaps, oportunidades perdidas. Compare performance entre plataformas. Sem suavizar.

## 🎯 Plano para ${MONTHS[(month + 1) % 12]}
5-8 ações CONCRETAS organizadas por plataforma: o que + por que (dado) + resultado esperado.

## 📝 Observações
Riscos, dependências, recomendações cross-platform.

REGRAS: PT-BR profissional | APENAS dados reais | NÃO invente números/benchmarks | "Não informado" → pendente | Análise honesta | Discrepâncias: APONTAR | Compare plataformas entre si quando relevante`;

    try {
      const contentBlocks = [{ type: "text", text: promptText }];
      for (const img of imageFiles) {
        contentBlocks.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64 } });
      }
      setGenPhase("writing");
      const text = await callClaude([{ role: "user", content: contentBlocks }], 4000, imageFiles.length > 0 ? 120000 : 90000);
      setReport(text);
      saveToHistory(text);
      setStep("report");
    } catch (e) {
      setReport("Erro: " + e.message);
      setStep("report");
    }
    setGenerating(false);
    setGenPhase("");
  };

  // ─── Shared: file upload zone ───
  const FileZone = () => (
    <div>
      <div onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? (client?.color || "#0052FF") : "#1a1a2e"}`,
          borderRadius: 14, padding: files.length > 0 ? "16px" : "36px 16px",
          textAlign: "center", cursor: "pointer",
          background: dragOver ? `${client?.color || "#0052FF"}08` : "rgba(255,255,255,0.01)",
          transition: "all 0.2s",
        }}>
        <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_EXTENSIONS}
          style={{ display: "none" }}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
        {files.length === 0 ? (
          <div>
            <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.5 }}>📸 📊 🎵 ▶️ 💼</div>
            <div style={{ ...monoStyle, fontSize: 13, color: "#888" }}>Jogue tudo aqui — prints de TODAS as redes</div>
            <div style={{ ...monoStyle, fontSize: 11, color: "#555", marginTop: 4 }}>X, Instagram, TikTok, YouTube, LinkedIn — a IA identifica cada um</div>
            <div style={{ ...monoStyle, fontSize: 10, color: "#333", marginTop: 10 }}>
              PNG, JPG, CSV, XLSX · Até {MAX_FILES} arquivos · 10MB cada
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-start" }}>
              {files.map(f => {
                const plat = filePlatformMap[f.id];
                const pm = plat ? PLATFORM_METRICS[plat] : null;
                return (
                  <div key={f.id} style={{
                    position: "relative", background: "rgba(0,0,0,0.3)",
                    border: `1px solid ${pm ? pm.color + "33" : "#1a1a2e"}`,
                    borderRadius: 10, overflow: "hidden", width: f.kind === "image" ? 120 : "100%",
                  }} onClick={(e) => e.stopPropagation()}>
                    {f.kind === "image" ? (
                      <div>
                        <img src={f.thumbnail} alt={f.name} style={{ width: 120, height: 85, objectFit: "cover", display: "block" }} />
                        <div style={{ padding: "4px 6px", display: "flex", alignItems: "center", gap: 4 }}>
                          {pm && <span style={{ fontSize: 10 }}>{pm.emoji}</span>}
                          <div style={{ ...monoStyle, fontSize: 9, color: pm ? pm.color : "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                            {pm ? pm.name : f.name}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 18 }}>{pm ? pm.emoji : "📊"}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ ...monoStyle, fontSize: 11, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                            <div style={{ ...monoStyle, fontSize: 10, color: "#555" }}>{f.totalRows} linhas · {f.columns.length} col · {fmtSize(f.size)}{pm ? ` · ${pm.name}` : ""}</div>
                          </div>
                        </div>
                        {f.preview && f.preview.length > 0 && (
                          <div style={{ marginTop: 8, overflowX: "auto" }}>
                            <table style={{ borderCollapse: "collapse", width: "100%", ...monoStyle, fontSize: 9 }}>
                              <thead><tr>{f.columns.slice(0,6).map((c,i) => (
                                <th key={i} style={{ padding: "3px 6px", borderBottom: "1px solid #1a1a2e", color: "#666", textAlign: "left", whiteSpace: "nowrap" }}>{c.length > 15 ? c.slice(0,12)+"..." : c}</th>
                              ))}</tr></thead>
                              <tbody>{f.preview.slice(0,3).map((row,ri) => (
                                <tr key={ri}>{f.columns.slice(0,6).map((c,ci) => (
                                  <td key={ci} style={{ padding: "2px 6px", borderBottom: "1px solid #0f0f18", color: "#888", whiteSpace: "nowrap", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis" }}>{String(row[c] ?? "").slice(0,18)}</td>
                                ))}</tr>
                              ))}</tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                      style={{ position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", width: 20, height: 20, color: "#888", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                );
              })}
            </div>
            <div style={{ ...monoStyle, fontSize: 10, color: "#333", marginTop: 10 }}>+ Arraste mais arquivos · {files.length}/{MAX_FILES}</div>
          </div>
        )}
      </div>
      {fileError && <div style={{ ...monoStyle, fontSize: 11, color: "#EF4444", marginTop: 6 }}>{fileError}</div>}
    </div>
  );

  // Step indicator
  const StepBar = ({ active }) => (
    <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
      {["Upload", "Métricas", "Relatório"].map((s, i) => (
        <div key={s} style={{ flex: 1, textAlign: "center" }}>
          <div style={{ height: 3, background: i <= active ? (client?.color || "#0052FF") : "#1a1a2e", borderRadius: 2, marginBottom: 6, transition: "background 0.3s" }} />
          <span style={{ ...monoStyle, fontSize: 10, color: i <= active ? (client?.color || "#0052FF") : "#333" }}>{i+1}. {s}</span>
        </div>
      ))}
    </div>
  );

  // Client header
  const ClientBar = ({ extra }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "14px 18px", background: (client?.color || "#0052FF") + "08", border: `1px solid ${client?.color || "#0052FF"}22`, borderRadius: 12 }}>
      <span style={{ fontSize: 24 }}>{client?.emoji}</span>
      <div>
        <div style={{ fontWeight: 600, color: client?.color }}>{client?.name}</div>
        <div style={{ ...monoStyle, fontSize: 11, color: "#555" }}>{MONTHS[month]} {year}</div>
      </div>
      {extra && <div style={{ marginLeft: "auto" }}>{extra}</div>}
    </div>
  );

  // Confidence badge
  const ConfBadge = ({ conf }) => {
    if (!conf) return null;
    const c = conf === "high" ? "#10B981" : conf === "medium" ? "#EAB308" : "#EF4444";
    const bg = conf === "high" ? "rgba(16,185,129,0.1)" : conf === "medium" ? "rgba(234,179,8,0.1)" : "rgba(239,68,68,0.1)";
    const label = conf === "high" ? "alta" : conf === "medium" ? "média" : "baixa";
    return <span style={{ ...monoStyle, fontSize: 9, padding: "1px 6px", borderRadius: 4, background: bg, color: c, border: `1px solid ${c}22` }}>🤖 {label}</span>;
  };

  // ═══════════════ STEP: SELECT CLIENT ═══════════════
  if (step === "select") return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={selectStyle}>
          {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={selectStyle}>
          {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div style={labelStyle}>SELECIONE O CLIENTE</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {CLIENT_PROFILES.filter(c => c.reportMetrics).map(c => {
          const clientHistory = history.filter(h => h.clientId === c.id);
          return (
          <button key={c.id} onClick={() => { setClientId(c.id); setFiles([]); setNotes(""); setPlatformData({}); setAutoFilled({}); setDetectedPlatforms([]); setStep("upload"); }}
            style={{ ...cardStyle, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22 }}>{c.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
                <div style={{ ...monoStyle, fontSize: 11, color: "#444" }}>{c.platforms.join(" · ")} · {c.revenue}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {clientHistory.length > 0 && (
                <span onClick={(e) => { e.stopPropagation(); setClientId(c.id); setHistoryFilter(c.id); setStep("history"); }}
                  style={{ ...monoStyle, fontSize: 10, color: "#555", background: "rgba(255,255,255,0.04)", padding: "3px 8px", borderRadius: 6, cursor: "pointer" }}
                  title="Ver histórico">
                  📚 {clientHistory.length}
                </span>
              )}
              <span style={{ color: "#333" }}>→</span>
            </div>
          </button>
          );
        })}
      </div>
      {history.length > 0 && (
        <button onClick={() => { setHistoryFilter("all"); setStep("history"); }}
          style={{ ...smallBtnStyle, marginTop: 16, width: "100%", textAlign: "center", padding: "10px" }}>
          📚 Ver todos os relatórios ({history.length})
        </button>
      )}
    </div>
  );

  // ═══════════════ STEP: UPLOAD ═══════════════
  if (step === "upload" && client) return (
    <div>
      <ClientBar extra={!activeClient && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ ...selectStyle, fontSize: 11, padding: "4px 8px" }}>
            {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ ...selectStyle, fontSize: 11, padding: "4px 8px" }}>
            {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )} />
      <StepBar active={0} />

      <div style={labelStyle}>📎 JOGUE TUDO AQUI</div>
      <div style={{ ...monoStyle, fontSize: 10, color: "#555", marginBottom: 12 }}>
        Screenshots e planilhas de TODAS as redes de uma vez — a IA identifica cada plataforma automaticamente.
      </div>
      <FileZone />

      <div style={{ marginTop: 24 }}>
        <div style={labelStyle}>📝 OBSERVAÇÕES (opcional)</div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Contexto: destaques, problemas, campanhas especiais, foco do mês..."
          rows={3} style={{ ...textareaStyle, minHeight: 70 }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
        {!activeClient ? <button onClick={() => setStep("select")} style={smallBtnStyle}>← Voltar</button> : <div />}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={initManual} style={smallBtnStyle}>Preencher manual →</button>
          {files.length > 0 && (
            <button onClick={extractMetrics} disabled={extracting}
              style={primaryBtnStyle(extracting)}>
              {extracting
                ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                    Identificando redes + métricas...
                  </span>
                : `🤖 Analisar ${files.length} arquivo${files.length > 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ═══════════════ STEP: INPUT (multi-platform tabs) ═══════════════
  if (step === "input" && client) {
    const ap = activePlatform || detectedPlatforms[0] || "general";
    const currentPlat = PLATFORM_METRICS[ap];
    const currentData = platformData[ap] || {};

    // Available platforms to add
    const availableToAdd = Object.keys(PLATFORM_METRICS).filter(k => !detectedPlatforms.includes(k) && k !== "general");

    return (
      <div>
        <ClientBar extra={<span style={{ ...monoStyle, fontSize: 11, color: "#555" }}>{filledCount}/{totalMetrics} · {files.length} 📎</span>} />
        <StepBar active={1} />

        {/* Auto-fill banner */}
        {Object.keys(autoFilled).length > 0 && (
          <div style={{ padding: "10px 14px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 10, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>🤖</span>
            <div>
              <div style={{ ...monoStyle, fontSize: 11, color: "#10B981", fontWeight: 600 }}>
                {Object.keys(autoFilled).length} campo{Object.keys(autoFilled).length > 1 ? "s" : ""} · {detectedPlatforms.filter(p => p !== "general").length} rede{detectedPlatforms.filter(p => p !== "general").length > 1 ? "s" : ""} detectada{detectedPlatforms.filter(p => p !== "general").length > 1 ? "s" : ""}
              </div>
              <div style={{ ...monoStyle, fontSize: 10, color: "#555" }}>Revise por aba. Campos com 🤖 foram auto-preenchidos.</div>
            </div>
          </div>
        )}

        {/* Platform tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 6, overflowX: "auto", paddingBottom: 4 }}>
          {detectedPlatforms.map(pId => {
            const pm = PLATFORM_METRICS[pId];
            if (!pm) return null;
            const isActive = ap === pId;
            const filledInPlat = pm.metrics.filter(m => platformData[pId]?.[m.id]).length;
            return (
              <button key={pId} onClick={() => setActivePlatform(pId)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                  background: isActive ? pm.color + "15" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isActive ? pm.color + "44" : "#1a1a2e"}`,
                  borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
                  ...monoStyle, fontSize: 12, color: isActive ? pm.color : "#555",
                }}>
                <span>{pm.emoji}</span>
                {pm.name}
                {filledInPlat > 0 && <span style={{ fontSize: 9, opacity: 0.6 }}>{filledInPlat}/{pm.metrics.length}</span>}
              </button>
            );
          })}
          {/* Add platform button */}
          {availableToAdd.length > 0 && (
            <select
              value=""
              onChange={(e) => { if (e.target.value) addPlatform(e.target.value); }}
              style={{ ...selectStyle, fontSize: 11, padding: "6px 10px", minWidth: 36, color: "#333", background: "transparent", border: "1px dashed #1a1a2e" }}>
              <option value="">+</option>
              {availableToAdd.map(k => (
                <option key={k} value={k}>{PLATFORM_METRICS[k].emoji} {PLATFORM_METRICS[k].name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Remove platform (not general) */}
        {ap !== "general" && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button onClick={() => removePlatform(ap)}
              style={{ ...monoStyle, fontSize: 10, color: "#EF4444", background: "none", border: "none", cursor: "pointer", opacity: 0.5 }}>
              remover {currentPlat?.name}
            </button>
          </div>
        )}

        {/* Progress for current platform */}
        {currentPlat && (
          <div style={{ height: 3, background: "#111", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
            <div style={{
              height: "100%", background: currentPlat.color,
              width: `${(currentPlat.metrics.filter(m => currentData[m.id]).length / currentPlat.metrics.length) * 100}%`,
              transition: "width 0.3s", borderRadius: 2,
            }} />
          </div>
        )}

        {/* Metrics for active platform */}
        {currentPlat && currentPlat.metrics.map(m => {
          const val = currentData[m.id] || "";
          const confKey = `${ap}.${m.id}`;
          const conf = autoFilled[confKey];
          const borderCol = conf ? (conf === "high" ? "rgba(16,185,129,0.25)" : conf === "medium" ? "rgba(234,179,8,0.25)" : "rgba(239,68,68,0.25)") : "#1a1a2e";
          return (
            <div key={m.id} style={{ marginBottom: 12 }}>
              <label style={{ ...monoStyle, fontSize: 11, color: "#555", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                {m.label}
                <ConfBadge conf={conf} />
              </label>
              {m.type === "textarea"
                ? <textarea value={val} onChange={e => updateMetric(ap, m.id, e.target.value)} rows={2}
                    style={{ ...textareaStyle, minHeight: 60, borderColor: borderCol }} />
                : m.type === "number"
                ? <input type="number" value={val} onChange={e => updateMetric(ap, m.id, e.target.value)}
                    style={{ ...inputStyle, borderColor: borderCol }} />
                : <input value={val} onChange={e => updateMetric(ap, m.id, e.target.value)}
                    style={{ ...inputStyle, borderColor: borderCol }} />
              }
            </div>
          );
        })}

        {/* Files + notes summary */}
        {files.length > 0 && (
          <div style={{ ...cardStyle, padding: 10, marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ ...monoStyle, fontSize: 10, color: "#555" }}>📎 {files.length} arquivo{files.length > 1 ? "s" : ""}</span>
            {Object.entries(
              files.reduce((acc, f) => {
                const p = filePlatformMap[f.id] || "?";
                acc[p] = (acc[p] || 0) + 1;
                return acc;
              }, {})
            ).map(([p, count]) => {
              const pm = PLATFORM_METRICS[p];
              return <span key={p} style={{ ...monoStyle, fontSize: 9, color: pm?.color || "#555", background: (pm?.color || "#555") + "11", padding: "2px 6px", borderRadius: 4 }}>
                {pm?.emoji || "?"} {count}
              </span>;
            })}
            <button onClick={() => setStep("upload")} style={{ ...monoStyle, fontSize: 10, color: client.color, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", marginLeft: "auto" }}>editar</button>
          </div>
        )}

        {notes && (
          <div style={{ ...cardStyle, padding: 10, marginTop: 6, display: "flex", gap: 8 }}>
            <span>📝</span>
            <div style={{ ...monoStyle, fontSize: 10, color: "#888", flex: 1, overflow: "hidden", maxHeight: 40 }}>{notes.slice(0, 120)}{notes.length > 120 ? "..." : ""}</div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
          <button onClick={() => setStep("upload")} style={smallBtnStyle}>← Upload</button>
          <button onClick={generate} disabled={(!filledCount && !files.length && !notes.trim()) || generating}
            style={primaryBtnStyle((!filledCount && !files.length && !notes.trim()) || generating)}>
            {generating
              ? genPhase === "analyzing" ? "🔍 Analisando..." : "✍️ Escrevendo..."
              : `📊 Gerar Relatório (${detectedPlatforms.filter(p => p !== "general").length} rede${detectedPlatforms.filter(p => p !== "general").length > 1 ? "s" : ""})`}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════ STEP: REPORT ═══════════════
  if (step === "report" && client) return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{client.emoji}</span>
          <span style={{ ...monoStyle, fontSize: 12, color: client.color, fontWeight: 600 }}>{client.name}</span>
          <span style={{ ...monoStyle, fontSize: 11, color: "#444" }}>{MONTHS[month]} {year}</span>
          {detectedPlatforms.filter(p => p !== "general").map(pId => {
            const pm = PLATFORM_METRICS[pId];
            return pm ? <span key={pId} style={{ fontSize: 12 }} title={pm.name}>{pm.emoji}</span> : null;
          })}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => { setHistoryFilter(clientId); setStep("history"); }} style={smallBtnStyle}>📚 Histórico</button>
          <button onClick={() => setStep("input")} style={smallBtnStyle}>✏️ Métricas</button>
          <button onClick={generate} disabled={generating} style={smallBtnStyle}>{generating ? "⏳" : "↻"} Regenerar</button>
          <button onClick={() => { navigator.clipboard.writeText(report); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            style={{ ...primaryBtnStyle(false), padding: "6px 16px", fontSize: 12 }}>{copied ? "✓ Copiado!" : "📋 Copiar"}</button>
        </div>
      </div>
      <StepBar active={2} />
      <div style={{ ...cardStyle, padding: "24px 28px" }}>
        <div style={{ color: "#bbb", fontSize: 14, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{report}</div>
      </div>
      <div style={{ marginTop: 16 }}>
        <button onClick={() => { setStep(activeClient ? "upload" : "select"); setClientId(activeClient || null); setPlatformData({}); setFiles([]); setNotes(""); setReport(""); setAutoFilled({}); setDetectedPlatforms([]); }}
          style={smallBtnStyle}>← {activeClient ? "Novo relatório" : "Outro cliente"}</button>
      </div>
    </div>
  );

  // ═══════════════ STEP: HISTORY ═══════════════
  if (step === "history") {
    const filtered = historyFilter === "all" ? history : history.filter(h => h.clientId === historyFilter);
    const filterClient = historyFilter !== "all" ? CLIENT_PROFILES.find(c => c.id === historyFilter) : null;

    // Group by client
    const groupedByClient = {};
    for (const h of filtered) {
      if (!groupedByClient[h.clientId]) groupedByClient[h.clientId] = [];
      groupedByClient[h.clientId].push(h);
    }

    // Viewing a specific report
    if (viewingReport) {
      const vc = CLIENT_PROFILES.find(c => c.id === viewingReport.clientId);
      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{vc?.emoji}</span>
              <span style={{ ...monoStyle, fontSize: 12, color: vc?.color, fontWeight: 600 }}>{vc?.name}</span>
              <span style={{ ...monoStyle, fontSize: 11, color: "#444" }}>{MONTHS[viewingReport.month]} {viewingReport.year}</span>
              {(viewingReport.platforms || []).map(pId => {
                const pm = PLATFORM_METRICS[pId];
                return pm ? <span key={pId} style={{ fontSize: 12 }} title={pm.name}>{pm.emoji}</span> : null;
              })}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setViewingReport(null)} style={smallBtnStyle}>← Histórico</button>
              <button onClick={() => { navigator.clipboard.writeText(viewingReport.report); setCopiedH(viewingReport.id); setTimeout(() => setCopiedH(null), 2000); }}
                style={{ ...primaryBtnStyle(false), padding: "6px 16px", fontSize: 12 }}>
                {copiedH === viewingReport.id ? "✓ Copiado!" : "📋 Copiar"}
              </button>
            </div>
          </div>
          <div style={{ ...monoStyle, fontSize: 10, color: "#333", marginBottom: 12 }}>
            Gerado em {new Date(viewingReport.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            {viewingReport.fileCount > 0 && ` · ${viewingReport.fileCount} arquivo${viewingReport.fileCount > 1 ? "s" : ""}`}
          </div>
          <div style={{ ...cardStyle, padding: "24px 28px" }}>
            <div style={{ color: "#bbb", fontSize: 14, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{viewingReport.report}</div>
          </div>
          {viewingReport.notes && (
            <div style={{ ...cardStyle, padding: 12, marginTop: 10 }}>
              <div style={{ ...monoStyle, fontSize: 10, color: "#555", marginBottom: 4 }}>📝 OBSERVAÇÕES</div>
              <div style={{ ...monoStyle, fontSize: 11, color: "#888", whiteSpace: "pre-wrap" }}>{viewingReport.notes}</div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>📚</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{filterClient ? filterClient.name : "Histórico de Relatórios"}</div>
              <div style={{ ...monoStyle, fontSize: 11, color: "#555" }}>{filtered.length} relatório{filtered.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
          <button onClick={() => { setStep(activeClient ? "upload" : "select"); setViewingReport(null); }}
            style={smallBtnStyle}>← Voltar</button>
        </div>

        {/* Client filter tabs */}
        {!activeClient && (
          <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
            <button onClick={() => setHistoryFilter("all")}
              style={{
                ...monoStyle, fontSize: 11, padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                background: historyFilter === "all" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${historyFilter === "all" ? "rgba(255,255,255,0.15)" : "#1a1a2e"}`,
                color: historyFilter === "all" ? "#E4E4E7" : "#555",
              }}>Todos</button>
            {CLIENT_PROFILES.filter(c => history.some(h => h.clientId === c.id)).map(c => (
              <button key={c.id} onClick={() => setHistoryFilter(c.id)}
                style={{
                  ...monoStyle, fontSize: 11, padding: "6px 12px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap",
                  background: historyFilter === c.id ? c.color + "15" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${historyFilter === c.id ? c.color + "44" : "#1a1a2e"}`,
                  color: historyFilter === c.id ? c.color : "#555",
                }}>
                {c.emoji} {c.name}
                <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.6 }}>{history.filter(h => h.clientId === c.id).length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Report list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 10 }}>📊</div>
            <div style={{ ...monoStyle, fontSize: 12, color: "#444" }}>Nenhum relatório gerado ainda</div>
            <div style={{ ...monoStyle, fontSize: 11, color: "#333", marginTop: 4 }}>Gere seu primeiro relatório e ele aparecerá aqui.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(h => {
              const hc = CLIENT_PROFILES.find(c => c.id === h.clientId);
              const preview = h.report.slice(0, 180).replace(/[#*_]/g, "").trim();
              return (
                <div key={h.id}
                  onClick={() => setViewingReport(h)}
                  style={{
                    ...cardStyle, cursor: "pointer", padding: 16,
                    borderColor: hc ? hc.color + "15" : "#14141e",
                    transition: "all 0.2s",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 16 }}>{hc?.emoji}</span>
                        <span style={{ ...monoStyle, fontSize: 12, color: hc?.color, fontWeight: 600 }}>{hc?.name}</span>
                        <span style={{ ...monoStyle, fontSize: 11, color: "#555" }}>{MONTHS[h.month]} {h.year}</span>
                      </div>
                      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                        {(h.platforms || []).map(pId => {
                          const pm = PLATFORM_METRICS[pId];
                          return pm ? (
                            <span key={pId} style={{ ...monoStyle, fontSize: 9, color: pm.color, background: pm.color + "11", padding: "2px 6px", borderRadius: 4 }}>
                              {pm.emoji} {pm.name}
                            </span>
                          ) : null;
                        })}
                        {h.fileCount > 0 && (
                          <span style={{ ...monoStyle, fontSize: 9, color: "#444", background: "rgba(255,255,255,0.03)", padding: "2px 6px", borderRadius: 4 }}>📎 {h.fileCount}</span>
                        )}
                      </div>
                      <div style={{ ...monoStyle, fontSize: 11, color: "#666", lineHeight: 1.5, overflow: "hidden", maxHeight: 36 }}>
                        {preview}{h.report.length > 180 ? "..." : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                      <span style={{ ...monoStyle, fontSize: 10, color: "#333" }}>
                        {new Date(h.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(h.report); setCopiedH(h.id); setTimeout(() => setCopiedH(null), 2000); }}
                          style={{ ...monoStyle, fontSize: 9, color: "#555", background: "rgba(255,255,255,0.03)", border: "1px solid #1a1a2e", borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}>
                          {copiedH === h.id ? "✓" : "📋"}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); if (confirm(`Deletar relatório ${hc?.name} — ${MONTHS[h.month]} ${h.year}?`)) deleteHistoryEntry(h.id); }}
                          style={{ ...monoStyle, fontSize: 9, color: "#EF4444", background: "none", border: "1px solid #1a1a2e", borderRadius: 4, padding: "2px 6px", cursor: "pointer", opacity: 0.5 }}>
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}
