# Spec_CLAUDE.md — Especificação completa do NunzioDiet

Documento de especificação técnica e histórica do projeto, complementar ao `CLAUDE.md` (que foca em convenções de edição do dia a dia). Este arquivo descreve o projeto **do início até o estado atual**: o que é, como evoluiu, sua arquitetura completa e todas as funcionalidades.

---

## 1. Visão geral

**NunzioDiet** é um aplicativo de nutrição com tom irreverente, publicável como:
- **Web** — GitHub Pages (`felipevadao.github.io/nunziodiet`), servido a partir de `docs/`.
- **Android** — empacotado via Capacitor (projeto gerado em `android/`).
- **iOS** — suportado via Capacitor, mas o projeto `ios/` ainda não foi gerado localmente (requer Mac + Xcode: `npx cap add ios`).

Três pilares funcionais:
1. **Calculadora de substituição de alimentos** — equivalência calórica entre dois alimentos.
2. **Planejador de refeições** — gera um plano diário completo a partir de objetivo (emagrecer/manter/massa), calorias-alvo e restrições alimentares.
3. **Assistente de IA "Nunzinho"** — chat flutuante com personalidade debochada, conectado a um backend próprio (Cloudflare Worker → Google Gemini).

Não há build step, bundler ou framework: tudo em `docs/index.html` (HTML + CSS + JS puro) mais um arquivo JS separado para o widget de chat.

---

## 2. Histórico do projeto

54 commits, de 2026-05-22 (primeiro commit) a 2026-06-27 (estado atual). Linha do tempo por fase:

### Fase 1 — Fundamento (22–24 mai)
- Commit inicial com a calculadora de substituição de alimentos.
- Calculadora de ingestão de água (fórmula WHO por faixa etária).
- Banco de dados expandido para 223 alimentos (TACO, 4ª edição) e calculadora de IMC.

### Fase 2 — Planejador de refeições (24–26 mai)
- Primeira versão do planejador de refeições (geração baseada em regras).
- Curadoria do banco de dados do planejador para alimentos práticos de supermercado brasileiro (`PLAN_DB`).
- IMC substituído pela fórmula de Harris-Benedict (TMB + GET).
- Busca fuzzy com correção ortográfica nos autocompletes.
- Layout responsivo mobile (modais em bottom-sheet, fix de zoom iOS).
- Sistema de templates por refeição para combinações coerentes (`T_CAFE`, `T_ALMOCO`, etc.).
- Dark/light mode com detecção de preferência do sistema.
- Plano reduzido para 4 refeições fixas em todos os objetivos.

### Fase 3 — Edição avançada do plano (25–26 mai)
- Exportação em PDF e botões de fechar em todos os modais.
- Plano de refeições editável com recálculo automático de calorias.
- Trocas de alimento substituem dropdown por autocomplete de texto livre.
- Travamento do "Total do dia" no valor originalmente proposto.
- Garantia de balanço calórico exato em trocas de alimento (`redistributeDelta`).
- Redesign futurista do dark mode; adicionar/remover refeições e alimentos dinamicamente.

### Fase 4 — Migração mobile e navegação (5–12 jun)
- Migração para Capacitor + jsPDF local (sem `window.print()`), habilitando publicação iOS/Android.
- Projeto Android gerado e commitado.
- Menu hamburger com navegação rápida entre funcionalidades.
- Fix de modais para centralizar no mobile em vez de bottom-sheet.
- Funcionalidade "Minha Dieta" (importar/colar uma dieta existente), toasts, loading states, e correções de UX (touch targets WCAG 44×44px).

### Fase 5 — Assistente de IA (26–27 jun)
- Widget de chat `gemini-chat.js` adicionado a `docs/` e incluído em `index.html`.
- Correção da URL do Worker (estava com placeholder).
- Backend do assistente (Cloudflare Worker, antes em pasta solta `nunziodiet-ai` sem controle de versão) **movido para dentro do repositório principal** em `worker/`.
- Ajuste de prompt/parâmetros do Gemini para eliminar markdown literal nas respostas e desligar "thinking budget" (causa de respostas cortadas no meio da frase).

---

