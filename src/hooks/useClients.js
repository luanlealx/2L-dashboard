import { useState, useEffect, useCallback } from "react";

const DATABASE_ID = "ee27675278c2412d842df1d8415cb37c";

const EMOJI_MAP = {
  "ZeroLedger":  "⛓",
  "Base Brasil": "🏔",
  "ACO Labs":    "🤖",
  "AURA Mode":   "✨",
};

// ─── Idioma per-platform helpers (also used by ClientBase) ────────────────────

export function parseIdiomaPerPlatform(text) {
  if (!text) return {};
  const result = {};
  text.split("|").forEach(pair => {
    const idx = pair.indexOf(":");
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      if (k && v) result[k] = v;
    }
  });
  return result;
}

export function serializeIdiomaPerPlatform(obj) {
  return Object.entries(obj || {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");
}

// ─── Fallback data ────────────────────────────────────────────────────────────

const FALLBACK_CLIENTS = [
  {
    id: "zeroledger",
    name: "ZeroLedger",
    emoji: "⛓",
    status: "Ativo",
    nicho: "Privacy payments em Base L2",
    plataformas: "X / Twitter, Farcaster",
    idioma: "English only",
    tomDeVoz: "Técnico mas acessível, evita jargão desnecessário",
    restricoes: `⚠ UK compliance: NUNCA usar "rewards", "earn", "referrals" ou "investment"`,
    objetivos: "Crescimento de comunidade técnica e adoção do protocolo",
    idiomaPorPlataforma: { "X / Twitter": "English only", "Farcaster": "English only" },
    systemContext: `Cliente: ZeroLedger — privacy payments em Base L2.
Tom: técnico mas acessível, evita jargão desnecessário.
⚠ RESTRIÇÃO CRÍTICA (UK compliance): NUNCA usar as palavras "rewards", "earn", "referrals" ou "investment" em nenhuma circunstância, em nenhum idioma.
Idioma: escreva sempre em inglês (English only — no exceptions).`,
  },
  {
    id: "base-brasil",
    name: "Base Brasil",
    emoji: "🏔",
    status: "Ativo",
    nicho: "Ecossistema Base no Brasil",
    plataformas: "Instagram, X / Twitter, LinkedIn",
    idioma: "Português brasileiro",
    tomDeVoz: "Educativo, animado e próximo do público cripto brasileiro",
    restricoes: "",
    objetivos: "Educar e crescer a comunidade cripto BR, do iniciante ao avançado",
    idiomaPorPlataforma: {
      "Instagram": "Português brasileiro",
      "X / Twitter": "Português brasileiro",
      "LinkedIn": "Português brasileiro",
    },
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
    status: "Ativo",
    nicho: "AI agents e automação",
    plataformas: "X / Twitter, LinkedIn",
    idioma: "English only",
    tomDeVoz: "Inovador, direto e orientado a resultados práticos",
    restricoes: "Sem hype vazio — foco em capacidades reais",
    objetivos: "Demonstrar capacidades reais de automação e agentes de IA",
    idiomaPorPlataforma: { "X / Twitter": "English only", "LinkedIn": "English only" },
    systemContext: `Cliente: ACO Labs — AI agents e automação.
Tom: inovador, direto e orientado a resultados práticos.
Foco: demonstrar capacidades reais de automação e agentes de IA, sem hype vazio.
Idioma: escreva sempre em inglês (English only — no exceptions).`,
  },
  {
    id: "aura-mode",
    name: "AURA Mode",
    emoji: "✨",
    status: "Ativo",
    nicho: "IA generativa para criadores BR",
    plataformas: "Instagram, X / Twitter",
    idioma: "Português brasileiro",
    tomDeVoz: "Inspiracional, próximo e criativo",
    restricoes: "",
    objetivos: "Empoderar criadores de conteúdo brasileiros com IA no processo criativo",
    idiomaPorPlataforma: {
      "Instagram": "Português brasileiro",
      "X / Twitter": "Português brasileiro",
    },
    systemContext: `Cliente: AURA Mode — IA generativa para criadores BR.
Tom: inspiracional, próximo e criativo.
Público: criadores de conteúdo brasileiros que usam (ou querem usar) IA no processo criativo.
Celebra a criatividade humana potencializada por IA.
Idioma: escreva sempre em português brasileiro.`,
  },
];

// ─── Notion parsing ───────────────────────────────────────────────────────────

function getProp(props, ...keys) {
  for (const key of keys) {
    if (props[key]) return props[key];
  }
  return null;
}

function getText(prop) {
  if (!prop) return "";
  if (prop.type === "title")        return prop.title.map(t => t.plain_text).join("").trim();
  if (prop.type === "rich_text")    return prop.rich_text.map(t => t.plain_text).join("").trim();
  if (prop.type === "select")       return prop.select?.name ?? "";
  if (prop.type === "status")       return prop.status?.name ?? "";
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
  const name       = getText(getProp(props, "Nome", "Name", "name")) || "Cliente";
  const nicho      = getText(getProp(props, "Nicho", "nicho"));
  const plataformas = getText(getProp(props, "Plataformas", "plataformas"));
  const idioma     = getText(getProp(props, "Idioma", "idioma"));
  const tomDeVoz   = getText(getProp(props, "Tom de Voz", "Tom", "tom"));
  const restricoes = getText(getProp(props, "Restrições", "Restricoes", "restricoes"));
  const objetivos  = getText(getProp(props, "Objetivos", "objetivos"));
  const status     = getText(getProp(props, "Status", "status")) || "Ativo";
  const idiomaPorPlataforma = parseIdiomaPerPlatform(
    getText(getProp(props, "Idioma por Plataforma", "idiomaPorPlataforma"))
  );

  return {
    id: page.id,
    name,
    emoji: EMOJI_MAP[name] ?? "🏢",
    status,
    nicho,
    plataformas,
    idioma,
    tomDeVoz,
    restricoes,
    objetivos,
    idiomaPorPlataforma,
    systemContext: buildSystemContext({ name, nicho, plataformas, idioma, tomDeVoz, restricoes, objetivos }),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useClients() {
  const [clients, setClients] = useState(FALLBACK_CLIENTS);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tick,    setTick]    = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

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
        console.log("[useClients] Notion response:", data);

        const parsed = (data.results ?? []).map(parseClient).filter(c => c.name);
        console.log("[useClients] Parsed clients:", parsed.map(c => ({ id: c.id, name: c.name })));

        if (!cancelled && parsed.length > 0) {
          setClients(parsed);
          setError(null);
        }
      } catch (err) {
        console.warn("[useClients] Notion fetch failed, using fallback:", err.message);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchClients();
    return () => { cancelled = true; };
  }, [tick]);

  return { clients, loading, error, refresh };
}
