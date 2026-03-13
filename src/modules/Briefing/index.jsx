import { useState, useEffect } from "react";
import { CLIENT_PROFILES, TRACKED_COINS } from "../../data/clients.js";
import { callClaude } from "../../lib/claude.js";
import {
  formatTime,
  formatPrice,
  formatChange,
  getGreeting,
  formatDate,
  extractRules,
} from "../../lib/utils.js";
import {
  monoStyle,
  labelStyle,
  cardStyle,
  smallBtnStyle,
  primaryBtnStyle,
  LoadingDot,
} from "../../components/ui/index.jsx";

function OutputCard({ client, content, loading }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ ...cardStyle, borderColor: client.color + "18" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: client.color, opacity: 0.4 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{client.emoji}</span>
          <span style={{ ...monoStyle, fontSize: 12, fontWeight: 700, color: client.color }}>{client.name}</span>
        </div>
        {content && (
          <button
            onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            style={{ ...smallBtnStyle, color: copied ? "#10B981" : "#555" }}
          >
            {copied ? "✓" : "⎘"}
          </button>
        )}
      </div>
      {loading ? (
        <LoadingDot color={client.color} text="Gerando..." />
      ) : content ? (
        <div style={{ color: "#bbb", fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{content}</div>
      ) : (
        <div style={{ color: "#222", fontSize: 12, fontStyle: "italic" }}>Aguardando...</div>
      )}
    </div>
  );
}

export default function MorningBriefing({ activeClient }) {
  const [prices, setPrices] = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [briefing, setBriefing] = useState(null);
  const [suggestions, setSuggestions] = useState({});
  const [sugLoading, setSugLoading] = useState({});
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [time, setTime] = useState(formatTime());
  const [briefCopied, setBriefCopied] = useState(false);

  useEffect(() => { const t = setInterval(() => setTime(formatTime()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { fetchPrices(); const t = setInterval(fetchPrices, 60000); return () => clearInterval(t); }, []);
  useEffect(() => { setPhase("idle"); setBriefing(null); setSuggestions({}); setError(null); setBriefCopied(false); }, [activeClient]);

  const fetchPrices = async () => {
    setPricesLoading(true);
    const m = {};

    try {
      const res = await fetch("https://api.coincap.io/v2/assets?ids=bitcoin,ethereum,solana", { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const { data } = await res.json();
        for (const asset of data) {
          const coin = TRACKED_COINS.find(c => c.id === asset.id);
          if (coin) m[coin.id] = { current_price: parseFloat(asset.priceUsd), price_change_percentage_24h: parseFloat(asset.changePercent24Hr) };
        }
      }
    } catch {}

    if (!m.bitcoin) {
      try {
        const res = await fetch("https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC,ETH,SOL&tsyms=USD", { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const { RAW } = await res.json();
          const ccMap = { BTC: "bitcoin", ETH: "ethereum", SOL: "solana" };
          for (const [sym, id] of Object.entries(ccMap)) {
            if (RAW?.[sym]?.USD) m[id] = { current_price: RAW[sym].USD.PRICE, price_change_percentage_24h: RAW[sym].USD.CHANGEPCT24HOUR };
          }
        }
      } catch {}
    }

    if (!m.bitcoin) {
      try {
        const cryptoCoins = TRACKED_COINS.filter(c => !c.isFiat);
        const symbols = encodeURIComponent(JSON.stringify(cryptoCoins.map(c => c.binance)));
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbols}`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const binData = await res.json();
          for (const tick of binData) {
            const coin = cryptoCoins.find(c => c.binance === tick.symbol);
            if (coin) m[coin.id] = { current_price: parseFloat(tick.lastPrice), price_change_percentage_24h: parseFloat(tick.priceChangePercent) };
          }
        }
      } catch {}
    }

    try {
      const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data.USDBRL) m["usd-brl"] = { current_price: parseFloat(data.USDBRL.bid), price_change_percentage_24h: parseFloat(data.USDBRL.pctChange), isBRL: true };
      }
    } catch {}

    if (!m["usd-brl"]) {
      try {
        const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD", { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (data.rates?.BRL) m["usd-brl"] = { current_price: data.rates.BRL, price_change_percentage_24h: 0, isBRL: true };
        }
      } catch {}
    }

    if (!m.bitcoin) {
      try {
        const aiRes = await fetch("/api/claude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 1000,
            tools: [{ type: "web_search_20250305", name: "web_search" }],
            messages: [{ role: "user", content: 'Return ONLY a JSON object (no markdown, no backticks, no explanation) with current crypto prices and USD/BRL rate in this exact format: {"bitcoin":{"price":NUMBER,"change":NUMBER},"ethereum":{"price":NUMBER,"change":NUMBER},"solana":{"price":NUMBER,"change":NUMBER},"usdbrl":{"price":NUMBER,"change":NUMBER}}' }]
          })
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const text = aiData.content.filter(i => i.type === "text").map(i => i.text).join("");
          const clean = text.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(clean);
          if (parsed.bitcoin) m.bitcoin = { current_price: parsed.bitcoin.price, price_change_percentage_24h: parsed.bitcoin.change };
          if (parsed.ethereum) m.ethereum = { current_price: parsed.ethereum.price, price_change_percentage_24h: parsed.ethereum.change };
          if (parsed.solana) m.solana = { current_price: parsed.solana.price, price_change_percentage_24h: parsed.solana.change };
          if (parsed.usdbrl && !m["usd-brl"]) m["usd-brl"] = { current_price: parsed.usdbrl.price, price_change_percentage_24h: parsed.usdbrl.change, isBRL: true };
        }
      } catch(e) { console.error("AI price fallback failed:", e); }
    }

    if (Object.keys(m).length > 0) setPrices(m);
    setPricesLoading(false);
    return m;
  };

  const fetchBriefing = async (priceData) => {
    const priceCtx = TRACKED_COINS.map(c => {
      const p = priceData[c.id];
      return p ? `${c.symbol}${c.isFiat ? "/BRL" : ""}: ${formatPrice(p.current_price, p.isBRL)} (${formatChange(p.price_change_percentage_24h)})` : "";
    }).filter(Boolean).join(" | ");

    const today = new Date();
    const dayOfWeek = today.toLocaleDateString("pt-BR", { weekday: "long" });
    const dateStr = today.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

    if (activeClient) {
      const client = CLIENT_PROFILES.find(c => c.id === activeClient);
      if (!client) return "Cliente não encontrado.";
      const text = await callClaude([{ role: "user", content: `Você é o co-piloto executivo do Luan (CEO, Agência 2L), focado no cliente ${client.name}.

DATA: ${dayOfWeek}, ${dateStr}
TIMEZONE DO LUAN: America/Sao_Paulo (UTC-3)
PREÇOS LIVE: ${priceCtx}

CLIENTE: ${client.emoji} ${client.name}
CONTRATO: ${client.revenue} | ROLE: ${client.role}
PLATAFORMAS: ${client.platforms.join(", ")}
FOCO: ${client.briefingFocus}
AUDIÊNCIA: ${client.audience.demographics}
IDIOMA: ${client.audience.language}
TIMEZONE PÚBLICO: ${client.audience.country} (${client.audience.timezone}, UTC${client.audience.utcOffset >= 0 ? "+" : ""}${client.audience.utcOffset})
HORÁRIOS DE PICO: ${client.audience.peakHours.join(", ")}
MELHORES DIAS: ${client.audience.peakDays.join(", ")}

⚠️ REGRAS DO CLIENTE:
${extractRules(client.systemPrompt)}

## 📊 CONTEXTO DE MERCADO
## 🎯 TAREFAS DE HOJE
## 🔥 OPORTUNIDADES DE CONTEÚDO
## 📅 MELHOR HORÁRIO PARA POSTAR HOJE
## ⚠️ ALERTAS & COMPLIANCE

PT-BR, direto, actionable.` }], 2500);
      return text;
    }

    const clientSummary = CLIENT_PROFILES.slice(0, 5).map(c => `- ${c.emoji} ${c.name} (${c.role}): ${c.briefingFocus}`).join("\n");
    const text = await callClaude([{ role: "user", content: `Você é o co-piloto executivo da Agência 2L. Gere o BRIEFING DIÁRIO para o CEO Luan.

DATA: ${dayOfWeek}, ${dateStr} | TIMEZONE DO LUAN: America/Sao_Paulo (UTC-3)
PREÇOS LIVE: ${priceCtx}

CLIENTES:
${clientSummary}

ROTINA FIXA: 08:30 Call Aura · Conteúdo diário Base Brasil · Monitoramento Zero Ledger · Supervisão Maya IG (semanal) · ACO Labs (semanal) · TikTok 98K + X 14.9K

## 📊 MERCADO
## 🎯 AGENDA DO DIA
## 🔥 OPORTUNIDADES DE CONTEÚDO
## ⚠️ ALERTAS
## 📝 PAUTA CALL AURA (08:30)

PT-BR, direto, zero enrolação.` }], 2500);
    return text;
  };

  const genSuggestions = async (priceData, briefingText) => {
    const priceCtx = TRACKED_COINS.map(c => {
      const p = priceData[c.id];
      return p ? `${c.symbol}${c.isFiat ? "/BRL" : ""}: ${formatPrice(p.current_price, p.isBRL)} (${formatChange(p.price_change_percentage_24h)})` : "";
    }).filter(Boolean).join(" | ");

    const targetClients = activeClient ? CLIENT_PROFILES.filter(c => c.id === activeClient) : CLIENT_PROFILES.slice(0, 5);
    for (const client of targetClients) {
      setSugLoading(p => ({ ...p, [client.id]: true }));
      try {
        const safeBriefing = briefingText
          ? (() => { const t = briefingText.substring(0, 900); const idx = t.lastIndexOf("."); return idx > 200 ? t.substring(0, idx + 1) : t.substring(0, 800); })()
          : "Dia normal de operação.";

        const text = await callClaude([{ role: "user", content: `${client.systemPrompt}

---
TAREFA: Gere 2-3 SUGESTÕES DE CONTEÚDO para ${client.name} publicar HOJE.
Preços: ${priceCtx} | Plataformas: ${client.platforms.join(", ")} | Pico: ${client.audience.peakHours.join(", ")} | Idioma: ${client.audience.language}
Contexto: ${safeBriefing}

FORMATO:
**[PRIORIDADE]** Plataforma · Formato
🪝 HOOK: [primeira frase]
📐 ÂNGULO: [em 1 frase]
⏰ HORÁRIO: [baseado nos picos]

Respeite compliance e tom de voz. PT-BR.` }]);
        setSuggestions(p => ({ ...p, [client.id]: text }));
      } catch (e) {
        setSuggestions(p => ({ ...p, [client.id]: `⚠️ Erro: ${e.message}` }));
      }
      setSugLoading(p => ({ ...p, [client.id]: false }));
    }
  };

  const runAll = async () => {
    setError(null); setBriefing(null); setSuggestions({});
    try {
      setPhase("prices");
      const priceData = await fetchPrices();
      setPhase("briefing");
      let briefText = "";
      try { briefText = await fetchBriefing(priceData); setBriefing(briefText); }
      catch(e) { setBriefing("⚠️ Não foi possível gerar o briefing. Verifique a API."); }
      setPhase("suggestions");
      await genSuggestions(priceData, briefText);
      setPhase("done");
    } catch(e) { setError(e.message); setPhase("done"); }
  };

  const isRunning = phase !== "idle" && phase !== "done";

  const agendaItems = {
    "aura": { time: "08:30", title: "Call diária Aura ✨", desc: "Discord · Pauta: notícias do dia + Q&A comunidade" },
    "base-brasil": { time: "—", title: "Conteúdo diário Base Brasil 🔵", desc: "Twitter/X + IG · Calendário semanal de conteúdo" },
    "zero-ledger": { time: "—", title: "Monitoramento Zero Ledger 🛡️", desc: "Compliance review + conteúdo institucional" },
    "maya-ig": { time: "—", title: "Supervisão Maya IG 💎", desc: "Revisão semanal de feed + stories" },
    "aco-labs": { time: "—", title: "Conteúdo ACO Labs 🧪", desc: "Thread técnica semanal" },
    "pessoal-tiktok": { time: "18:00", title: "TikTok — Luan 🎬", desc: "Roteiro + gravação · HCTE framework" },
    "pessoal-x": { time: "09:00", title: "X/Twitter — Luan 𝕏", desc: "Alpha + takes · Crypto Twitter BR" },
  };
  const agendaClient = activeClient ? CLIENT_PROFILES.find(c => c.id === activeClient) : null;
  const agendaColor = agendaClient?.color || "#8B5CF6";
  const agendaItem = activeClient ? agendaItems[activeClient] : agendaItems["aura"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{getGreeting()}, Luan</div>
          <div style={{ ...monoStyle, fontSize: 11, color: "#444", marginTop: 4 }}>{formatDate()}</div>
        </div>
        <div style={{ ...monoStyle, fontSize: 28, fontWeight: 700, color: "#E4E4E7" }}>{time}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${TRACKED_COINS.length}, 1fr)`, gap: 10, marginBottom: 20 }}>
        {TRACKED_COINS.map(coin => {
          const d = prices[coin.id]; const ch = d?.price_change_percentage_24h;
          return (
            <div key={coin.id} onClick={!d && !pricesLoading ? fetchPrices : undefined}
              style={{ ...cardStyle, cursor: !d && !pricesLoading ? "pointer" : "default" }}>
              <div style={{ ...monoStyle, fontSize: 11, color: "#555" }}>{coin.symbol}{coin.isFiat ? "/BRL" : ""}</div>
              <div style={{ ...monoStyle, fontSize: 18, fontWeight: 700, marginTop: 4, color: "#E4E4E7" }}>
                {d ? formatPrice(d.current_price, d.isBRL) : pricesLoading ? "⏳" : "—"}
              </div>
              {ch !== undefined && (
                <span style={{ ...monoStyle, fontSize: 12, color: ch >= 0 ? "#10B981" : "#EF4444", marginTop: 4, display: "inline-block" }}>
                  {formatChange(ch)}
                </span>
              )}
              {!d && !pricesLoading && <div style={{ ...monoStyle, fontSize: 9, color: "#333", marginTop: 2 }}>toque p/ retry</div>}
            </div>
          );
        })}
      </div>

      {agendaItem && (
        <div style={{ ...cardStyle, marginBottom: 20, padding: "14px 18px", borderColor: agendaColor + "22" }}>
          <div style={{ ...monoStyle, fontSize: 10, color: agendaColor, letterSpacing: "0.12em", marginBottom: 8 }}>
            {activeClient ? "FOCO DO DIA" : "PRÓXIMO COMPROMISSO"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ ...monoStyle, fontSize: 18, fontWeight: 700, color: agendaColor }}>{agendaItem.time}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#D4D4D8" }}>{agendaItem.title}</div>
              <div style={{ ...monoStyle, fontSize: 11, color: "#444" }}>{agendaItem.desc}</div>
            </div>
          </div>
        </div>
      )}

      {phase === "idle" && (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <button onClick={runAll} style={{ ...primaryBtnStyle(false), padding: "16px 40px", fontSize: 15 }}>
            {activeClient ? `⚡ Briefing ${CLIENT_PROFILES.find(c => c.id === activeClient)?.name}` : "⚡ Gerar Briefing Completo"}
          </button>
          <div style={{ ...monoStyle, fontSize: 11, color: "#333", marginTop: 12 }}>
            {activeClient ? "Contexto de mercado + tarefas + oportunidades + horários" : "Mercado + agenda + oportunidades + sugestões por cliente"}
          </div>
        </div>
      )}

      {isRunning && (
        <div style={{ ...cardStyle, borderColor: "#0052FF22", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <LoadingDot color="#0052FF" text={phase === "prices" ? "Atualizando preços..." : phase === "briefing" ? "Gerando briefing..." : "Gerando sugestões por cliente..."} />
          <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
            {["prices","briefing","suggestions"].map((p,i) => (
              <div key={p} style={{ width: 44, height: 3, borderRadius: 2, background: ["prices","briefing","suggestions"].indexOf(phase) >= i ? "#0052FF" : "#111", transition: "all 0.4s" }} />
            ))}
          </div>
        </div>
      )}

      {error && <div style={{ ...cardStyle, borderColor: "#EF444433", marginBottom: 20, color: "#EF4444", fontSize: 13 }}>⚠️ {error}</div>}

      {briefing && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={labelStyle}>{activeClient ? `BRIEFING — ${CLIENT_PROFILES.find(c => c.id === activeClient)?.name?.toUpperCase()}` : "BRIEFING DO DIA"}</span>
            <button onClick={() => { navigator.clipboard.writeText(briefing); setBriefCopied(true); setTimeout(() => setBriefCopied(false), 1500); }} style={{ ...smallBtnStyle, color: briefCopied ? "#10B981" : "#555" }}>{briefCopied ? "✓ Copiado!" : "📋 Copiar"}</button>
          </div>
          <div style={{ ...cardStyle, borderColor: "#0052FF18" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #0052FF, #8B5CF6)", opacity: 0.5 }} />
            <div style={{ color: "#ccc", fontSize: 14, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{briefing}</div>
          </div>
        </div>
      )}

      {(Object.keys(suggestions).length > 0 || Object.values(sugLoading).some(v => v)) && (
        <div>
          <div style={labelStyle}>SUGESTÕES POR CLIENTE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 12 }}>
            {(activeClient ? CLIENT_PROFILES.filter(c => c.id === activeClient) : CLIENT_PROFILES.slice(0, 5)).map(client => (
              <OutputCard key={client.id} client={client} content={suggestions[client.id]} loading={sugLoading[client.id]} />
            ))}
          </div>
        </div>
      )}

      {phase === "done" && briefing && (
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <div style={{ ...monoStyle, fontSize: 12, color: "#10B981" }}>✓ BRIEFING COMPLETO</div>
          <div style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
            {activeClient ? `${CLIENT_PROFILES.find(c => c.id === activeClient)?.name} atualizado. Bora executar. 🎯` : "Tudo atualizado. Bora executar. 🚀"}
          </div>
          <button onClick={() => { setPhase("idle"); setBriefing(null); setSuggestions({}); setError(null); }} style={{ ...smallBtnStyle, marginTop: 14 }}>↻ Rodar novamente</button>
        </div>
      )}
    </div>
  );
}
