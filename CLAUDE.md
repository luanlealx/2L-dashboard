# 2L Agency OS

Operational dashboard for a social media agency. Centralizes client management, briefings, content planning, and AI-assisted workflows.

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Hosting:** Vercel (serverless functions in `api/`)
- **AI:** Anthropic API (Claude)
- **Database/CMS:** Notion API

## File Structure

```
src/
  modules/       # Feature modules (ClientBase, BriefingDiario, Reports…)
  hooks/         # Custom React hooks
  tokens.js      # Design tokens (colors, spacing, typography)
api/
  claude.js      # Serverless function — Anthropic proxy
  notion.js      # Serverless function — Notion proxy
```

## Rules

- **Never modify `api/claude.js`** without explicitly warning the user first.
- **Always use inline styles with tokens from `tokens.js`** — do not hardcode color/spacing values.
- **Never use `localStorage`** — all state is either in-memory, in Notion, or in URL params.
- Keep components inside their module folder; avoid cross-module imports where possible.

## Active Clients

| Client | Notes |
|---|---|
| ZeroLedger | |
| Base Brasil | |
| ACO Labs | |
| AURA Mode | |

## Planned Modules

- **Briefing Diário** — daily AI briefing with web search integration
- **Reports** — automated client performance reports
