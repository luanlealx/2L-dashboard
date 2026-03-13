// Wrapper for all Claude API calls via the secure serverless proxy

export const callClaude = async (messages, maxTokens = 2000, timeoutMs = 60000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        messages,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const err = await res.text();
      console.error("Claude API error:", res.status, err);
      return `⚠️ Erro na API (${res.status})`;
    }
    const data = await res.json();
    const text =
      data.content
        ?.filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n") || "";
    if (!text && data.error)
      return `⚠️ ${data.error.message || "Erro desconhecido"}`;
    return text || "⚠️ Resposta vazia da API";
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === "AbortError")
      return "⚠️ Timeout — a API demorou demais. Tente novamente.";
    console.error("callClaude error:", e);
    return `⚠️ Erro: ${e.message}`;
  }
};

// Variant for calls that need web_search tool
export const callClaudeWithSearch = async (messages, maxTokens = 2000) => {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Claude search API error:", res.status, err);
    return `⚠️ Erro na API (${res.status})`;
  }
  const data = await res.json();
  const text =
    data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n") || "";
  if (!text && data.error) return `⚠️ ${data.error.message || "Erro desconhecido"}`;
  return text || "⚠️ Resposta vazia da API";
};
