import { useState } from "react";
import { C, label } from "./tokens.js";
import { useClients } from "./hooks/useClients.js";
import BriefingContent from "./components/BriefingContent.jsx";

const BRIEFING_DB = "3342b39d-6fd2-4d0e-b2df-b8bfefbd5e9b";

const todayBR   = () => new Date().toLocaleDateString("pt-BR");
const todayISO  = () => new Date().toISOString().split("T")[0];
const todayLong = () => new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

// score composto: relevância pesa mais, depois tendência (momentum), depois volume
const scoreOf = (p) =>
  Math.round((Number(p.relevancia) || 0) * 0.5 + (Number(p.tendencia) || 0) * 0.3 + (Number(p.volume) || 0) * 0.2);

function toNotionBlocks(text) {
  const blocks = [];
  let rest = text;
  while (rest.length > 0) {
    blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: rest.slice(0, 1990) } }] } });
    rest = rest.slice(1990);
  }
  return blocks;
}

// ── barra de um eixo (relevância / volume / tendência) ───────────────────────
function Bar({ name, value, color }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
      <span style={{ fontSize: 10, color: C.textDim, width: 84, flexShrink: 0, fontFamily: "monospace", letterSpacing: "0.02em" }}>{name}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 4, background: C.border, overflow: "hidden" }}>
        <div style={{ width: `${v}%`, height: "100%", borderRadius: 4, background: color, transition: "width 0.7s ease" }} />
      </div>
      <span style={{ fontSize: 10, color: C.textMuted, width: 24, textAlign: "right", fontFamily: "monospace" }}>{v}</span>
    </div>
  );
}

