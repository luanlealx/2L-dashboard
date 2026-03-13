import { useState } from "react";
import { C, label } from "./tokens.js";

const CLIENTS = [
  { id: "zeroledger",  name: "ZeroLedger",  emoji: "⛓" },
  { id: "base-brasil", name: "Base Brasil", emoji: "🏔" },
];

function buildPrompt(clientName, metrics) {
  return `Você é o assistente operacional da agência 2L Digital. Com base nas métricas da semana abaixo, gere um briefing de prioridades para hoje.

**Cliente:** ${clientName}

**Métricas da semana:**
${metrics}

Retorne um briefing estruturado, direto e acionável com as seguintes seções:

## Resumo da Semana
Pontos principais sobre o desempenho geral (2-3 itens)

## Alertas
Pontos críticos ou que precisam de atenção imediata

## Top 3 Prioridades para Hoje
As 3 ações de maior impacto, em ordem de prioridade

## Ação Imediata
Uma única coisa para executar nos próximos 30 minutos`;
}

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} style={{ color: C.textBright, fontWeight: 600 }}>{part.slice(2, -2)}</strong>
      : part
  );
}

function BriefingContent({ text }) {
  return (
    <div style={{ fontSize: 14, lineHeight: 1.7 }}>
      {text.split("\n").map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: i === 0 ? 0 : 28, marginBottom: 10 }}>
              <span style={{ width: 3, height: 16, borderRadius: 2, background: C.brand, flexShrink: 0, display: "inline-block" }} />
              <h3 style={{ color: C.textBright, fontWeight: 600, fontSize: 15 }}>
                {line.replace("## ", "")}
              </h3>
            </div>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={i} style={{ display: "flex", gap: 10, color: C.text, paddingLeft: 13, paddingTop: 3 }}>
              <span style={{ color: C.brand, fontWeight: 700, fontSize: 12, marginTop: 2, flexShrink: 0 }}>›</span>
              <span>{renderInline(line.replace(/^[-•]\s/, ""))}</span>
            </div>
          );
        }
        if (line.match(/^\d+\.\s/)) {
          return (
            <div key={i} style={{ display: "flex", gap: 10, color: C.text, paddingLeft: 13, paddingTop: 3 }}>
              <span style={{ color: C.brand, fontFamily: "monospace", fontSize: 12, marginTop: 2, flexShrink: 0, minWidth: 14 }}>
                {line.match(/^\d+/)?.[0]}.
              </span>
              <span>{renderInline(line.replace(/^\d+\.\s/, ""))}</span>
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
        return <p key={i} style={{ color: C.text, paddingLeft: 13 }}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

export default function MorningBriefing() {
  const [client,         setClient]         = useState(CLIENTS[0]);
  const [metrics,        setMetrics]        = useState("");
  const [briefing,       setBriefing]       = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [metricsFocused, setMetricsFocused] = useState(false);
  const [btnHover,       setBtnHover]       = useState(false);

  async function handleGenerate() {
    if (!metrics.trim() || loading) return;
    setLoading(true);
    setError(null);
    setBriefing(null);
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          messages: [{ role: "user", content: buildPrompt(client.name, metrics) }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status}`);
      }
      const data = await res.json();
      setBriefing(data?.content?.[0]?.text ?? "Resposta vazia.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const canGenerate = !loading && metrics.trim().length > 0;

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "48px 24px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom: 44 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: C.textBright, letterSpacing: "-0.02em", lineHeight: 1 }}>
          Morning Briefing
        </h1>
        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 8, textTransform: "capitalize" }}>
          {today}
        </p>
      </div>

      {/* Client selector */}
      <div style={{ marginBottom: 28 }}>
        <label style={{ ...label, color: C.textDim }}>Cliente</label>
        <div style={{ display: "flex", gap: 8 }}>
          {CLIENTS.map((c) => {
            const active = client.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => { setClient(c); setBriefing(null); setError(null); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", borderRadius: 10, cursor: "pointer",
                  fontSize: 14, fontWeight: 500, fontFamily: "inherit",
                  transition: "all 0.15s",
                  ...(active ? {
                    background: C.brand,
                    border: `1px solid ${C.brand}`,
                    color: "#fff",
                    boxShadow: "0 4px 20px rgba(0,82,255,0.35)",
                  } : {
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    color: C.textMuted,
                  }),
                }}
              >
                <span style={{ fontSize: 16 }}>{c.emoji}</span>
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Metrics textarea */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ ...label, color: C.textDim }}>Métricas da semana</label>
        <textarea
          value={metrics}
          onChange={(e) => setMetrics(e.target.value)}
          onFocus={() => setMetricsFocused(true)}
          onBlur={() => setMetricsFocused(false)}
          placeholder={"Cole aqui as métricas da semana:\n\nEx: alcance 12k (+8%), engajamento 4.2%,\n8 leads, 2 fechamentos, CPL R$32..."}
          rows={7}
          style={{
            width: "100%", display: "block",
            background: C.surfaceAlt,
            border: `1px solid ${metricsFocused ? C.brand : C.border}`,
            borderRadius: 12, padding: "14px 16px",
            fontSize: 14, lineHeight: 1.65,
            color: C.textBright, resize: "none", fontFamily: "inherit",
            transition: "border-color 0.15s",
            boxShadow: metricsFocused ? "0 0 0 3px rgba(0,82,255,0.1)" : "none",
          }}
        />
      </div>

      {/* Generate button */}
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
            Gerando briefing...
          </>
        ) : (
          <>
            Gerar Briefing
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 16, padding: "14px 16px", borderRadius: 10,
          background: C.errorBg, border: `1px solid ${C.errorBorder}`,
          color: C.errorText, fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* Briefing output */}
      {briefing && (
        <div className="slide-up" style={{ marginTop: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.brand, display: "inline-block" }} />
              <span style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.18em", color: C.brand, textTransform: "uppercase" }}>
                Briefing — {client.name}
              </span>
            </div>
            <button
              onClick={() => setBriefing(null)}
              style={{ fontSize: 12, color: C.textDim, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              limpar
            </button>
          </div>
          <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 24px 28px" }}>
            <BriefingContent text={briefing} />
          </div>
        </div>
      )}

    </div>
  );
}
