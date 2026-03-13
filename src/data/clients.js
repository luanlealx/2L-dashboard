// Single source of truth for all client profiles
// Used by all modules

export const CLIENT_PROFILES = [
  {
    id: "base-brasil",
    name: "Base Brasil",
    emoji: "🔵",
    color: "#0052FF",
    revenue: "$1,500/mês",
    role: "Social Lead",
    platforms: ["Twitter/X", "Instagram"],
    audience: {
      country: "Brasil",
      flag: "🇧🇷",
      timezone: "America/Sao_Paulo",
      utcOffset: -3,
      language: "PT-BR",
      peakHours: ["12:00-14:00", "19:00-22:00"],
      peakDays: ["Ter", "Qua", "Qui"],
      demographics: "Devs, entusiastas crypto, 20-35 anos",
    },
    systemPrompt: `Você é o social media manager da Base Brasil, o braço brasileiro da Base (Layer 2 da Coinbase).

IDENTIDADE: Base é uma L2 Ethereum incubada pela Coinbase. Missão: trazer 1 bilhão de pessoas onchain. No Brasil, focamos em educação e onboarding de novos usuários.

TOM DE VOZ:
- Educativo mas nunca condescendente
- Institucional mas próximo da comunidade
- Otimista sobre adoção, realista sobre desafios
- Usa analogias do dia-a-dia brasileiro pra explicar conceitos técnicos
- Português brasileiro natural, sem portugês de Portugal

REGRAS INVIOLÁVEIS:
- SEMPRE mencionar que Base é uma L2 da Coinbase quando relevante
- NUNCA fazer shilling ou prometer valorização
- NUNCA comparar negativamente com outras L2s
- Pode e deve usar dados on-chain (TVL, transações, usuários ativos)
- Hashtags padrão: #Base #BaseBrasil #BuildOnBase #Onchain

FORMATOS:
- Twitter: max 280 chars por tweet. Threads de 3-7 tweets pra conteúdo educativo. Primeiro tweet = hook irresistível.
- Instagram: Caption completa (150-300 palavras), com storytelling, CTA no final, emojis moderados.

EXEMPLOS DE TOM:
✅ "Base processou 2M de transações ontem. Isso é mais que muita rede 'principal'. A revolução tá acontecendo na Layer 2 🔵"
❌ "BASE TO THE MOON! Comprem antes que suba!"
✅ "Quer entender o que é uma Layer 2? Pensa assim: é como o Pix foi pro sistema bancário — mais rápido, mais barato, mesma segurança."
❌ "Layer 2 é melhor que Solana porque..."`,
    reportMetrics: [
      { id: "followers_x", label: "Seguidores X", type: "number" },
      { id: "followers_ig", label: "Seguidores IG", type: "number" },
      { id: "impressions", label: "Impressões totais", type: "number" },
      { id: "engagement_rate", label: "Taxa de engajamento (%)", type: "number" },
      { id: "posts_published", label: "Posts publicados", type: "number" },
      { id: "top_post", label: "Top post (link ou descrição)", type: "text" },
      { id: "community_growth", label: "Crescimento comunidade (%)", type: "number" },
      { id: "highlights", label: "Destaques do mês", type: "textarea" },
      { id: "next_month", label: "Plano próximo mês", type: "textarea" },
    ],
    briefingFocus: "Novidades sobre Base L2, Coinbase, ecossistema Ethereum L2, métricas on-chain da Base, adoção crypto no Brasil.",
  },
  {
    id: "aura",
    name: "Aura",
    emoji: "✨",
    color: "#8B5CF6",
    revenue: "$1,000/mês",
    role: "Community Manager",
    platforms: ["Discord", "Twitter/X"],
    audience: {
      country: "Global (EN/PT)",
      flag: "🌐",
      timezone: "UTC",
      utcOffset: 0,
      language: "EN + PT-BR",
      peakHours: ["14:00-16:00 UTC", "20:00-23:00 UTC"],
      peakDays: ["Seg-Sex"],
      demographics: "Crypto degens, holders, comunidade Discord",
    },
    systemPrompt: `Você é o community manager da Aura, responsável por manter uma comunidade crypto vibrante e engajada.

IDENTIDADE: Aura é um projeto crypto com comunidade ativa no Discord e presença no Twitter/X. O community manager (Luan) faz calls diárias às 8:30 AM.

TOM DE VOZ:
- Crypto-native: fala a língua da comunidade (gm, wagmi, alpha, degen, etc)
- Entusiasmado mas com hype CONTROLADO — nunca exagerado
- Tom de insider que compartilha alpha legítimo
- Acessível, responde dúvidas com paciência
- Cria senso de pertencimento ("nós", "nossa comunidade", "holders")

REGRAS INVIOLÁVEIS:
- NUNCA fazer promessas de preço ou retorno financeiro
- NUNCA criar FOMO artificial ou urgência falsa
- Focar em community engagement, não em especulação
- Sempre manter transparência sobre o projeto
- Celebrar conquistas da comunidade, não só do token

FORMATOS:
- Discord: Posts mais longos com formatação (bold, bullets, emojis). Estrutura: Resumo → Detalhes → Discussão/Pergunta.
- Twitter: Conciso, gancho forte, tom de alpha. Threads pra análises mais profundas.

EXEMPLOS DE TOM:
✅ "gm Aura fam ✨ Dia forte no mercado hoje. Vamos discutir os movimentos na call das 8:30. Quem tá acompanhando o BTC?"
❌ "URGENTE: Comprem agora antes que exploda!!!"
✅ "Comunidade crescendo organicamente — 200 novos membros essa semana sem nenhum incentivo. Isso é o poder de uma comunidade real."
❌ "Se você não tá holdando, vai se arrepender."`,
    reportMetrics: [
      { id: "discord_members", label: "Membros Discord", type: "number" },
      { id: "daily_active", label: "Ativos diários (média)", type: "number" },
      { id: "calls_hosted", label: "Calls realizadas", type: "number" },
      { id: "twitter_followers", label: "Seguidores X", type: "number" },
      { id: "impressions", label: "Impressões X", type: "number" },
      { id: "engagement_rate", label: "Taxa de engajamento (%)", type: "number" },
      { id: "highlights", label: "Destaques do mês", type: "textarea" },
      { id: "next_month", label: "Plano próximo mês", type: "textarea" },
    ],
    briefingFocus: "Alpha, movimentações de mercado, narrativas fortes, métricas de comunidade, tendências Discord/Twitter crypto.",
  },
  {
    id: "zero-ledger",
    name: "Zero Ledger",
    emoji: "🛡️",
    color: "#10B981",
    revenue: "$650/mês",
    role: "Social Media",
    platforms: ["Twitter/X", "LinkedIn"],
    audience: {
      country: "Global (EN)",
      flag: "🌍",
      timezone: "America/New_York",
      utcOffset: -5,
      language: "EN",
      peakHours: ["09:00-11:00 EST", "14:00-16:00 EST"],
      peakDays: ["Ter", "Qua", "Qui"],
      demographics: "B2B, fintechs, compliance officers, investidores institucionais",
    },
    systemPrompt: `Você é o social media manager da Zero Ledger, uma empresa de pagamentos crypto com token launch previsto para março/2026.

IDENTIDADE: Zero Ledger oferece soluções de pagamento usando blockchain. O foco é utilidade real, não especulação. O token terá função de utilidade dentro do ecossistema de pagamentos.

TOM DE VOZ:
- Profissional e institucional, mas não robótico
- Autoridade em pagamentos e compliance
- Foco em confiança, segurança e regulação
- Dados e métricas > hype e promessas
- Linguagem que transmite solidez e seriedade

⚠️ REGRAS DE COMPLIANCE (INVIOLÁVEIS):
- NUNCA prometer retornos financeiros, valorização, ou ganhos
- NUNCA usar palavras como "investimento", "lucro", "retorno", "rendimento" referindo-se ao token
- NUNCA criar expectativa de preço ou comparar com outros tokens
- SEMPRE falar do token como UTILIDADE para pagamentos
- NUNCA usar linguagem de urgência financeira ("não perca", "última chance")
- Toda menção ao token deve focar em FUNÇÃO, não em VALOR
- Em caso de dúvida, ser mais conservador

FORMATOS:
- Twitter: Institucional, dados e insights de mercado de pagamentos. Posts com métricas e análises.
- LinkedIn: Thought leadership longo. Artigos sobre regulação, futuro dos pagamentos, compliance.

EXEMPLOS DE TOM:
✅ "O mercado global de pagamentos digitais deve atingir $20T até 2028. A blockchain oferece infraestrutura para tornar isso mais eficiente e transparente."
❌ "Nosso token vai valorizar 100x! Compre antes do launch!"
✅ "Zero Ledger obteve aprovação regulatória em mais uma jurisdição. Compliance first, sempre."
❌ "Token launch em março! Não fique de fora desse foguete!"`,
    reportMetrics: [
      { id: "twitter_followers", label: "Seguidores X", type: "number" },
      { id: "linkedin_followers", label: "Seguidores LinkedIn", type: "number" },
      { id: "impressions", label: "Impressões totais", type: "number" },
      { id: "posts_published", label: "Posts publicados", type: "number" },
      { id: "engagement_rate", label: "Taxa de engajamento (%)", type: "number" },
      { id: "token_launch_progress", label: "Progresso token launch", type: "text" },
      { id: "highlights", label: "Destaques do mês", type: "textarea" },
      { id: "compliance_notes", label: "Notas de compliance", type: "textarea" },
      { id: "next_month", label: "Plano próximo mês", type: "textarea" },
    ],
    briefingFocus: "Pagamentos crypto, stablecoins, regulação, compliance, CBDCs, infraestrutura de pagamentos blockchain.",
  },
  {
    id: "aco-labs",
    name: "ACO Labs",
    emoji: "🧪",
    color: "#F59E0B",
    revenue: "$250/mês",
    role: "Social Content",
    platforms: ["Twitter/X"],
    audience: {
      country: "Global (EN)",
      flag: "🌐",
      timezone: "UTC",
      utcOffset: 0,
      language: "EN",
      peakHours: ["14:00-17:00 UTC", "21:00-00:00 UTC"],
      peakDays: ["Seg", "Ter", "Qua"],
      demographics: "Builders Web3, VCs, devs, founders",
    },
    systemPrompt: `Você é o content creator da ACO Labs, um laboratório de inovação Web3 que é investidor da Agência 2L.

IDENTIDADE: ACO Labs (anteriormente chamado Signal) é um hub de inovação focado em construção Web3. Investe em projetos e pessoas que estão building o futuro descentralizado.

TOM DE VOZ:
- Builder culture: "we build, we ship"
- Tech-forward, inovador, experimental
- Tom de laboratório — testa, aprende, itera
- Celebra builders e contribuidores do ecossistema
- Linguagem que mistura tech com visão de futuro

REGRAS:
- Foco em inovação, infraestrutura e building
- Destacar projetos e builders do ecossistema
- Compartilhar insights técnicos de forma acessível
- ACO Labs é investidor da Agência 2L — manter relação profissional
- Nunca mencionar como "Signal" publicamente (nome antigo)

FORMATOS:
- Twitter: Threads técnicas (5-10 tweets), insights de builder, alpha sobre tech. Threads com código ou diagrams quando relevante.
- Tom mais técnico que os outros clientes, mas ainda acessível.

EXEMPLOS DE TOM:
✅ "Shipped: novo módulo de governance on-chain. 47 linhas de Solidity que mudam como DAOs votam. Thread 🧵👇"
❌ "ACO Labs é o melhor projeto do mercado!"
✅ "3 tendências de infra Web3 que todo builder deveria estar de olho em 2026: [thread técnica]"
❌ "Invistam na ACO Labs!"`,
    reportMetrics: [
      { id: "twitter_followers", label: "Seguidores X", type: "number" },
      { id: "impressions", label: "Impressões totais", type: "number" },
      { id: "posts_published", label: "Posts publicados", type: "number" },
      { id: "engagement_rate", label: "Taxa de engajamento (%)", type: "number" },
      { id: "highlights", label: "Destaques do mês", type: "textarea" },
      { id: "next_month", label: "Plano próximo mês", type: "textarea" },
    ],
    briefingFocus: "Inovação Web3, novas tecnologias blockchain, infraestrutura, ferramentas de builder, DAOs, governance.",
  },
  {
    id: "maya-ig",
    name: "Maya IG",
    emoji: "💎",
    color: "#EC4899",
    revenue: "$100/mês",
    role: "Supervisão Luxury",
    platforms: ["Instagram"],
    audience: {
      country: "Brasil",
      flag: "🇧🇷",
      timezone: "America/Sao_Paulo",
      utcOffset: -3,
      language: "PT-BR",
      peakHours: ["11:00-13:00", "19:00-21:00"],
      peakDays: ["Dom", "Seg", "Qui"],
      demographics: "Mulheres 25-40, classe A/B, lifestyle/luxury",
    },
    systemPrompt: `Você é o supervisor de conteúdo do perfil Instagram da Maya, um perfil de lifestyle luxury.

IDENTIDADE: Maya é um perfil de lifestyle premium no Instagram. Conteúdo aspiracional, estética impecável, curadoria cuidadosa.

TOM DE VOZ:
- Luxo e sofisticação sem ser pretensioso
- Minimalista nas palavras, máximo impacto visual
- Elegante, curado, cada palavra tem peso
- Emojis selecionados (💎✨🤍🖤) — nunca em excesso
- Storytelling sutil, nunca óbvio

REGRAS:
- Supervisão de conteúdo: revisar estética e coerência do feed
- Captions curtas e impactantes (max 2-3 linhas + CTA sutil)
- Manter consistência visual do grid
- Stories com CTAs sutis, nunca agressivos
- Foco em qualidade sobre quantidade

FORMATOS:
- Instagram Feed: Captions curtas (1-3 linhas), elegantes, com 2-3 emojis max. CTA sutil.
- Stories: Visual-first, texto mínimo, CTAs como "link in bio" ou swipe up.
- Reels: Se aplicável, conceito visual forte com música trending.

EXEMPLOS DE TOM:
✅ "Less noise. More substance. ✨"
❌ "OMG AMEI esse look gente!!! 😍🔥💕💯"
✅ "The art of simplicity. New collection, link in bio 🤍"
❌ "CORRAM PRO LINK!! PROMOÇÃO IMPERDÍVEL!!!"`,
    reportMetrics: [
      { id: "ig_followers", label: "Seguidores IG", type: "number" },
      { id: "posts_reviewed", label: "Posts revisados", type: "number" },
      { id: "stories_reviewed", label: "Stories revisados", type: "number" },
      { id: "engagement_rate", label: "Taxa de engajamento (%)", type: "number" },
      { id: "highlights", label: "Destaques do mês", type: "textarea" },
      { id: "next_month", label: "Recomendações próximo mês", type: "textarea" },
    ],
    briefingFocus: "Tendências Instagram, estética, luxury branding, lifestyle content trends.",
  },
  {
    id: "pessoal-tiktok",
    name: "Luan — TikTok",
    emoji: "🎬",
    color: "#FF0050",
    revenue: "Próprio (98K)",
    role: "Creator",
    platforms: ["TikTok"],
    audience: {
      country: "Brasil",
      flag: "🇧🇷",
      timezone: "America/Sao_Paulo",
      utcOffset: -3,
      language: "PT-BR",
      peakHours: ["12:00-14:00", "18:00-22:00"],
      peakDays: ["Ter", "Qui", "Sáb"],
      demographics: "Brasileiros 18-30, curiosos sobre crypto e AI, iniciantes",
    },
    systemPrompt: `Você é o roteirista de conteúdo do Luan para TikTok (98K seguidores). Foco em Bitcoin education e AI trends.

IDENTIDADE: Luan é um educador crypto brasileiro com 20+ anos de internet e 12 anos de comunidade. Traduz conceitos complexos em linguagem acessível. Público: brasileiros interessados em crypto e tech mas que não são experts.

TOM DE VOZ:
- Direto, sem enrolação, coloquial brasileiro
- "Professor descolado" — ensina sem ser chato
- Usa analogias do cotidiano brasileiro
- Confiante mas humilde ("eu estudo isso há anos")
- Gera curiosidade e FOMO de conhecimento (não financeiro)

FRAMEWORK HCTE (OBRIGATÓRIO):
1. HOOK (0-3s): Frase que PARA o scroll. Pergunta chocante, dado surpreendente, ou afirmação controversa.
2. CONTEXTO (3-13s): Situa o viewer. Por que isso importa? O que tá acontecendo?
3. TUTORIAL (13-45s): O conteúdo principal. Explica, ensina, mostra.
4. ENGAGEMENT (45-60s): CTA forte. Pergunta, "salva pra depois", "segue pra mais".

REGRAS:
- Vídeos de 45-60 segundos ideal
- Hook nos primeiros 3 segundos é TUDO
- Linguagem de TikTok: frases curtas, ritmo rápido
- NUNCA dar conselho financeiro
- Sempre simplificar — se sua avó não entende, tá complexo demais

FORMATO DE ROTEIRO:
🎬 HOOK (3s): [frase de impacto]
📍 CONTEXTO (10s): [situação]
📚 CONTEÚDO (30-35s): [explicação principal]
🎯 CTA (5s): [chamada pra ação]

EXEMPLOS:
✅ HOOK: "O Bitcoin já valorizou 200% esse ano e você ainda tá no Tesouro Direto?"
❌ HOOK: "Olá pessoal, hoje vamos falar sobre Bitcoin..."
✅ CTA: "Salva esse vídeo. Daqui 6 meses você vai me agradecer."
❌ CTA: "Se gostou, dá like e segue."`,
    reportMetrics: [
      { id: "followers", label: "Seguidores", type: "number" },
      { id: "views_total", label: "Views totais no mês", type: "number" },
      { id: "videos_published", label: "Vídeos publicados", type: "number" },
      { id: "top_video", label: "Top vídeo (views)", type: "text" },
      { id: "highlights", label: "Destaques", type: "textarea" },
    ],
    briefingFocus: "Bitcoin, crypto para iniciantes, AI trends, tendências TikTok, conteúdo viral, dados surpreendentes.",
  },
  {
    id: "pessoal-x",
    name: "Luan — X/Twitter",
    emoji: "𝕏",
    color: "#1DA1F2",
    revenue: "Próprio (14.9K)",
    role: "Creator",
    platforms: ["Twitter/X"],
    audience: {
      country: "Brasil + Global",
      flag: "🇧🇷",
      timezone: "America/Sao_Paulo",
      utcOffset: -3,
      language: "PT-BR + EN",
      peakHours: ["08:00-10:00", "17:00-20:00"],
      peakDays: ["Seg", "Ter", "Qua"],
      demographics: "Crypto Twitter BR, alpha seekers, devs, traders",
    },
    systemPrompt: `Você é o ghostwriter do Luan no Twitter/X (14.9K seguidores). Foco em alpha crypto, análises e takes quentes.

IDENTIDADE: Luan é um veterano de internet (20+ anos) e crypto, CEO da Agência 2L, Social Lead da Base Brasil. No Twitter ele é mais técnico e opinativo que no TikTok.

TOM DE VOZ:
- Alpha provider: compartilha insights que poucos têm
- Opinião forte com dados pra sustentar
- Mix de educação + hot takes
- Confiante, experiente, "eu vi ciclos demais pra cair nessa"
- Engaja com CT (Crypto Twitter) brasileira e global

REGRAS:
- Tweets únicos: max 280 chars, cada palavra conta
- Threads: 3-7 tweets, primeiro tweet = hook que faz querer ler o resto
- Usar dados on-chain, métricas, comparações quando possível
- Pode ter opinião forte mas sempre com fundamento
- NUNCA dar conselho financeiro direto

FORMATOS:
Tweet único: Hook forte + insight + dado ou pergunta
Thread: Tweet 1 (hook) → 2-5 (desenvolvimento) → último (conclusão + CTA)

EXEMPLOS:
✅ "3 coisas que o mercado tá ignorando agora que vão importar em 6 meses: 🧵"
❌ "Bom dia, vou compartilhar algumas reflexões sobre o mercado hoje."
✅ "Base processou mais transações que Arbitrum ontem. Ninguém tá falando disso. Thread com os dados 👇"
❌ "Acho que talvez possivelmente o mercado pode subir ou descer..."`,
    reportMetrics: [
      { id: "followers", label: "Seguidores", type: "number" },
      { id: "impressions", label: "Impressões totais", type: "number" },
      { id: "top_tweet", label: "Top tweet", type: "text" },
      { id: "highlights", label: "Destaques", type: "textarea" },
    ],
    briefingFocus: "Alpha crypto, dados on-chain, hot takes, análises técnicas, tendências do Crypto Twitter.",
  },
];

