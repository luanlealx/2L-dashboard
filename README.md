# 2L Agency OS

Operational dashboard for a social media agency — AI-assisted workflows, client management, and content production.

## Modules

- **Morning Briefing** — Daily briefing with crypto prices and priority tasks
- **Content Multiplier** — Transforms 1 piece of content into posts for multiple platforms
- **Client Base** — Client profiles synced to Notion (editable, with platform/status tracking)

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Serverless:** Vercel Functions (secure proxy for external APIs)
- **AI:** Anthropic API (Claude)
- **Storage:** Notion API (no localStorage)

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key (starts with `sk-ant-`) |
| `NOTION_TOKEN` | Notion integration token |

## File Structure

```
├── api/
│   ├── claude.js       # Anthropic proxy (serverless)
│   └── notion.js       # Notion proxy (serverless)
├── src/
│   ├── modules/        # Feature modules
│   ├── hooks/          # Custom React hooks
│   ├── tokens.js       # Design tokens
│   └── main.jsx        # Entry point
├── index.html
├── vite.config.js
└── vercel.json
```

## Local Dev

```bash
npm install
cp .env.example .env.local  # fill in your keys
npm run dev                  # http://localhost:5173
```

## Security

- API keys live only in server-side environment variables
- Frontend calls `/api/claude` and `/api/notion` — keys never exposed in client code
