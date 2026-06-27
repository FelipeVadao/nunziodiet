# Nunzinho — Assistente IA do NunzioDiet

Assistente nutricional via Google Gemini. O backend é um Cloudflare Worker
que guarda a chave da API com segurança; o frontend é o widget de chat
flutuante em `docs/gemini-chat.js`.

```
worker/
├── worker.js          ← Cloudflare Worker (proxy seguro p/ Gemini)
├── wrangler.toml      ← config do Worker
└── README.md
```

O widget (`docs/gemini-chat.js`) já está incluído em `docs/index.html` e não
precisa ser copiado de lugar nenhum — edite direto ali.

---

## 1. Pré-requisitos

```bash
npm install -g wrangler   # CLI da Cloudflare
wrangler login            # autentica na sua conta
```

## 2. Configurar a chave da API com segurança

A chave **nunca** fica no código. Ela é guardada criptografada como um secret:

```bash
cd worker
wrangler secret put GEMINI_API_KEY
# cole a chave quando o terminal pedir
```

## 3. Publicar o Worker

```bash
cd worker
wrangler deploy
```

A saída mostra a URL pública, algo como:
`https://nunziodiet-ai.SEU-SUBDOMINIO.workers.dev`

Se a URL mudar, atualize a constante `WORKER_URL` em `docs/gemini-chat.js`.

---

## Como funciona

- O widget manda `{ message, history }` via POST pro Worker.
- O Worker injeta o System Instruction do Nunzinho, repassa pro Gemini com a
  chave secreta, e devolve só o texto da resposta.
- CORS liberado apenas para `https://felipevadao.github.io`.
- O histórico (últimas ~12 mensagens) dá memória dentro da sessão, sem
  persistir entre recarregamentos.

## Custo

O Worker limita o contexto a 12 mensagens e os tokens de saída por resposta
pra segurar o gasto. Se quiser um teto duro (ex.: X mensagens por
usuário/dia), dá pra adicionar rate limiting com Cloudflare KV.

## Testar local

```bash
cd worker
wrangler dev    # roda o Worker local; ajuste WORKER_URL temporariamente
```
