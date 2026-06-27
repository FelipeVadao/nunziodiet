# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Para uma especificação completa do projeto — histórico de evolução, arquitetura detalhada de cada funcionalidade, e do assistente de IA "Nunzinho" — consulte `Spec_CLAUDE.md`. Leia-o quando precisar de contexto histórico ou de uma visão completa antes de mudanças estruturais grandes.

## Project

Aplicativo de nutrição publicável como web, Android e iOS via Capacitor. Hospedado em `felipevadao.github.io/nunziodiet`.

**Arquivo principal: `docs/index.html`** — nunca editar o `index.html` da raiz (desatualizado, mantido apenas por histórico git).

## Estrutura do projeto

```
docs/                        ← webDir do Capacitor + source do GitHub Pages
  index.html                 ← ARQUIVO PRINCIPAL (editar aqui)
  gemini-chat.js             ← widget do assistente "Nunzinho" (ver seção própria)
  jspdf.umd.min.js           ← PDF local, sem CDN
  fonts/Orbitron.woff2       ← Fonte local, sem Google Fonts CDN
worker/                      ← Cloudflare Worker do assistente "Nunzinho" (ver seção própria)
android/                     ← Projeto Android Studio (gerado pelo Capacitor)
capacitor.config.json        ← appId: com.nunziodiet.app, webDir: docs
package.json                 ← @capacitor/core, android, ios, filesystem, share
```

### Workflow de edição

```bash
# 1. Editar docs/index.html
# 2. Sincronizar com Android:
npm run sync        # equivale a npx cap sync
# 3. Rebuildar no Android Studio
npx cap open android
```

Para iOS (requer Mac + Xcode): `npx cap add ios && npx cap open ios`

## Assistente de IA "Nunzinho"

Widget de chat flutuante (`docs/gemini-chat.js`, injetado em `docs/index.html` via `<script defer>`) que conversa com a API do Google Gemini através de um Cloudflare Worker em `worker/worker.js` — a chave da API nunca fica no frontend.

- `docs/gemini-chat.js` é a **única cópia** do widget — não duplicar em outro lugar. A constante `WORKER_URL` no topo aponta para a URL pública do Worker.
- `worker/worker.js` define `SYSTEM_INSTRUCTION` (persona/tom debochado do Nunzinho) e os parâmetros do Gemini (`temperature`, `maxOutputTokens`, etc).
- Deploy do Worker: `cd worker && wrangler deploy` (requer `wrangler secret put GEMINI_API_KEY` configurado uma vez por ambiente). Detalhes em `worker/README.md`.

## Architecture

Everything lives in `docs/index.html`: `<style>` → `<body>` (HTML) → `<script>` (JS). No modules, no bundler.

### CSS

CSS custom properties in `:root` drive the entire palette and layout system:
- Core color tokens: `--green: #62C823`, `--charcoal: #2B2B2B`
- Layout tokens: `--radius-card: 22px`, `--radius-btn: 14px`
- Shadow token: `--card-shadow`

Dark mode is toggled via `data-theme="dark"` on `<html>`. **Dark mode is the default** — the IIFE at the bottom of `<script>` reads `localStorage.getItem('nd-theme') || 'dark'`. All dark overrides live under `[data-theme="dark"]` selectors, grouped at the end of `<style>`.

**Dark mode aesthetic (deep purple theme):**
- Body: `#0b0718` + radial gradient `rgba(109,40,217,0.18)` at top
- Header: `linear-gradient(160deg, #1e0d38, #110820)` with `rgba(139,92,246,0.3)` bottom border
- Cards (`.card`, `.macro-card`): `#170f2e`, border `rgba(139,92,246,0.14)`
- Meal cards: `#120a24`, modals: `#170f2e`
- Border accent throughout: `rgba(139,92,246,0.08–0.25)` (purple, not green)
- Green `#62C823` is the single hero — only the main CTA gets the green glow

**Light mode header:** `linear-gradient(160deg, #7bd92a, #3d9014, #2e6d0f)`.

Mobile breakpoint is `@media (max-width: 520px)` with bottom-sheet modal pattern.

### Typography

The main CTA button uses **Orbitron** (`docs/fonts/Orbitron.woff2` — arquivo local, sem CDN), declarada via `@font-face` no topo do `<style>`. `font-size: 0.85rem`, `letter-spacing: 2px`. All other elements use the system font stack.

### Button structure

The three secondary action buttons (água, IMC, plano) share class `.action-btn` and contain:
- `.action-icon` — 40×40px rounded square with `rgba(255,255,255,0.14)` bg, holds an inline SVG
- `.action-text` — flex column with `.action-label` (bold, sentence case) and `.action-sub` (0.7rem, 58% opacity; hidden on mobile)
- `.action-chevron` — SVG that translates 3px right on hover

No emoji in buttons anywhere.

### Button colors