## 3. Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | HTML + CSS + JavaScript vanilla (sem framework, sem bundler) |
| Empacotamento mobile | [Capacitor](https://capacitorjs.com/) 6.0.0 (`@capacitor/core`, `android`, `ios`, `filesystem`, `share`, `splash-screen`) |
| PDF | [jsPDF](https://github.com/parallax/jsPDF) (`docs/jspdf.umd.min.js`, vendorizado localmente, sem CDN) |
| Fonte | Orbitron (`docs/fonts/Orbitron.woff2`, local, sem Google Fonts CDN) |
| Hospedagem web | GitHub Pages, source = `docs/` |
| IA conversacional | Google Gemini (`gemini-flash-latest`) via proxy |
| Backend IA | Cloudflare Worker (`worker/worker.js`), deploy via Wrangler CLI |
| Base de dados nutricional | Array estático embutido no JS (`DB`), fonte: tabela TACO 4ª edição |
| Controle de versão | Git, remoto `https://github.com/FelipeVadao/nunziodiet.git` |
| CI/CD | Nenhum (sem GitHub Actions); deploy do app é automático via GitHub Pages ao fazer push em `main`; deploy do Worker é manual via `wrangler deploy` |

Não há testes automatizados, linter configurado, ou pipeline de CI.

---

## 4. Estrutura de arquivos

```
nunziodiet/
├── docs/                         ← webDir do Capacitor + source do GitHub Pages
│   ├── index.html                ← ARQUIVO PRINCIPAL (3422 linhas) — editar aqui
│   ├── gemini-chat.js            ← widget do assistente "Nunzinho" (278 linhas)
│   ├── jspdf.umd.min.js          ← biblioteca PDF vendorizada
│   └── fonts/Orbitron.woff2      ← fonte vendorizada
├── worker/                       ← backend Cloudflare do assistente "Nunzinho"
│   ├── worker.js                 ← proxy seguro para a API do Gemini
│   ├── wrangler.toml             ← config do Worker (nome, compatibility_date)
│   └── README.md                 ← instruções de deploy/secret
├── android/                      ← projeto Android Studio gerado pelo Capacitor
│   └── app/src/main/
│       ├── AndroidManifest.xml
│       └── java/com/nunziodiet/app/MainActivity.java
├── capacitor.config.json         ← appId com.nunziodiet.app, webDir docs
├── package.json / package-lock.json
├── index.html                    ← LEGADO (2586 linhas) — nunca editar, mantido por histórico git
├── CLAUDE.md                     ← guia de convenções de edição do dia a dia
├── Spec_CLAUDE.md                ← este arquivo
└── .gitignore
```

Não existem: `ios/` (gerado on-demand), `README.md` na raiz, `LICENSE`, `.github/workflows/`.

---

## 5. Arquitetura do app (`docs/index.html`)

Arquivo único organizado em três blocos: `<style>` → `<body>` → `<script>`. Sem módulos, sem bundler.

### 5.1 CSS e tema
- Custom properties em `:root` definem paleta e layout: `--green: #62C823`, `--charcoal: #2B2B2B`, `--radius-card: 22px`, `--radius-btn: 14px`, `--card-shadow`.
- Dark mode é o padrão (`data-theme="dark"` em `<html>`, lido de `localStorage['nd-theme']`).
- Tema escuro usa estética "deep purple": fundo `#0b0718` com gradiente radial roxo, cards `#170f2e`, bordas `rgba(139,92,246,…)`. O verde `--green` é o único acento "hero" (CTA principal e logo).
- Tema claro usa header em gradiente verde (`#7bd92a → #3d9014 → #2e6d0f`).
- Breakpoint mobile: `@media (max-width: 520px)`.

### 5.2 Tipografia e botões
- Fonte Orbitron só no CTA principal (`font-size: 0.85rem; letter-spacing: 2px`); resto usa stack de fontes do sistema.
- Três botões secundários (`água`, `IMC`/Harris-Benedict, `plano`) compartilham `.action-btn` com ícone (`.action-icon`), texto (`.action-label` + `.action-sub`) e chevron animado. Sem emoji em nenhum botão.
- Cores sólidas por botão (sem gradiente), com glow só no hover. Ver tabela completa em `CLAUDE.md`.

### 5.3 Base de dados nutricional (`const DB`)
- **225 alimentos**, cada um `{ name, cal, prot, carb, fat, fib }` — valores por 100 g.
- Fonte: TACO 4ª edição.
- `PLAN_NAMES` é um `Set` de **69 alimentos** curados (práticos de supermercado brasileiro), organizados por categoria: proteínas (13), carboidratos (18), gorduras (1 — azeite), verduras (12), frutas (9), laticínios (6).
- `PLAN_DB = DB.filter(f => PLAN_NAMES.has(f.name))` — subconjunto usado pelo planejador.

### 5.4 Busca e autocomplete
- `norm(s)` — remove acentos/diacríticos.
- `levenshtein(a, b)` — distância de edição, usado para tolerância a erros de digitação.
- `fuzzyScore(foodName, query)` — 1 caractere: 0 se alguma palavra começa com ele, `Infinity` caso contrário; 2+ caracteres: 0 (substring), 1–2 (typo), `Infinity` (sem match).
- `setupAC(inputId, dropdownId)` — conecta um input a um dropdown com navegação por teclado. Duas instâncias: `acA` (alimento atual) e `acB` (substituto).
- `setupPlanItemAC` — mesma lógica aplicada aos itens editáveis do plano de refeições.

### 5.5 Funcionalidades principais

#### a) Substituição de alimentos (`calculate()`)
Fórmula central de equivalência calórica: `qB = (qA / 100 * fA.cal) / fB.cal * 100`, com macros (`calcMacros`) escalados linearmente. A fórmula deve permanecer simétrica: `qA * cal_A = qB * cal_B`.

#### b) Calculadora de água (`calcWater()`)
Modal `waterModal`. Fatores WHO (ml/kg) por faixa etária: 18–30 → 40, 31–55 → 35, 56–65 → 30, 65+ → 25. Resultado em card escuro com `background: #1c1c1c` fixo (não usa `var(--charcoal)`, que inverteria no dark mode).

#### c) Harris-Benedict (`calcHB()`)
Modal `hbModal`. Campos `h-sexo`, `h-ativ` (fator de atividade 1.2–1.9), `h-peso`, `h-altura`, `h-idade`. Calcula TMB e GET, renderiza 3 cards de objetivo clicáveis que chamam `usarNoPlano(kcal, objetivo)`, pré-preenchendo o planejador e abrindo-o.

#### d) Planejador de refeições (`generatePlan()`)
Modal `planModal`. Inputs: `p-objetivo` (emagrecer/manter/massa), `p-cal`, checkboxes de restrição (`r-veg`, `r-gluten`, `r-lactose`).

- `getPlanDb()` — `PLAN_DB` filtrado pelas restrições ativas.
- `catFood(f)` — categoriza via regex em: `proteina_cafe`, `proteina_refeicao`, `graos_cafe`, `graos_refeicao`, `leguminosa`, `gordura`, `fruta`, `verdura`, `laticinios`.
- Constantes de contexto proteico: `P_FRANGO/P_BOVINA/P_PEIXE/P_SUINO` (refeições quentes), `P_OVO/P_FRIOS` (café/lanche — presunto, sardinha, atum **nunca** entram em almoço/jantar), `L_FEIJAO/L_GRAO/L_TODAS` (leguminosas), `C_ARROZ/C_BATATA/C_RAIZ` (carboidratos).
- Sistema de templates (`T_CAFE`, `T_LANCHE`, `T_LANCHE_MASSA`, `T_ALMOCO`, `T_JANTAR_EMAGR`, `T_JANTAR`): cada entrada de `PLANOS` referencia um template; `generatePlan` sorteia um por refeição. `pickFood(pool, used, db)` resolve o pool (string de categoria, array de categorias, ou array de nomes específicos).
- 4 refeições fixas por objetivo: café (25%), almoço (35%), lanche da tarde (15%), jantar (25%).
- `LIMITES` define clamps de gramas por categoria (azeite: `[10, 20]`, nunca entra em `used` — pode repetir entre refeições).
- `fmtQty(name, g, cal)` converte gramas em unidades humanas (ovos 50g, claras 33g, whey 30g/dose, pão francês/hambúrguer 50g/unidade, pão integral/branco 25g/fatia, banana 80g, maçã/laranja 130g, morango 15g, azeite 12g/colher).

#### e) Edição do plano gerado
Cada item carrega `data-actual-cal/prot/carb/fat` e `data-food-name`.

- `selectPlanFood(inp, food)` tem dois modos:
  - **Troca** (`actualCal > 0`): calcula porção calórico-equivalente clampada por `LIMITES`, mostra `showSwapTip()`, chama `redistributeDelta(oldCal - actualCal, item)`. **Não** chama `updateTargetTotal()`.
  - **Novo item** (`actualCal === 0`): usa `max(LIMITES.min, 100)`, chama `updateTargetTotal()`.
- `redistributeDelta(delta, excludeItem)` distribui a diferença calórica proporcionalmente entre os itens com `actualCal > 0`; o último item absorve o arredondamento (±1 kcal).
- `recalcTotals()` recalcula chips de kcal por refeição, totais de macro e total do dia.
- `updateTargetTotal()` soma todos os `data-actual-cal` e grava em `planResult.dataset.targetTotal` — **deve** ser chamado após qualquer add/remove.
- `addMeal/removeMeal/addFood/removeFood` — gerenciam refeições e alimentos dinamicamente; sempre seguidos de `updateTargetTotal()` + `recalcTotals()`.
- `analyzePlan()` avalia % de proteína, fibra total (meta 25g/dia), % de gordura (alerta se >40% ou <15%) e kcal total vs. meta, renderizando cards `.tip-item.tip-good/warn/info`.
- `showSwapTip()` mostra um tooltip temporário (3.5s) com deltas de proteína/fibra após uma troca.

#### f) Minha Dieta (`renderMyDiet`, `parseDietText`, etc.)
Modal `myDietModal`. Permite importar/colar uma dieta existente em texto livre (`parseDietText`/`parseDietTextAndPreview`/`importParsedDiet`), com suporte a leitura de imagem (`handleMyDietImage`) e abas de importação (`setImportTab`). Inclui análise (`analyzeMyDiet`) e exportação em PDF (`printMyDiet`).

#### g) Exportação em PDF (`printPlan`, `printMyDiet`)
PDF real via jsPDF — lê os dados do DOM e monta o layout programaticamente. Em ambiente nativo Capacitor usa `Filesystem` + `Share`; em web usa `doc.save()`. `window.print()` não é usado.

#### h) UI utilitária
- `showToast()` / `showConfirm()` — feedback não-bloqueante e confirmação customizada.
- `toggleMenu()` / `navGoTo()` — menu hamburger com navegação rápida entre seções.
- `toggleTheme()` — alterna `data-theme`, persiste em `localStorage`.
- `debounce()` — limita frequência de chamadas (usado em inputs de busca).

### 5.6 Convenções gerais
- Todos os valores nutricionais do `DB` são **por 100 g** — nunca armazenar valores por porção.
- `--green` é o único acento "hero" — não adicionar glow verde em outros elementos.
- Bordas do dark mode usam roxo (`rgba(139,92,246,…)`), não verde.
- Novos modais seguem o padrão `modal-bg.hidden` → `modal` → resultado com `.hidden`. Prefixos de campo: `w-` água, `h-` Harris-Benedict, `p-` planejador.
- Containers de resultado escuros usam hex fixo, nunca `var(--charcoal)`.
- Presunto, sardinha e atum são proteínas de café/lanche — nunca em `T_ALMOCO`/`T_JANTAR`.

---

## 6. Assistente de IA "Nunzinho"

### 6.1 Frontend (`docs/gemini-chat.js`)
Widget self-contained (sem dependências), injetado via `<script src="gemini-chat.js" defer></script>` antes de `</body>`. Cria:
- Botão flutuante (`.nd-chat-fab`) e painel de chat (`.nd-chat-panel`) inseridos dinamicamente no `<body>` via JS — não há HTML estático no `index.html` para o chat.
- Histórico de sessão em memória (array `history`), **não persiste** entre recarregamentos (por design).
- `send()` faz `POST` para `WORKER_URL` com `{ message, history }`, mostra indicador de "digitando" (`showTyping`/`hideTyping`), e renderiza a resposta com `textContent` (não interpreta HTML/markdown — por isso o backend precisa devolver texto puro, sem `**negrito**` etc.).
- Respeita o tema do app (dark/light) via seletor `[data-theme="dark"]`.

### 6.2 Backend (`worker/worker.js`)
Cloudflare Worker que atua como proxy seguro entre o frontend e a API do Google Gemini — a chave da API nunca é exposta no cliente.

- **Modelo:** `gemini-flash-latest`.
- **CORS:** restrito a `https://felipevadao.github.io`.
- **System Instruction:** define a persona "Nunzinho" — tom sarcástico/debochado/brasileiro, respostas curtas (4–6 frases), **proibição explícita de markdown** (negrito, listas, títulos), proibição de misturar idiomas, instrução para sempre terminar a ideia.
- **generationConfig:** `temperature: 0.7`, `topP: 0.95`, `maxOutputTokens: 500`, `thinkingConfig: { thinkingBudget: 0 }` — o `thinkingBudget: 0` é crítico: sem ele, o modelo gasta parte do orçamento de tokens em "raciocínio interno" antes da resposta visível, cortando frases no meio mesmo em respostas curtas.
- **safetySettings:** bloqueia apenas conteúdo de severidade alta (`BLOCK_ONLY_HIGH`) para harassment e hate speech.
- Histórico limitado às últimas 12 mensagens vindas do frontend (controle de custo/contexto).
- Chave da API configurada como secret via `wrangler secret put GEMINI_API_KEY` — nunca no código.
- Deploy: `cd worker && wrangler deploy`, publica em `https://nunziodiet-ai.felipeconceicaopc.workers.dev`.

### 6.3 Fluxo de dados
```
docs/gemini-chat.js (browser)
   → POST {message, history} → Cloudflare Worker (worker/worker.js)
      → injeta SYSTEM_INSTRUCTION + histórico → Gemini API
      ← texto puro (sem markdown) ←
   ← { reply } ←
```

---

## 7. Empacotamento mobile (Capacitor)

- `capacitor.config.json`: `appId: com.nunziodiet.app`, `appName: NunzioDiet`, `webDir: docs`.
- Splash screen: fundo `#0b0718` (mesma cor do dark mode), duração 2000ms, fullscreen/imersivo.
- Android: `minWebViewVersion: 88`.
- Workflow de edição:
  1. Editar `docs/index.html`.
  2. `npm run sync` (= `npx cap sync`) para propagar para `android/`.
  3. `npx cap open android` para rebuild no Android Studio.
- iOS requer Mac + Xcode: `npx cap add ios && npx cap open ios` (projeto ainda não gerado neste repo).
- Em ambiente nativo, exportação de PDF usa `@capacitor/filesystem` + `@capacitor/share` em vez de download direto.

---

## 8. Deploy e infraestrutura

| Componente | Como é publicado |
|---|---|
| Web app (`docs/`) | Automático via GitHub Pages a cada `git push` em `main` (source = `/docs`) |
| Android | Manual — build local via Android Studio, gerado a partir de `android/` |
| iOS | Manual — requer Mac + Xcode, projeto `ios/` ainda não criado |
| Worker (assistente IA) | Manual — `cd worker && wrangler deploy` |
| Segredos | `GEMINI_API_KEY` via `wrangler secret put`, nunca em arquivo versionado |

Não há GitHub Actions, testes automatizados ou linter configurado no projeto.

---

## 9. Limitações e dívidas técnicas conhecidas

- `index.html` na raiz é legado (2586 linhas) e não deve ser editado — existe só por histórico git.
- Sem testes automatizados (manual QA via navegador/app).
- Sem CI — qualquer regressão só é percebida em produção (GitHub Pages) ou no Android Studio.
- Histórico do chat do Nunzinho não persiste entre recarregamentos (decisão de design, não bug).
- `worker/.wrangler/` é cache local do Wrangler, ignorado via `.gitignore` — não confundir com artefato de deploy.
- Projeto iOS (`ios/`) não existe localmente; precisa ser gerado em um Mac antes de qualquer build iOS.
