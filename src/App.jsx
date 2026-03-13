import { useState } from "react";

const CLIENTS = [
  { id: "zeroledger", name: "ZeroLedger", emoji: "⛓" },
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

// Renders inline **bold** text
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="text-[#E4E4E7] font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}

function BriefingContent({ text }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h3
              key={i}
              className="text-[#E4E4E7] font-semibold text-base mt-6 first:mt-0 mb-2 pb-1 border-b border-[#14141e]"
            >
              {line.replace("## ", "")}
            </h3>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={i} className="flex gap-2 text-[#A1A1AA] pl-1">
              <span className="text-[#0052FF] shrink-0 mt-0.5">›</span>
              <span>{renderInline(line.replace(/^[-•]\s/, ""))}</span>
            </div>
          );
        }
        if (line.match(/^\d+\.\s/)) {
          return (
            <div key={i} className="flex gap-2 text-[#A1A1AA] pl-1">
              <span className="text-[#0052FF] shrink-0 font-mono text-xs mt-0.5 w-4">
                {line.match(/^\d+/)?.[0]}.
              </span>
              <span>{renderInline(line.replace(/^\d+\.\s/, ""))}</span>
            </div>
          );
        }
        if (line.trim() === "") {
          return <div key={i} className="h-1" />;
        }
        return (
          <p key={i} className="text-[#A1A1AA]">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

export default function App() {
  const [client, setClient] = useState(CLIENTS[0]);
  const [metrics, setMetrics] = useState("");
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      const text = data?.content?.[0]?.text ?? "Resposta vazia.";
      setBriefing(text);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen bg-[#08080D] text-[#D4D4D8]">
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0052FF] to-[#8B5CF6] flex items-center justify-center text-white text-[11px] font-bold font-mono">
              2L
            </div>
            <span className="text-[11px] font-mono tracking-widest text-[#333] uppercase">
              Agency Autopilot
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-[#E4E4E7]">Morning Briefing</h1>
          <p className="text-sm text-[#555] mt-1 capitalize">{today}</p>
        </div>

        {/* Client selector */}
        <div className="mb-6">
          <label className="block text-[11px] font-mono tracking-widest text-[#444] uppercase mb-3">
            Cliente
          </label>
          <div className="flex gap-2">
            {CLIENTS.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setClient(c);
                  setBriefing(null);
                  setError(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                  client.id === c.id
                    ? "bg-[#0052FF14] border border-[#0052FF44] text-[#E4E4E7]"
                    : "bg-[#0f0f18] border border-[#14141e] text-[#555] hover:text-[#999] hover:border-[#222]"
                }`}
              >
                <span>{c.emoji}</span>
                <span className="font-medium">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Metrics textarea */}
        <div className="mb-6">
          <label className="block text-[11px] font-mono tracking-widest text-[#444] uppercase mb-3">
            Métricas da semana
          </label>
          <textarea
            value={metrics}
            onChange={(e) => setMetrics(e.target.value)}
            placeholder={"Cole aqui as métricas:\n\nEx: alcance 12k (+8%), engajamento 4.2%, 8 leads, 2 fechamentos, CPL R$32..."}
            rows={7}
            className="w-full bg-[#0f0f18] border border-[#14141e] rounded-xl px-4 py-3 text-sm text-[#D4D4D8] placeholder-[#2a2a3a] resize-none transition-colors focus:border-[#0052FF44] focus:bg-[#0a0a14]"
          />
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !metrics.trim()}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all
            bg-[#0052FF] hover:bg-[#0047E0] text-white
            disabled:bg-[#0f0f18] disabled:text-[#333] disabled:border disabled:border-[#14141e] disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Gerando briefing...
            </span>
          ) : (
            "Gerar Briefing"
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Briefing output */}
        {briefing && (
          <div className="mt-8 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono tracking-widest text-[#0052FF] uppercase">
                Briefing — {client.name}
              </span>
              <button
                onClick={() => setBriefing(null)}
                className="text-xs text-[#333] hover:text-[#666] transition-colors"
              >
                limpar
              </button>
            </div>
            <div className="bg-[#0f0f18] border border-[#14141e] rounded-xl p-6">
              <BriefingContent text={briefing} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