| Button | Light | Dark |
|--------|-------|------|
| Calcular substituição | `--green` + charcoal text, Orbitron font | same |
| Ingestão de Água | `#1a3a5c` (navy) | `#2563eb` (blue-500) |
| Gasto Calórico | `#5b21b6` (violet) | `#7c3aed` (violet-500) |
| Plano de Refeições | `#0f766e` (teal) | `#0d9488` (teal-500) |
| ＋ Adicionar refeição | `#5b21b6` (violet) | `#4c1d95` (violet-900) |
| ＋ Alimento | dashed `--green` border | same, translucent |

Secondary buttons use solid colors only — no gradients. Glow only appears on hover.

### Food database (`const DB`)

Array of ~223 objects `{ name, cal, prot, carb, fat, fib }` — all values per 100 g. Source: TACO 4th edition. Source of truth for all calculations.

### Autocomplete + fuzzy search

`norm(s)` — strips diacritics.  
`levenshtein(a, b)` — edit distance.  
`fuzzyScore(foodName, query)` — single character: returns 0 if any word starts with it, `Infinity` otherwise. Two+ characters: 0 for substring match, 1–2 for typo tolerance, `Infinity` for no match.  
`setupAC(inputId, dropdownId)` — wires an input to a dropdown. Two instances: `acA` (current food) and `acB` (substitute).

### Food substitution (`calculate()`)

Core formula: `qB = (qA / 100 * fA.cal) / fB.cal * 100`. Macros scaled linearly. Results rendered into `#results`.

### Water calculator (`calcWater()`)

Modal opened by `openWater()`. Result renders into `.water-result` — a dark card with fixed `background: #1c1c1c` (not `var(--charcoal)`, which inverts in dark mode). WHO age-bracket factors (ml/kg): 18–30 → 40, 31–55 → 35, 56–65 → 30, 65+ → 25.

### Harris-Benedict calculator (`calcHB()`)

Modal opened by `openHB()`. Fields: `h-sexo`, `h-ativ` (activity factor 1.2–1.9), `h-peso`, `h-altura`, `h-idade`. Computes TMB and GET. Renders 3 clickable goal cards — each calls `usarNoPlano(kcal, objetivo)`, which pre-fills `p-cal`/`p-objetivo` in the meal planner and opens it.

### Meal planner (`generatePlan()`)

Modal opened by `openPlan()`. Inputs: `p-objetivo` (emagrecer / manter / massa), `p-cal`, dietary restriction checkboxes (`r-veg`, `r-gluten`, `r-lactose`).

**Data layer:**  
`PLAN_NAMES` — Set of ~57 practical Brazilian supermarket foods → `PLAN_DB = DB.filter(f => PLAN_NAMES.has(f.name))`.  
`getPlanDb()` — returns `PLAN_DB` filtered by active restriction checkboxes.

**Categorisation (`catFood(f)`):** `proteina_cafe`, `proteina_refeicao`, `graos_cafe`, `graos_refeicao`, `leguminosa`, `gordura`, `fruta`, `verdura`, `laticinios` via regex.

**Protein context constants:**
- `P_FRANGO`, `P_BOVINA`, `P_PEIXE`, `P_SUINO` — hot-meal proteins only
- `P_OVO`, `P_FRIOS` — breakfast/snack proteins (ovos, atum, presunto, sardinha)
- `L_FEIJAO`, `L_GRAO`, `L_TODAS` — legume pools
- `C_ARROZ`, `C_BATATA`, `C_RAIZ` — carb pools

**Template system:**  
`PLANOS` entries have `templates: T_*`. `generatePlan` picks one template at random per meal. A pool is either a category name string, a `string[]` of category names, or a `string[]` of food names. `pickFood(pool, used, db)` distinguishes via `CAT_NAMES`.

**Template constants:** `T_CAFE`, `T_LANCHE`, `T_LANCHE_MASSA`, `T_ALMOCO`, `T_JANTAR_EMAGR`, `T_JANTAR`.

**Meal structure — 4 meals per objective:**

| Refeição | emagrecer | manter | massa |
|----------|-----------|--------|-------|
| ☀️ Café da manhã | 25% | 25% | 25% |
| 🍽️ Almoço | 35% | 35% | 35% |
| 🥗 Lanche da tarde | 15% T_LANCHE | 15% T_LANCHE | 15% T_LANCHE_MASSA |
| 🌙 Jantar | 25% T_JANTAR_EMAGR | 25% T_JANTAR | 25% T_JANTAR |

`LIMITES` — per-category `[min, max]` gram clamps. `gordura` (azeite) is `[10, 20]` and never added to `used` so it can repeat across meals.

`fmtQty(name, g, cal)` — converts grams to human units. Covered: ovos (50g), claras (33g), whey (30g/dose), pão francês/hambúrguer (50g/unidade), pão integral/branco (25g/fatia), banana (80g), maçã/laranja (130g/unidade), morango (15g/unidade), azeite (12g/col. sopa).

