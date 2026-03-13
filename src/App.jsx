import { useState } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────

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

// ─── Icons ───────────────────────────────────────────────────────────────────

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

// ─── Briefing renderer ───────────────────────────────────────────────────────

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="text-gray-900 dark:text-[#E4E4E7] font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : part
  );
}

function BriefingContent({ text }) {
  return (
    <div className="space-y-0.5 text-sm leading-relaxed">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className="text-gray-900 dark:text-[#E4E4E7] font-semibold text-[15px] mt-7 first:mt-0 mb-2.5 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-[#0052FF] shrink-0" />
              {line.replace("## ", "")}
            </h3>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={i} className="flex gap-2.5 text-gray-600 dark:text-[#A1A1AA] py-0.5 pl-3">
              <span className="text-[#0052FF] shrink-0 mt-0.5 font-bold text-xs">›</span>
              <span>{renderInline(line.replace(/^[-•]\s/, ""))}</span>
            </div>
          );
        }
        if (line.match(/^\d+\.\s/)) {
          return (
            <div key={i} className="flex gap-2.5 text-gray-600 dark:text-[#A1A1AA] py-0.5 pl-3">
              <span className="text-[#0052FF] shrink-0 font-mono text-xs mt-0.5 w-3">
                {line.match(/^\d+/)?.[0]}.
              </span>
              <span>{renderInline(line.replace(/^\d+\.\s/, ""))}</span>
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-1.5" />;
        return (
          <p key={i} className="text-gray-600 dark:text-[#A1A1AA] pl-3">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [isDark,   setIsDark]   = useState(true);
  const [client,   setClient]   = useState(CLIENTS[0]);
  const [metrics,  setMetrics]  = useState("");
  const [briefing, setBriefing] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

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

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-gray-50 dark:bg-[#08080D] transition-colors duration-200 font-[Outfit,sans-serif]">
        <div className="max-w-[640px] mx-auto px-6 py-12">

          {/* ── Header ── */}
          <div className="flex items-start justify-between mb-12">
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0052FF] to-[#8B5CF6] flex items-center justify-center text-white text-[10px] font-bold tracking-tight">
                  2L
                </div>
                <span className="text-[10px] font-mono tracking-[0.2em] text-gray-400 dark:text-[#333] uppercase">
                  Agency Autopilot
                </span>
              </div>
              <h1 className="text-[28px] font-semibold tracking-tight text-gray-950 dark:text-[#F4F4F5] leading-none">
                Morning Briefing
              </h1>
              <p className="text-sm text-gray-400 dark:text-[#444] mt-2 capitalize">{today}</p>
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              title={isDark ? "Modo claro" : "Modo escuro"}
              className="mt-0.5 w-8 h-8 flex items-center justify-center rounded-lg transition-all
                bg-white dark:bg-[#0f0f18]
                border border-gray-200 dark:border-[#1c1c28]
                text-gray-400 dark:text-[#555]
                hover:text-gray-700 dark:hover:text-[#A1A1AA]
                hover:border-gray-300 dark:hover:border-[#2a2a3a]
                shadow-sm"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>

          {/* ── Client selector ── */}
          <div className="mb-8">
            <label className="block text-[10px] font-mono tracking-[0.18em] text-gray-400 dark:text-[#333] uppercase mb-3">
              Cliente
            </label>
            <div className="flex gap-2">
              {CLIENTS.map((c) => {
                const active = client.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => { setClient(c); setBriefing(null); setError(null); }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "bg-[#0052FF] text-white shadow-lg shadow-[#0052FF]/30 scale-[1.02]"
                        : "bg-white dark:bg-[#0f0f18] border border-gray-200 dark:border-[#1c1c28] text-gray-500 dark:text-[#555] hover:text-gray-800 dark:hover:text-[#A1A1AA] hover:border-gray-300 dark:hover:border-[#2a2a3a] shadow-sm"
                    }`}
                  >
                    <span className="text-base leading-none">{c.emoji}</span>
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Metrics textarea ── */}
          <div className="mb-7">
            <label className="block text-[10px] font-mono tracking-[0.18em] text-gray-400 dark:text-[#333] uppercase mb-3">
              Métricas da semana
            </label>
            <textarea
              value={metrics}
              onChange={(e) => setMetrics(e.target.value)}
              placeholder={"Cole aqui as métricas da semana:\n\nEx: alcance 12k (+8%), engajamento 4.2%,\n8 leads, 2 fechamentos, CPL R$32..."}
              rows={7}
              className="w-full rounded-xl px-4 py-3.5 text-[15px] leading-relaxed resize-none transition-all
                bg-white dark:bg-[#0b0b14]
                border border-gray-200 dark:border-[#1c1c28]
                text-gray-800 dark:text-[#D4D4D8]
                placeholder-gray-300 dark:placeholder-[#252535]
                hover:border-gray-300 dark:hover:border-[#252535]
                focus:border-[#0052FF] dark:focus:border-[#0052FF80]
                focus:ring-3 focus:ring-[#0052FF]/10
                shadow-sm"
            />
          </div>

          {/* ── Generate button ── */}
          <button
            onClick={handleGenerate}
            disabled={loading || !metrics.trim()}
            className="w-full py-3.5 rounded-xl text-[15px] font-semibold transition-all
              bg-[#0052FF] hover:bg-[#0047E0] active:scale-[0.99]
              text-white shadow-lg shadow-[#0052FF]/30 hover:shadow-[#0052FF]/40
              disabled:bg-gray-100 dark:disabled:bg-[#0f0f18]
              disabled:text-gray-300 dark:disabled:text-[#252535]
              disabled:border disabled:border-gray-200 dark:disabled:border-[#1c1c28]
              disabled:shadow-none disabled:cursor-not-allowed disabled:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Gerando briefing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Gerar Briefing
                <ArrowIcon />
              </span>
            )}
          </button>

          {/* ── Error ── */}
          {error && (
            <div className="mt-4 p-4 rounded-xl text-sm
              bg-red-50 dark:bg-red-950/30
              border border-red-200 dark:border-red-900/50
              text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* ── Briefing output ── */}
          {briefing && (
            <div className="mt-10 animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0052FF]" />
                  <span className="text-[10px] font-mono tracking-[0.18em] text-[#0052FF] uppercase">
                    Briefing — {client.name}
                  </span>
                </div>
                <button
                  onClick={() => setBriefing(null)}
                  className="text-xs text-gray-300 dark:text-[#2a2a3a] hover:text-gray-500 dark:hover:text-[#666] transition-colors"
                >
                  limpar
                </button>
              </div>
              <div className="rounded-xl p-6 shadow-sm
                bg-white dark:bg-[#0b0b14]
                border border-gray-200 dark:border-[#1c1c28]">
                <BriefingContent text={briefing} />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
