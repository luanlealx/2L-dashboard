import { useState } from "react";
import { C, label } from "./tokens.js";
import { useClients } from "./hooks/useClients.js";

const BRIEFING_DB = "6bf4b5f1-8b63-4d76-9552-f48adb9393d1";

function todayBR() {
  return new Date().toLocaleDateString("pt-BR");
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// Notion text blocks are limited to 2000 chars
function toNotionBlocks(text) {
  const blocks = [];
  let remaining = text;
  while (remaining.length > 0) {
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ text: { content: remaining.slice(0, 1990) } }],
      },
    });
    remaining = remaining.slice(1990);
  }
  return blocks;
}

export default function DailyBriefing() {
  const { clients, loading: clientsLoading } = useClients();
  const [selectedId, setSelectedId]   = useState("");
  const [briefing,   setBriefing]     = useState("");
  const [generating, setGenerating]   = useState(false);
  const [saving,     setSaving]       = useState(false);
  const [saved,      setSaved]        = useState(false);
  const [error,      setError]        = useState("");

  const client = clients.find(c => c.id === selectedId) ?? null;

  function reset() {
    setBriefing("");
    setSaved(false);
    setError("");
  }

  async function generateBriefing() {
    if (!client) return;
    setGenerating(true);
    reset();

    const system = `Você é um analista de inteligência de mercado especializado em social media para o nicho: ${client.nicho || client.name}.

${client.systemContext}

Use as ferramentas de web search disponíveis para buscar informações reais de hoje antes de responder.

Estruture sua resposta EXATAMENTE com estas 4 seções (use os títulos exatos):

## O que está acontecendo
Notícias relevantes do nicho nas últimas 24h, movimentos do ecossistema, o que está sendo discutido.

## Ângulos de conteúdo para hoje
3 a 5 ângulos concretos de posts que fazem sentido dado o contexto do dia. Seja específico — não genérico.

## O que instruir para o time
Orientações práticas para a equipe de produção: tom, foco, o que evitar hoje.

## Ação imediata
1 coisa específica para fazer agora — o post mais urgente ou a oportunidade mais quente do dia.`;

    const userMessage = `Faz web search agora e gera o briefing de hoje para ${client.name}.

Nicho: ${client.nicho || "não especificado"}
Plataformas: ${client.plataformas || "não especificadas"}
Data: ${todayBR()}

Busca obrigatória:
1. Notícias do nicho "${client.nicho}" nas últimas 24h
2. Trending no X/Twitter nesse ecossistema hoje
3. O que projetos ou concorrentes similares estão postando agora`;

    try {
      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          stream: true,
          system,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (!response.ok) throw new Error(`API error ${response.status}: ${await response.text()}`);

      const reader = response.body.getReader();
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
              setBriefing(prev => prev + evt.delta.text);
            }
            if (evt.type === "error") {
              throw new Error(evt.error?.message || "Stream error");
            }
          } catch (parseErr) {
            if (parseErr.message !== "Stream error") continue;
            throw parseErr;
          }
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function saveToNotion() {
    if (!briefing || !client) return;
    setSaving(true);
    setError("");

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
              Name: {
                title: [{ text: { content: `Briefing ${client.name} ${todayBR()}` } }],
              },
              Cliente: {
                rich_text: [{ text: { content: client.name } }],
              },
              Data: {
                date: { start: todayISO() },
              },
            },
            children: toNotionBlocks(briefing),
          },
        }),
      });

      if (!res.ok) throw new Error(`Notion error ${res.status}: ${await res.text()}`);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "40px 48px", maxWidth: 860, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...label, color: C.brand }}>Daily Briefing</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: C.textBright, margin: 0 }}>
          Inteligência do dia
        </h1>
        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 6 }}>
          Claude faz web search e gera o contexto operacional do dia para o cliente selecionado.
        </p>
      </div>

      {/* Client selector + button */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 32 }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...label, color: C.textMuted }}>Cliente</div>
          <select
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); reset(); }}
            disabled={clientsLoading}
            style={{
              width: "100%", padding: "10px 14px",
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 8, color: selectedId ? C.textBright : C.textMuted,
              fontSize: 14, fontFamily: "inherit", cursor: "pointer", outline: "none",
            }}
          >
            <option value="">Selecionar cliente…</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={generateBriefing}
          disabled={!selectedId || generating}
          style={{
            padding: "10px 22px", borderRadius: 8, border: "none",
            background: !selectedId || generating ? C.border : C.brand,
            color: !selectedId || generating ? C.textMuted : "#fff",
            fontSize: 14, fontWeight: 600, fontFamily: "inherit",
            cursor: !selectedId || generating ? "not-allowed" : "pointer",
            whiteSpace: "nowrap", transition: "background 0.15s",
          }}
        >
          {generating ? "Buscando…" : "Gerar Briefing do Dia"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: "12px 16px", borderRadius: 8, marginBottom: 20,
          background: C.errorBg, border: `1px solid ${C.errorBorder}`,
          color: C.errorText, fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* Searching indicator (before first text arrives) */}
      {generating && !briefing && (
        <div style={{
          padding: "40px 24px", borderRadius: 12, textAlign: "center",
          background: C.surface, border: `1px solid ${C.border}`,
          color: C.textMuted, fontSize: 14,
        }}>
          <div style={{ fontSize: 30, marginBottom: 12 }}>🔍</div>
          Fazendo web search para{" "}
          <strong style={{ color: C.textBright }}>{client?.name}</strong>…
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 8 }}>
            Buscando notícias, trends e concorrentes…
          </div>
        </div>
      )}

      {/* Output (shows during streaming too) */}
      {briefing && (
        <div>
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "28px 32px", marginBottom: 16,
          }}>
            {/* Output header */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 20,
              paddingBottom: 16, borderBottom: `1px solid ${C.border}`,
            }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.textBright }}>
                  {client?.emoji} {client?.name}
                </span>
                <span style={{
                  fontSize: 11, color: C.textDim, marginLeft: 10,
                  fontFamily: "monospace", letterSpacing: "0.05em",
                }}>
                  {todayBR()}
                </span>
              </div>
              <button
                onClick={() => navigator.clipboard?.writeText(briefing)}
                style={{
                  padding: "5px 12px", borderRadius: 6,
                  border: `1px solid ${C.border}`, background: "none",
                  color: C.textMuted, fontSize: 12, fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                Copiar
              </button>
            </div>

            <pre style={{
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              fontSize: 13.5, lineHeight: 1.8, color: C.text,
              fontFamily: "inherit", margin: 0,
            }}>
              {briefing}
              {generating && (
                <span style={{
                  display: "inline-block", width: 2, height: "1em",
                  background: C.brand, marginLeft: 2,
                  verticalAlign: "text-bottom",
                  animation: "blink 1s step-end infinite",
                }} />
              )}
            </pre>
          </div>

          {/* Save button — only after stream completes */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", visibility: generating ? "hidden" : "visible" }}>
            <button
              onClick={saveToNotion}
              disabled={saving || saved}
              style={{
                padding: "10px 22px", borderRadius: 8,
                background: saved ? "rgba(34,197,94,0.12)" : saving ? C.border : C.brandDim,
                border: `1px solid ${saved ? "rgba(34,197,94,0.3)" : saving ? C.border : C.brandBorder}`,
                color: saved ? "#4ade80" : saving ? C.textMuted : C.brand,
                fontSize: 14, fontWeight: 600, fontFamily: "inherit",
                cursor: saving || saved ? "not-allowed" : "pointer",
                transition: "all 0.15s",
              }}
            >
              {saved ? "✓ Salvo no Notion" : saving ? "Salvando…" : "Salvar no Notion"}
            </button>

            {saved && (
              <span style={{ fontSize: 12, color: C.textDim }}>
                Briefing {client?.name} {todayBR()} salvo.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