export const CONTENT_TYPES = [
  { id: "news", label: "📰 Notícia", desc: "Breaking news ou atualização" },
  { id: "trend", label: "📈 Trend/Alpha", desc: "Tendência ou dado" },
  { id: "education", label: "📚 Educativo", desc: "Conceito ou tutorial" },
  { id: "opinion", label: "🔥 Take", desc: "Hot take ou análise" },
  { id: "announcement", label: "📢 Anúncio", desc: "Lançamento ou update" },
  { id: "engagement", label: "💬 Engajamento", desc: "Enquete ou discussão" },
];

export const STATUSES = [
  { id: "idea", label: "Ideia", color: "#555", icon: "💡" },
  { id: "draft", label: "Rascunho", color: "#F59E0B", icon: "✏️" },
  { id: "review", label: "Revisão", color: "#8B5CF6", icon: "👀" },
  { id: "approved", label: "Aprovado", color: "#0052FF", icon: "✅" },
  { id: "scheduled", label: "Agendado", color: "#06B6D4", icon: "📅" },
  { id: "published", label: "Publicado", color: "#10B981", icon: "🚀" },
];

export const TRACKED_COINS = [
  { id: "bitcoin", symbol: "BTC", binance: "BTCUSDT" },
  { id: "ethereum", symbol: "ETH", binance: "ETHUSDT" },
  { id: "solana", symbol: "SOL", binance: "SOLUSDT" },
  { id: "usd-brl", symbol: "USD", isFiat: true },
];

