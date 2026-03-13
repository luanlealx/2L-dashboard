import { useState, useEffect } from "react";

const DATABASE_ID = "ee27675278c2412d842df1d8415cb37c";

const EMOJI_MAP = {
  "ZeroLedger":  "⛓",
  "Base Brasil": "🏔",
  "ACO Labs":    "🤖",
  "AURA Mode":   "✨",
};

const FALLBACK_CLIENTS = [
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

function getProp(props, ...keys) {
  for (const key of keys) {
    if (props[key]) return props[key];
  }
  return null;
}

function getText(prop) {
  if (!prop) return "";
  if (prop.type === "title")       return prop.title.map(t => t.plain_text).join("").trim();
  if (prop.type === "rich_text")   return prop.rich_text.map(t => t.plain_text).join("").trim();
  if (prop.type === "select")      return prop.select?.name ?? "";
  if (prop.type === "status")      return prop.status?.name ?? "";
  if (prop.type === "multi_select") return prop.multi_select.map(s => s.name).join(", ");
  return "";
}

function buildSystemContext(c) {
  const parts = [];
  if (c.nicho)      parts.push(`Cliente: ${c.name} — ${c.nicho}.`);
  else              parts.push(`Cliente: ${c.name}.`);
  if (c.tomDeVoz)   parts.push(`Tom: ${c.tomDeVoz}.`);
  if (c.objetivos)  parts.push(`Objetivos: ${c.objetivos}.`);
  if (c.restricoes) parts.push(`⚠ Restrições: ${c.restricoes}.`);
  if (c.idioma)     parts.push(`Idioma: ${c.idioma}.`);
  return parts.join("\n");
}

function parseClient(page) {
  const props = page.properties ?? {};
  const name = getText(getProp(props, "Nome", "Name", "name")) || "Cliente";
  const nicho      = getText(getProp(props, "Nicho", "nicho"));
  const plataformas = getText(getProp(props, "Plataformas", "plataformas"));
  const idioma     = getText(getProp(props, "Idioma", "idioma"));
  const tomDeVoz   = getText(getProp(props, "Tom de Voz", "Tom", "tom"));
  const restricoes = getText(getProp(props, "Restrições", "Restricoes", "restricoes"));
  const objetivos  = getText(getProp(props, "Objetivos", "objetivos"));

  const client = { name, nicho, plataformas, idioma, tomDeVoz, restricoes, objetivos };

  return {
    id: page.id,
    name,
    emoji: EMOJI_MAP[name] ?? "🏢",
    systemContext: buildSystemContext(client),
  };
}

export function useClients() {
  const [clients, setClients] = useState(FALLBACK_CLIENTS);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchClients() {
      try {
        const res = await fetch("/api/notion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: `databases/${DATABASE_ID}/query`,
            method: "POST",
            body: { page_size: 20 },
          }),
        });

        if (!res.ok) throw new Error(`Notion API error ${res.status}`);

        const data = await res.json();
        const parsed = (data.results ?? []).map(parseClient).filter(c => c.name);

        if (!cancelled && parsed.length > 0) {
          setClients(parsed);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
        // Keep FALLBACK_CLIENTS — no action needed
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchClients();
    return () => { cancelled = true; };
  }, []);

  return { clients, loading, error };
}
