# 🚀 Agency Autopilot — Agência 2L

Dashboard operacional com IA para gestão de clientes da agência.

## Módulos

- **Content Multiplier** — Transforma 1 conteúdo em posts para múltiplas plataformas
- **Morning Briefing** — Briefing diário com preços crypto + tarefas prioritárias
- **Delivery Board** — Kanban com drag-and-drop para gestão de entregas
- **Report Generator** — Upload de métricas → relatório mensal automático com IA

## Stack

- **Frontend:** React 18 + Vite
- **Backend:** Vercel Serverless Functions (proxy seguro para Anthropic API)
- **Deploy:** Vercel (free tier)
- **Storage:** localStorage (dados ficam no navegador)

---

## 🚀 Deploy em 5 minutos

### 1. Crie um repo no GitHub

1. Vá em [github.com/new](https://github.com/new)
2. Nome: `agency-autopilot` (privado)
3. **NÃO** inicialize com README
4. Clique "Create repository"

### 2. Suba os arquivos

No terminal (ou pelo GitHub web):

```bash
cd agency-autopilot-vercel
git init
git add .
git commit -m "🚀 Initial deploy"
git branch -M main
git remote add origin https://github.com/SEU_USER/agency-autopilot.git
git push -u origin main
```

**Alternativa sem terminal:** No GitHub, clique "uploading an existing file" e arraste todos os arquivos.

### 3. Deploy na Vercel

1. Vá em [vercel.com](https://vercel.com) → Sign up com GitHub
2. Clique **"Add New Project"**
3. Selecione o repo `agency-autopilot`
4. Framework: **Vite** (auto-detecta)
5. Em **Environment Variables**, adicione:
   - Name: `ANTHROPIC_API_KEY`
   - Value: sua API key (começa com `sk-ant-`)
6. Clique **Deploy**

### 4. Pronto! 🎉

Seu dashboard estará em: `https://agency-autopilot-SEU_USER.vercel.app`

---

## 🔄 Como atualizar

1. Peça a mudança pro Claude
2. Claude gera o arquivo `App.jsx` atualizado
3. Substitua `src/App.jsx` no GitHub
4. Vercel auto-deploya em ~15 segundos

---

## 🔐 Segurança

- A API key da Anthropic fica **apenas no servidor** (variável de ambiente)
- O frontend chama `/api/claude` → serverless function adiciona a key → forward para Anthropic
- Nenhuma credencial exposta no código fonte

---

## 📁 Estrutura

```
agency-autopilot-vercel/
├── api/
│   └── claude.js          # Proxy serverless (API key segura)
├── src/
│   ├── main.jsx           # Entry point React
│   └── App.jsx            # Dashboard completo (2700+ linhas)
├── public/                # Assets estáticos (vazio por ora)
├── index.html             # HTML base
├── package.json           # Dependências
├── vite.config.js         # Config Vite + proxy dev
├── vercel.json            # Config deploy
├── .env.example           # Template de variáveis
└── .gitignore
```

## Dev local (opcional)

```bash
npm install
cp .env.example .env.local  # Preencha com sua key
npm run dev                  # http://localhost:5173
```
