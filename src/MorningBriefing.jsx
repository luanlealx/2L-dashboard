import { useState } from "react";
import { C, label } from "./tokens.js";
import { useClients } from "./hooks/useClients.js";
import BriefingContent from "./components/BriefingContent.jsx";

const BRIEFING_DB = "6bf4b5f1-8b63-4d76-9552-f48adb9393d1";

const todayBR   = () => new Date().toLocaleDateString("pt-BR");
const todayISO  = () => new Date().toISOString().split("T")[0];
const todayLong = () => new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

// Notion paragraph blocks are capped at 2000 chars
function toNotionBlocks(text) {
  const blocks = [];
  let rest = text;
  while (rest.length > 0) {
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ text: { content: rest.slice(0, 1990) } }] },
    });
    rest = rest.slice(1990);
  }
  return blocks;
}

export default function MorningBriefing({ onSendToMultiplier }) {
  const { clients } = useClients();
  const [selectedId, setSelectedId] = useState("");
  const [daily,      setDaily]      = useState("");   // "quente do dia" (web search)
  const [phase,      setPhase]      = useState(null);  // null | "queries" | "searching"
  const [insights,   setInsights]   = useState("");   // opcional, do operador
  const [final,      setFinal]      = useState("");   // briefing refinado
  const [refining,   setRefining]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState("");

  const client = clients.find(c => c.id === selectedId) ?? null;
  const output = final || daily;          // o melhor disponível
  const busy   = phase !== null;

  function reset() {
    setDaily(""); setFinal(""); setInsights("");
    setSaved(false); setError("");
  }

  // ── Etapa 1: busca o quente do dia (queries → web search streaming) ──────────
  async function searchTheDay() {
    if (!client || busy) return;
    reset();
    try {
      setPhase("queries");
      const q1 = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          system: `Você é um especialista em pesquisa de mercado para social media.
Dado o perfil de um cliente, gere exatamente 3 queries de busca em inglês otimizadas para encontrar:
1. Notícias recentes do nicho (últimas 24h)
2. Trending topics no X/Twitter do ecossistema
3. O que projetos concorrentes estão postando agora

Responda APENAS com as 3 queries, uma por linha, sem numeração ou prefixo.`,
          messages: [{
            role: "user",
            content: `Cliente: ${client.name}
Nicho: ${client.nicho || "não especificado"}
Plataformas: ${client.plataformas || "não especificadas"}
Contexto: ${client.systemContext}
Data: ${todayBR()}

Gere as 3 queries de busca.`,
          }],
        }),
      });
      if (!q1.ok) throw new Error(`Erro ao gerar queries (${q1.status})`);
      const q1data = await q1.json();
      const queries = q1data.content?.filter(b => b.type === "text").map(b => b.text).join("\n").trim() || "";
      if (!queries) throw new Error("Não foi possível gerar queries de busca");

      setPhase("searching");
      const q2 = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          stream: true,
          system: `Você é um analista de inteligência de mercado para social media. ${client.systemContext}

Use a ferramenta de web search para executar as queries fornecidas e gere o "quente do dia" CONCISO.

Estruture EXATAMENTE com estas seções:

## O que está acontecendo
2-3 fatos concretos com fontes. Informação real, sem paráfrase.

## Ângulos de conteúdo para hoje
3 ângulos específicos de post, cada um em 1 linha. Prontos para virar conteúdo.

## O que instruir para o time
2-3 orientações práticas e diretas.`,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{
            role: "user",
            content: `Execute estas buscas para ${client.name} e gere o quente do dia (${todayBR()}):\n\n${queries}`,
          }],
        }),
      });
      if (!q2.ok) throw new Error(`Erro na busca (${q2.status}): ${await q2.text()}`);

      const reader = q2.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const evt = JSON.parse(json);
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              setDaily(prev => prev + evt.delta.text);
            }
            if (evt.type === "error") throw new Error(evt.error?.message || "Stream error");
          } catch (e) {
            if (e.message === "Stream error" || e.message.startsWith("Erro")) throw e;
          }
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setPhase(null);
    }
  }

  // ── Etapa 2 (opcional): monta o briefing final com insights do operador ──────
  async function buildFinal() {
    if (!daily || !client || refining) return;
    setRefining(true); setError(""); setFinal(""); setSaved(false);
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          system: `Você é o estrategista operacional da agência 2L Digital. ${client.systemContext}`,
          messages: [{
            role: "user",
            content: `Monte o BRIEFING FINAL de hoje (${todayBR()}) para ${client.name}, combinando a inteligência do dia com os insights do operador.

## Inteligência do dia (web search)
${daily}

## Insights e métricas do operador
${insights.trim() || "(nenhum — use apenas a inteligência do dia)"}

Estruture assim:

## Prioridades de hoje
As 2-3 ações de maior impacto, em ordem.

## Conteúdo pronto pra produzir
3 ideias de post específicas, prontas pra ir pro Content Multiplier. Cada uma com: formato + ângulo + gancho.

## Ação imediata
1 coisa pra executar nos próximos 30 minutos.`,
          }],
        }),
      });
      if (!res.ok) throw new Error(`Erro ao montar briefing (${res.status})`);
      const data = await res.json();
      setFinal(data?.content?.filter(b => b.type === "text").map(b => b.text).join("\n") || "Resposta vazia.");
    } catch (e) {
      setError(e.message);
    } finally {
      setRefining(false);
    }
  }

  async function saveToNotion() {
    if (!output || !client || saving) return;
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "pages",
          method: "POST",
          body: {
            parent: { database_id: BRIEFING_DB },
            properties: {
              Name:    { title: [{ text: { content: `Briefing ${client.name} ${todayBR()}` } }] },
              Cliente: { rich_text: [{ text: { content: client.name } }] },
              Data:    { date: { start: todayISO() } },
            },
            children: toNotionBlocks(output),
          },
        }),
      });
      if (!res.ok) throw new Error(`Notion error ${res.status}`);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function sendToMultiplier() {
    if (!output || !client) return;
    onSendToMultiplier?.({ clientId: client.id, context: output });
  }

  // ── styles ───────────────────────────────────────────────────────────────────
  const clientBtn = (active) => ({
    display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
    padding: "7px 12px", borderRadius: 8, cursor: busy ? "not-allowed" : "pointer",
    fontSize: 13, fontWeight: 500, fontFamily: "inherit", transition: "all 0.15s",
    ...(active
      ? { background: C.brand, border: `1px solid ${C.brand}`, color: "#fff", boxShadow: "0 4px 16px rgba(0,82,255,0.35)" }
      : { background: C.surface, border: `1px solid ${C.border}`, color: C.textMuted }),
  });

  const actionBtn = (variant = "ghost") => ({
    padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
    ...(variant === "primary"
      ? { background: C.brand, border: `1px solid ${C.brand}`, color: "#fff" }
      : { background: "none", border: `1px solid ${C.border}`, color: C.textMuted }),
  });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "44px 24px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...label, color: C.brand }}>Morning Briefing</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: C.textBright, letterSpacing: "-0.02em", margin: 0 }}>
          O quente do dia
        </h1>
        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 8, textTransform: "capitalize" }}>
          {todayLong()}
        </p>
      </div>

      {/* Client selector */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ ...label, color: C.textDim }}>Cliente</div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
          {clients.map((c) => (
            <button key={c.id} disabled={busy}
              onClick={() => { setSelectedId(c.id); reset(); }}
              style={clientBtn(selectedId === c.id)}>
              <span style={{ fontSize: 14 }}>{c.emoji}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 1 — search the day */}
      <button onClick={searchTheDay} disabled={!selectedId || busy}
        style={{
          width: "100%", padding: "13px 24px", borderRadius: 12, border: "none",
          fontSize: 15, fontWeight: 600, fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "all 0.15s", marginBottom: 24,
          ...(!selectedId || busy
            ? { background: C.surface, color: C.textDim, border: `1px solid ${C.border}`, cursor: "not-allowed" }
            : { background: C.brand, color: "#fff", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,82,255,0.3)" }),
        }}>
        {phase === "queries"   ? "Preparando buscas…"
         : phase === "searching" ? "Buscando o quente do dia…"
         : "🔍 Buscar o quente do dia"}
      </button>

      {/* Error */}
      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 20,
          background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.errorText, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Progress */}
      {busy && !daily && (
        <div style={{ padding: "36px 24px", borderRadius: 12, textAlign: "center",
          background: C.surface, border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 14 }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>{phase === "queries" ? "🧠" : "🔍"}</div>
          <strong style={{ color: C.textBright }}>
            {phase === "queries" ? "Preparando buscas…" : "Buscando na web…"}
          </strong>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 8 }}>
            {phase === "queries" ? `Gerando queries para ${client?.name}` : "Notícias, trends e concorrentes do dia"}
          </div>
        </div>
      )}

      {/* "Quente do dia" output */}
      {daily && (
        <div className="slide-up" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.brand }} />
            <span style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.18em", color: C.brand, textTransform: "uppercase" }}>
              Quente do dia — {client?.name}
            </span>
            {phase === "searching" && <span style={{ fontSize: 11, color: C.textDim }}>escrevendo…</span>}
          </div>
          <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px 26px" }}>
            <BriefingContent text={daily} />
          </div>
        </div>
      )}

      {/* Step 2 — optional refine */}
      {daily && !busy && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ ...label, color: C.textDim }}>Seus insights e métricas <span style={{ textTransform: "none", color: C.textDim }}>(opcional)</span></div>
          <textarea
            value={insights}
            onChange={(e) => setInsights(e.target.value)}
            placeholder={"Cole o que você sabe e a web não traz: métricas da semana, contexto interno, o que o cliente pediu...\n\nEx: alcance 12k (+8%), Aura quer focar na live de quinta, evitar falar de preço."}
            rows={5}
            style={{ width: "100%", display: "block", background: C.surfaceAlt,
              border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px",
              fontSize: 14, lineHeight: 1.6, color: C.textBright, resize: "none", fontFamily: "inherit" }}
          />
          <button onClick={buildFinal} disabled={refining}
            style={{ ...actionBtn("primary"), width: "100%", marginTop: 12, padding: "12px 24px", fontSize: 14,
              cursor: refining ? "not-allowed" : "pointer", opacity: refining ? 0.7 : 1 }}>
            {refining ? "Montando briefing final…" : final ? "↻ Refazer briefing final" : "⚡ Montar briefing final"}
          </button>
        </div>
      )}

      {/* Final briefing */}
      {final && (
        <div className="slide-up" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
            <span style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.18em", color: "#4ade80", textTransform: "uppercase" }}>
              Briefing final — {client?.name}
            </span>
          </div>
          <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px 26px" }}>
            <BriefingContent text={final} />
          </div>
        </div>
      )}

      {/* Action bar */}
      {output && !busy && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button style={actionBtn("ghost")} onClick={() => navigator.clipboard?.writeText(output)}>Copiar</button>
          <button style={{ ...actionBtn("ghost"), opacity: saving || saved ? 0.7 : 1, cursor: saving || saved ? "default" : "pointer",
              ...(saved ? { color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" } : {}) }}
            onClick={saveToNotion} disabled={saving || saved}>
            {saved ? "✓ Salvo no Notion" : saving ? "Salvando…" : "Salvar no Notion"}
          </button>
          <button style={actionBtn("primary")} onClick={sendToMultiplier}>
            Usar no Content Multiplier →
          </button>
        </div>
      )}

    </div>
  );
}
