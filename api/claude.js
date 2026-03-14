// /api/claude.js — Vercel Serverless Function
// Proxy seguro para a API da Anthropic
// A API key fica em variável de ambiente, nunca exposta no frontend

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    // `stream` é flag interna — remove antes de mandar pra Anthropic
    const { stream, ...body } = req.body;

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(stream ? { ...body, stream: true } : body),
    });

    // ── Streaming mode ────────────────────────────────────────────────────────
    if (stream) {
      if (!upstream.ok) {
        const err = await upstream.text();
        return res.status(upstream.status).send(err);
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } finally {
        res.end();
      }
      return;
    }

    // ── Standard (non-streaming) mode ─────────────────────────────────────────
    const data = await upstream.json();
    return res.status(upstream.status).json(data);

  } catch (error) {
    console.error("Proxy error:", error);
    return res.status(500).json({ error: error.message });
  }
}