export const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export const PLATFORM_METRICS = {
  x: {
    name: "Twitter / X", emoji: "𝕏", color: "#1DA1F2",
    metrics: [
      { id: "followers", label: "Seguidores", type: "number" },
      { id: "impressions", label: "Impressões", type: "number" },
      { id: "engagement_rate", label: "Taxa de engajamento (%)", type: "number" },
      { id: "posts", label: "Posts publicados", type: "number" },
      { id: "likes", label: "Curtidas total", type: "number" },
      { id: "retweets", label: "Retweets/Reposts", type: "number" },
      { id: "replies", label: "Respostas", type: "number" },
      { id: "link_clicks", label: "Cliques em links", type: "number" },
      { id: "profile_visits", label: "Visitas ao perfil", type: "number" },
      { id: "new_followers", label: "Novos seguidores", type: "number" },
      { id: "top_post", label: "Top post", type: "text" },
    ],
  },
  instagram: {
    name: "Instagram", emoji: "📸", color: "#E1306C",
    metrics: [
      { id: "followers", label: "Seguidores", type: "number" },
      { id: "reach", label: "Alcance", type: "number" },
      { id: "impressions", label: "Impressões", type: "number" },
      { id: "engagement_rate", label: "Taxa de engajamento (%)", type: "number" },
      { id: "posts", label: "Posts publicados", type: "number" },
      { id: "reels_views", label: "Views em Reels", type: "number" },
      { id: "stories_views", label: "Views em Stories (média)", type: "number" },
      { id: "saves", label: "Salvamentos", type: "number" },
      { id: "shares", label: "Compartilhamentos", type: "number" },
      { id: "profile_visits", label: "Visitas ao perfil", type: "number" },
      { id: "new_followers", label: "Novos seguidores", type: "number" },
      { id: "top_post", label: "Top post", type: "text" },
    ],
  },
  tiktok: {
    name: "TikTok", emoji: "🎵", color: "#FE2C55",
    metrics: [
      { id: "followers", label: "Seguidores", type: "number" },
      { id: "views", label: "Visualizações total", type: "number" },
      { id: "likes", label: "Curtidas total", type: "number" },
      { id: "comments", label: "Comentários total", type: "number" },
      { id: "shares", label: "Compartilhamentos", type: "number" },
      { id: "videos_posted", label: "Vídeos publicados", type: "number" },
      { id: "avg_watch_time", label: "Tempo médio assistido (s)", type: "number" },
      { id: "profile_views", label: "Visitas ao perfil", type: "number" },
      { id: "new_followers", label: "Novos seguidores", type: "number" },
      { id: "top_video", label: "Top vídeo", type: "text" },
    ],
  },
  youtube: {
    name: "YouTube", emoji: "▶️", color: "#FF0000",
    metrics: [
      { id: "subscribers", label: "Inscritos", type: "number" },
      { id: "views", label: "Visualizações total", type: "number" },
      { id: "watch_hours", label: "Horas assistidas", type: "number" },
      { id: "avg_view_duration", label: "Duração média (min)", type: "number" },
      { id: "videos_posted", label: "Vídeos publicados", type: "number" },
      { id: "likes", label: "Curtidas total", type: "number" },
      { id: "comments", label: "Comentários total", type: "number" },
      { id: "ctr", label: "CTR (%)", type: "number" },
      { id: "impressions", label: "Impressões", type: "number" },
      { id: "new_subscribers", label: "Novos inscritos", type: "number" },
      { id: "top_video", label: "Top vídeo", type: "text" },
    ],
  },
  linkedin: {
    name: "LinkedIn", emoji: "💼", color: "#0A66C2",
    metrics: [
      { id: "followers", label: "Seguidores", type: "number" },
      { id: "impressions", label: "Impressões", type: "number" },
      { id: "engagement_rate", label: "Taxa de engajamento (%)", type: "number" },
      { id: "posts", label: "Posts publicados", type: "number" },
      { id: "reactions", label: "Reações total", type: "number" },
      { id: "comments", label: "Comentários total", type: "number" },
      { id: "shares", label: "Compartilhamentos", type: "number" },
      { id: "profile_views", label: "Visitas ao perfil", type: "number" },
      { id: "new_followers", label: "Novos seguidores", type: "number" },
      { id: "top_post", label: "Top post", type: "text" },
    ],
  },
  discord: {
    name: "Discord", emoji: "💬", color: "#5865F2",
    metrics: [
      { id: "members", label: "Membros total", type: "number" },
      { id: "active_daily", label: "Ativos diários (média)", type: "number" },
      { id: "messages", label: "Mensagens no mês", type: "number" },
      { id: "new_members", label: "Novos membros", type: "number" },
      { id: "voice_minutes", label: "Minutos em voice", type: "number" },
      { id: "calls_hosted", label: "Calls realizadas", type: "number" },
    ],
  },
  general: {
    name: "Geral / Cross-platform", emoji: "📊", color: "#888",
    metrics: [
      { id: "highlights", label: "Destaques do mês", type: "textarea" },
      { id: "issues", label: "Problemas identificados", type: "textarea" },
      { id: "next_month", label: "Plano próximo mês", type: "textarea" },
    ],
  },
};

export const NAV_ITEMS = [
  { id: "clients", label: "Clientes", icon: "🏢", desc: "Base de clientes" },
  { id: "multiplier", label: "Multiplicador", icon: "⚡", desc: "1 input → 7 outputs" },
  { id: "briefing", label: "Briefing", icon: "☀️", desc: "Briefing do dia" },
  { id: "board", label: "Entregas", icon: "📋", desc: "Calendário & status" },
  { id: "reports", label: "Relatórios", icon: "📊", desc: "Relatórios mensais" },
];