// ── card de uma pauta ────────────────────────────────────────────────────────
function PautaCard({ pauta, rank, isTop, onUse }) {
  return (
    <div className="slide-up" style={{
      background: isTop ? "linear-gradient(135deg, rgba(0,82,255,0.13), rgba(0,82,255,0.02))" : C.surfaceAlt,
      border: `1px solid ${isTop ? C.brand : C.border}`,
      borderRadius: 14, padding: isTop ? "20px 22px" : "16px 18px",
      boxShadow: isTop ? "0 8px 30px rgba(0,82,255,0.20)" : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        {isTop
          ? <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#fff", background: C.brand, padding: "3px 9px", borderRadius: 6 }}>🔥 PRIORIDADE #1</span>
          : <span style={{ fontSize: 11, fontFamily: "monospace", color: C.textDim }}>#{rank}</span>}
        <span style={{ fontSize: 11, fontFamily: "monospace", color: isTop ? C.brand : C.textDim }}>score {scoreOf(pauta)}</span>
      </div>

      <h3 style={{ fontSize: isTop ? 18 : 15, fontWeight: 700, color: C.textBright, margin: "10px 0 4px", lineHeight: 1.25 }}>{pauta.tema}</h3>
      {pauta.porque && <p style={{ fontSize: 12.5, color: C.textMuted, margin: "0 0 10px", lineHeight: 1.5 }}>{pauta.porque}</p>}

      <Bar name="Relevância" value={pauta.relevancia} color={C.brand} />
      <Bar name="Volume"     value={pauta.volume}     color="#6B9FFF" />
      <Bar name="Tendência ↑" value={pauta.tendencia} color="#4ade80" />

      {pauta.angulo && (
        <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 10, letterSpacing: "0.12em", color: C.textDim, textTransform: "uppercase" }}>Ângulo de post</span>
          <p style={{ fontSize: 13, color: C.text, margin: "4px 0 0", lineHeight: 1.5 }}>{pauta.angulo}</p>
        </div>
      )}

      <button onClick={onUse} style={{
        marginTop: 14, width: "100%", padding: "10px 16px", borderRadius: 10, cursor: "pointer",
        fontSize: 13, fontWeight: 600, fontFamily: "inherit",
        ...(isTop
          ? { background: C.brand, color: "#fff", border: "none", boxShadow: "0 4px 16px rgba(0,82,255,0.3)" }
          : { background: "none", color: C.textMuted, border: `1px solid ${C.border}` }),
      }}>
        Gerar conteúdo dessa pauta →
      </button>
    </div>
  );
}

export default function MorningBriefing({ onSendToMultiplier }) {
  const { clients } = useClients();
  const [selectedId, setSelectedId] = useState("");
  const [pautas,     setPautas]     = useState([]);   // [{tema, relevancia, volume, tendencia, porque, angulo}]
  const [phase,      setPhase]      = useState(null);  // null | "queries" | "searching"
  const [insights,   setInsights]   = useState("");
  const [final,      setFinal]      = useState("");
  const [refining,   setRefining]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState("");

  const client = clients.find(c => c.id === selectedId) ?? null;
  const busy   = phase !== null;

  function reset() {
    setPautas([]); setFinal(""); setInsights(""); setSaved(false); setError("");
  }

  // ── Etapa 1: descobrir as pautas quentes (web search → cards que poppam) ─────
  async function scanTheDay() {
    if (!client || busy) return;
    reset();
    try {
      // Fase 1 — queries de busca
      setPhase("queries");
      const q1 = await fetch("/api/claude", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 800,
          system: `Você é um especialista em pesquisa de mercado para social media.
Dado o perfil de um cliente, gere exatamente 3 queries de busca em inglês otimizadas para encontrar:
1. Notícias recentes do nicho (últimas 24h)
2. Trending topics no X/Twitter do ecossistema
3. O que projetos concorrentes estão postando agora

Responda APENAS com as 3 queries, uma por linha, sem numeração ou prefixo.`,
          messages: [{ role: "user", content: `Cliente: ${client.name}
Nicho: ${client.nicho || "não especificado"}
Plataformas: ${client.plataformas || "não especificadas"}
Contexto: ${client.systemContext}
Data: ${todayBR()}

Gere as 3 queries de busca.` }],
        }),
      });
      if (!q1.ok) throw new Error(`Erro ao gerar queries (${q1.status})`);
      const q1data = await q1.json();
      const queries = q1data.content?.filter(b => b.type === "text").map(b => b.text).join("\n").trim() || "";
      if (!queries) throw new Error("Não foi possível gerar queries de busca");

      // Fase 2 — web search + pautas em NDJSON (uma por linha → cada uma vira card)
      setPhase("searching");
      const q2 = await fetch("/api/claude", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 2000, stream: true,
          system: `Você é um analista de inteligência de pauta para social media. ${client.systemContext}

Use a ferramenta de web search para investigar o que está em alta HOJE no nicho deste cliente. Depois identifique de 4 a 6 PAUTAS de conteúdo prioritárias para hoje.

Para cada pauta, avalie de 0 a 100:
- relevancia: o quanto importa para o público ESPECÍFICO deste cliente
- volume: o quanto o assunto está sendo falado agora
- tendencia: o quanto está em ascensão / momentum (100 = explodindo agora, 0 = já saturado ou caindo)

Responda APENAS com as pautas, UMA POR LINHA, cada linha um objeto JSON válido e completo, ordenadas da MAIOR para a menor prioridade. Sem texto antes ou depois, sem array, sem markdown, sem crases.

Cada linha exatamente neste formato:
{"tema":"...","relevancia":0,"volume":0,"tendencia":0,"porque":"1 frase: por que importa pra ESTE público","angulo":"1 frase: ângulo de post pronto pra produzir"}`,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: `Investigue o que está quente HOJE (${todayBR()}) para ${client.name} e gere as pautas priorizadas:\n\n${queries}` }],
        }),
      });
      if (!q2.ok) throw new Error(`Erro na busca (${q2.status}): ${await q2.text()}`);

      const reader = q2.body.getReader();
      const decoder = new TextDecoder();
      let sseBuf   = "";  // buffer do protocolo SSE
      let txtBuf   = "";  // buffer do texto do modelo (acumula até fechar uma linha)
      let fullText = "";  // todo o texto do modelo (fallback de parsing)

      const tryAdd = (line) => {
        const s = line.trim().replace(/,\s*$/, "");   // tolera vírgula final
        if (!s.startsWith("{")) return;
        try {
          const obj = JSON.parse(s);
          if (obj && obj.tema) setPautas(prev => [...prev, obj]);
        } catch { /* linha ainda incompleta ou ruído — ignora */ }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuf += decoder.decode(value, { stream: true });
        const lines = sseBuf.split("\n");
        sseBuf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const evt = JSON.parse(json);
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              txtBuf += evt.delta.text;
              fullText += evt.delta.text;
              let nl;
              while ((nl = txtBuf.indexOf("\n")) >= 0) {
                tryAdd(txtBuf.slice(0, nl));
                txtBuf = txtBuf.slice(nl + 1);
              }
            }
            if (evt.type === "error") throw new Error(evt.error?.message || "Stream error");
          } catch (e) {
            if (e.message === "Stream error" || e.message?.startsWith?.("Erro")) throw e;
          }
        }
      }
      if (txtBuf.trim()) tryAdd(txtBuf);                       // última linha sem \n
      setPautas(prev => {
        let list = prev;
        if (list.length === 0) {           // fallback: modelo não usou NDJSON — extrai objetos do texto inteiro
          list = [];
          for (const m of (fullText.match(/\{[^{}]*\}/g) || [])) {
            try { const o = JSON.parse(m); if (o && o.tema) list.push(o); } catch { /* ignora */ }
          }
        }
        if (list.length === 0) setError("Não consegui montar as pautas dessa vez. Tenta de novo.");
        return [...list].sort((a, b) => scoreOf(b) - scoreOf(a));  // ranqueia ao fechar
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setPhase(null);
    }
  }

  // ── Etapa 2 (opcional): fecha o briefing do dia com insights do operador ─────
  async function buildFinal() {
    if (!pautas.length || !client || refining) return;
    setRefining(true); setError(""); setFinal(""); setSaved(false);
    const pautasTxt = pautas.map((p, i) => `${i + 1}. ${p.tema} (rel ${p.relevancia}/vol ${p.volume}/tend ${p.tendencia}) — ${p.angulo}`).join("\n");
    try {
      const res = await fetch("/api/claude", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 1500,
          system: `Você é o estrategista operacional da agência 2L Digital. ${client.systemContext}`,
          messages: [{ role: "user", content: `Feche o BRIEFING DE HOJE (${todayBR()}) para ${client.name}.

## Pautas priorizadas do radar
${pautasTxt}

## Insights e métricas do operador
${insights.trim() || "(nenhum — use apenas o radar de pautas)"}

Estruture assim:

## Prioridades de hoje
As 2-3 ações de maior impacto, em ordem.

## Conteúdo pronto pra produzir
3 posts específicos baseados nas pautas de maior score. Cada um: formato + ângulo + gancho.

## Ação imediata
1 coisa pra executar nos próximos 30 minutos.` }],
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
    if (!client || saving) return;
    const body = final || pautas.map(p => `• ${p.tema} — ${p.angulo}`).join("\n");
    if (!body) return;
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/notion", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "pages", method: "POST",
          body: {
            parent: { database_id: BRIEFING_DB },
            properties: {
              "Título": { title: [{ text: { content: `Briefing ${client.name} ${todayBR()}` } }] },
              Cliente:   { rich_text: [{ text: { content: client.name } }] },
              Data:      { date: { start: todayISO() } },
            },
            children: toNotionBlocks(body),
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

  const usePauta = (p) => {
    if (!client) return;
    onSendToMultiplier?.({ clientId: client.id, context: `Pauta do dia: ${p.tema}\nÂngulo: ${p.angulo}\nPor que importa: ${p.porque}` });
  };

  const clientBtn = (active) => ({
    display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
    padding: "7px 12px", borderRadius: 8, cursor: busy ? "not-allowed" : "pointer",
    fontSize: 13, fontWeight: 500, fontFamily: "inherit", transition: "all 0.15s",
    ...(active
      ? { background: C.brand, border: `1px solid ${C.brand}`, color: "#fff", boxShadow: "0 4px 16px rgba(0,82,255,0.35)" }
      : { background: C.surface, border: `1px solid ${C.border}`, color: C.textMuted }),
  });

  const ranked = [...pautas].sort((a, b) => scoreOf(b) - scoreOf(a));

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "44px 24px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ ...label, color: C.brand }}>Morning Briefing</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: C.textBright, letterSpacing: "-0.02em", margin: 0 }}>
          Radar de pautas
        </h1>
        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 8, textTransform: "capitalize" }}>{todayLong()}</p>
      </div>

      {/* Client selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ ...label, color: C.textDim }}>Cliente</div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
          {clients.map((c) => (
            <button key={c.id} disabled={busy} onClick={() => { setSelectedId(c.id); reset(); }} style={clientBtn(selectedId === c.id)}>
              <span style={{ fontSize: 14 }}>{c.emoji}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scan button */}
      <button onClick={scanTheDay} disabled={!selectedId || busy}
        style={{
          width: "100%", padding: "13px 24px", borderRadius: 12, border: "none",
          fontSize: 15, fontWeight: 600, fontFamily: "inherit",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "all 0.15s", marginBottom: 24,
          ...(!selectedId || busy
            ? { background: C.surface, color: C.textDim, border: `1px solid ${C.border}`, cursor: "not-allowed" }
            : { background: C.brand, color: "#fff", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,82,255,0.3)" }),
        }}>
        {phase === "queries" ? "Preparando o radar…" : phase === "searching" ? "Varrendo o ecossistema…" : "🔍 Buscar o quente do dia"}
      </button>

      {/* Error */}
      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 20, background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.errorText, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Scanning state (before first card pops) */}
      {busy && pautas.length === 0 && (
        <div style={{ padding: "40px 24px", borderRadius: 14, textAlign: "center", background: C.surface, border: `1px solid ${C.border}`, color: C.textMuted }}>
          <div style={{ fontSize: 30, marginBottom: 12 }} className="spin-slow">📡</div>
          <strong style={{ color: C.textBright, fontSize: 14 }}>
            {phase === "queries" ? "Montando as buscas…" : "Varrendo notícias, trends e concorrentes…"}
          </strong>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 8 }}>As pautas vão aparecendo aqui conforme forem descobertas.</div>
        </div>
      )}

      {/* Radar — pautas */}
      {ranked.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
          {busy && (
            <div style={{ fontSize: 11, fontFamily: "monospace", color: C.textDim, letterSpacing: "0.05em" }}>
              {pautas.length} pauta(s) encontradas…
            </div>
          )}
          {ranked.map((p, i) => (
            <PautaCard key={`${p.tema}-${i}`} pauta={p} rank={i + 1} isTop={!busy && i === 0} onUse={() => usePauta(p)} />
          ))}
        </div>
      )}

      {/* Optional: close the day's briefing */}
      {ranked.length > 0 && !busy && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ ...label, color: C.textDim }}>Seus insights e métricas <span style={{ textTransform: "none" }}>(opcional)</span></div>
          <textarea
            value={insights} onChange={(e) => setInsights(e.target.value)}
            placeholder={"O que a web não traz: métricas da semana, contexto interno, o que o cliente pediu...\n\nEx: alcance 12k (+8%), Aura quer focar na live de quinta, evitar falar de preço."}
            rows={4}
            style={{ width: "100%", display: "block", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", fontSize: 14, lineHeight: 1.6, color: C.textBright, resize: "none", fontFamily: "inherit" }}
          />
          <button onClick={buildFinal} disabled={refining}
            style={{ width: "100%", marginTop: 12, padding: "12px 24px", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
              background: C.brand, color: "#fff", cursor: refining ? "not-allowed" : "pointer", opacity: refining ? 0.7 : 1 }}>
            {refining ? "Montando briefing do dia…" : final ? "↻ Refazer briefing do dia" : "⚡ Montar briefing do dia"}
          </button>
        </div>
      )}

      {/* Final briefing */}
      {final && (
        <div className="slide-up" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
            <span style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.18em", color: "#4ade80", textTransform: "uppercase" }}>
              Briefing do dia — {client?.name}
            </span>
          </div>
          <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px 26px" }}>
            <BriefingContent text={final} />
          </div>
        </div>
      )}

      {/* Action bar */}
      {ranked.length > 0 && !busy && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button style={{ padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", background: "none", border: `1px solid ${C.border}`, color: C.textMuted }}
            onClick={() => navigator.clipboard?.writeText(final || ranked.map(p => `• ${p.tema} — ${p.angulo}`).join("\n"))}>
            Copiar
          </button>
          <button style={{ padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: saving || saved ? "default" : "pointer",
              background: "none", border: `1px solid ${saved ? "rgba(34,197,94,0.3)" : C.border}`, color: saved ? "#4ade80" : C.textMuted, opacity: saving ? 0.7 : 1 }}
            onClick={saveToNotion} disabled={saving || saved}>
            {saved ? "✓ Salvo no Notion" : saving ? "Salvando…" : "Salvar no Notion"}
          </button>
        </div>
      )}

    </div>
  );
}
