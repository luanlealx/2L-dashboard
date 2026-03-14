// /api/claude.js — Vercel Edge Function
// Proxy seguro para a API da Anthropic
// Edge Runtime: sem limite de 10s, suporta streaming nativo

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
  }

  try {
    const { stream, ...body } = await req.json();

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(stream ? { ...body, stream: true } : body),
    });

    // ── Streaming: repassa o ReadableStream direto ──────────────────────────
    if (stream) {
      if (!upstream.ok) {
        return new Response(await upstream.text(), { status: upstream.status });
      }
      return new Response(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // ── Padrão: retorna JSON ────────────────────────────────────────────────
    const data = await upstream.json();
    return json(data, upstream.status);

  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
