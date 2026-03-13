export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "NOTION_TOKEN not configured" });
  }

  const { endpoint, method = "GET", body } = req.body ?? {};
  if (!endpoint) {
    return res.status(400).json({ error: "Missing endpoint" });
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
    return res.status(notionRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