### Editable meal plan items

Each food renders as `.meal-item-input` inside `.meal-item-ac`. Each `.meal-item` carries `data-actual-cal`, `data-actual-prot`, `data-actual-carb`, `data-actual-fat`, and `data-food-name` (the current food name, used to look up the previous food on swap).

`setupPlanItemAC(inp, dd)` — wires fuzzy search + keyboard nav. Called after `generatePlan()` and after `addFood()`.

**`selectPlanFood(inp, food)` — two modes:**
- **Swap** (`data-actual-cal > 0`): reads `item.dataset.foodName` to look up old food, computes calorie-equivalent portion clamped by `LIMITES`, calls `showSwapTip()`, then `redistributeDelta(oldCal - actualCal, item)`. `updateTargetTotal()` is **not** called.
- **New item** (`data-actual-cal === 0`): uses `max(LIMITES.min, 100)` as default, then calls `updateTargetTotal()`.

In both modes, `item.dataset.foodName` is updated to the new food name after selection.

`redistributeDelta(delta, excludeItem)` — distributes `delta` kcal proportionally across all DB-matched items with `actualCal > 0`. Last item absorbs rounding remainder (≤ ±1 kcal/item).

`recalcTotals()` — recomputes per-meal `.meal-kcal` chips, macro totals, and day total from `data-actual-*` attributes.

`updateTargetTotal()` — sums all `data-actual-cal` in `#planResult` and writes to `planResult.dataset.targetTotal`. Call after any add/remove.

### Nutritional analysis (`analyzePlan()`)

Button `#btnAnalyzePlan` appears after `generatePlan()`. Reads all `.meal-item` data attributes, looks up fiber (`fib`) per food in `DB`, then evaluates:
- Protein % of calories vs. target range by objective
- Total fiber vs. 25g/day goal
- Fat % of calories (warn if >40% or <15%)
- Total kcal vs. plan target

Results render into `#analysisPanel` as `.tip-item.tip-good/warn/info` cards.

### Contextual swap tip (`showSwapTip()`)

Called from `selectPlanFood()` on swaps. Computes protein and fiber deltas between old and new food portions. If either delta ≥ threshold, inserts a `.swap-tip` element after the `.meal-item` that auto-removes after 3.5 s via `setTimeout`.

### Add / remove meals and foods

`addMeal()` — inserts `.meal-card` with editable `.meal-name-input`.  
`removeMeal(btn)` / `removeFood(btn)` — remove element, then `updateTargetTotal()` + `recalcTotals()`.  
`addFood(btn)` — creates blank `.meal-item` (`actualCal = 0`), wires `setupPlanItemAC`, focuses input.

### PDF export

`printPlan()` — gera PDF real via **jsPDF** (`docs/jspdf.umd.min.js`). Lê os dados do DOM (refeições, alimentos, quantidades, totais) e monta o layout programaticamente. Em ambiente nativo Capacitor usa `Filesystem` + `Share` para salvar e compartilhar o arquivo; em web usa `doc.save()` para download direto. `window.print()` não é mais usado.

`#btnPdf`, `#btnAnalyzePlan`, and `#btnClosePlan` are hidden until `generatePlan()` succeeds.

### Dark / light mode

`toggleTheme()` — flips `data-theme` on `<html>`, saves to `localStorage` key `nd-theme`. IIFE at bottom of `<script>` defaults to `'dark'` if no saved preference.

## Key conventions

- All DB nutritional values are **per 100 g** — never store per-serving values.
- Calorie-equivalence formula must stay symmetrical: `qA * cal_A = qB * cal_B`.
- `--green` is the single hero accent — only the main CTA button and the logo carry green glow. Do not add green glow to other elements.
- Dark mode borders use `rgba(139,92,246,…)` (purple) not green.
- New modals follow the pattern: `modal-bg.hidden` → `modal` → result div toggled with `.hidden`. Field ID prefixes: `w-` water, `h-` Harris-Benedict, `p-` meal planner.
- Result containers that are dark cards (e.g. `.water-result`, `.res-card`) must use **fixed hex backgrounds**, not `var(--charcoal)` — that variable inverts between light and dark modes.
- Presunto, sardinha, atum are **breakfast/snack proteins** — never add to `T_ALMOCO` or `T_JANTAR` templates.
- When **swapping** a meal plan food, `LIMITES` are applied and `redistributeDelta()` is called. `updateTargetTotal()` is NOT called on swap.
- When **adding** a new food, `updateTargetTotal()` MUST be called afterwards.
- After any add/remove of a meal or food, always call `updateTargetTotal()` then `recalcTotals()`.
- GitHub credentials are stored in Windows Credential Manager — `git push` works without a token in the URL.
