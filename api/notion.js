// /api/notion.js — Vercel Edge Function
// Proxy seguro para a Notion API

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return json({ error: "NOTION_TOKEN not configured" }, 500);
  }

  const { endpoint, method = "GET", body } = await req.json();
  if (!endpoint) {
    return json({ error: "Missing endpoint" }, 400);
  }

  try {
    const notionRes = await fetch(`https://api.notion.com/v1/${endpoint}`, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const data = await notionRes.json();
    return json(data, notionRes.status);
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
