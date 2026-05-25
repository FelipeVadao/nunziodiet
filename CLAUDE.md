# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Single-file web app (`index.html`) — no build step, no dependencies, no server required. Open directly in a browser. Hosted on GitHub Pages at `felipevadao.github.io/nunziodiet`.

## Architecture

Everything lives in `index.html`: `<style>` → `<body>` (HTML) → `<script>` (JS). No modules, no bundler.

### CSS

CSS custom properties in `:root` drive the entire palette. Core tokens: `--green: #62C823`, `--charcoal: #2B2B2B`. Dark mode is toggled via `data-theme="dark"` on `<html>` — all overrides live under `[data-theme="dark"]` selectors at the end of `<style>`. The mobile breakpoint is `@media (max-width: 520px)` and uses a bottom-sheet modal pattern (`align-items: flex-end`, rounded top corners).

**Dark mode aesthetic:** pure black header (`#000`) with `#62C823` bottom border and glow; logo "NUNZIO" in green with `text-shadow` radial glow, "DIET" in white; body `#090909`; cards `#111` with green-tinted borders. Dark mode root vars override `--green-bg`, `--border`, `--card-shadow` to near-black values.

**Light mode header:** `linear-gradient(160deg, #72d426, --green-dark)`.

### Food database (`const DB`)

Array of ~223 objects `{ name, cal, prot, carb, fat, fib }` — all values per 100 g. Source: TACO 4th edition. Source of truth for all calculations.

### Autocomplete + fuzzy search

`norm(s)` — strips diacritics for accent-insensitive comparison.  
`levenshtein(a, b)` — edit distance between two strings.  
`fuzzyScore(foodName, query)` — single character: returns 0 if any word in the food name starts with that character, `Infinity` otherwise. Two+ characters: returns 0 for substring match, 1–2 for typo tolerance (e.g. "Arros" → "Arroz"), `Infinity` for no match.  
`setupAC(inputId, dropdownId)` — wires an input to a dropdown, sorts results by `fuzzyScore`, returns `{ getFood() }`. Two instances: `acA` (current food) and `acB` (substitute).

### Food substitution (`calculate()`)

Core formula: `qB = (qA / 100 * fA.cal) / fB.cal * 100`. Macros scaled linearly from per-100g values. Results rendered into `#results`.

### Water calculator (`calcWater()`)

Modal opened by `openWater()`. WHO age-bracket factors (ml/kg): 18–30 → 40, 31–55 → 35, 56–65 → 30, 65+ → 25.

### Harris-Benedict calculator (`calcHB()`)

Modal opened by `openHB()`. Fields: `h-sexo`, `h-ativ` (activity factor 1.2–1.9), `h-peso`, `h-altura`, `h-idade`. Computes TMB and GET. Renders 3 clickable goal cards — each calls `usarNoPlano(kcal, objetivo)`, which closes the HB modal, pre-fills `p-cal`/`p-objetivo` in the meal planner, and opens it.

### Meal planner (`generatePlan()`)

Modal opened by `openPlan()`. Inputs: `p-objetivo` (emagrecer / manter / massa), `p-cal`, dietary restriction checkboxes (`r-veg`, `r-gluten`, `r-lactose`).

**Data layer:**  
`PLAN_NAMES` — Set of ~57 practical Brazilian supermarket foods that form `PLAN_DB = DB.filter(f => PLAN_NAMES.has(f.name))`.  
`getPlanDb()` — returns `PLAN_DB` filtered by the current restriction checkboxes.

**Categorisation (`catFood(f)`):** assigns each food to one of: `proteina_cafe`, `proteina_refeicao`, `graos_cafe`, `graos_refeicao`, `leguminosa`, `gordura`, `fruta`, `verdura`, `laticinios` via regex.

**Protein context constants** (defined before templates, used inside templates to enforce correct meal context):
- `P_FRANGO`, `P_BOVINA`, `P_PEIXE`, `P_SUINO` — hot-meal proteins only (grilled/roasted meats/fish)
- `P_OVO`, `P_FRIOS` — breakfast/snack proteins (eggs, atum, presunto, sardinha)
- `L_FEIJAO`, `L_GRAO`, `L_TODAS` — legume pools
- `C_ARROZ`, `C_BATATA`, `C_RAIZ` — carb pools

**Template system:**  
Each `PLANOS` entry has `templates: T_*` — an array of meal templates. `generatePlan` picks one template at random per meal. A template is an array of *pools*. A pool is:
- A string → category name (e.g. `'verdura'`) — picks any food in that category
- `string[]` where all elements are category names → picks from combined categories
- `string[]` where elements are food names → picks from that explicit food list

`pickFood(pool, used, db)` distinguishes the three cases via `CAT_NAMES` (a Set of all category name strings).

**Template constants** (all defined before `PLANOS`):
`T_CAFE`, `T_LANCHE`, `T_LANCHE_MASSA`, `T_ALMOCO`, `T_JANTAR_EMAGR`, `T_JANTAR`.

**Meal structure — 4 meals per objective:**

| Refeição | emagrecer | manter | massa |
|----------|-----------|--------|-------|
| ☀️ Café da manhã | 25% | 25% | 25% |
| 🍽️ Almoço | 35% | 35% | 35% |
| 🥗 Lanche da tarde | 15% T_LANCHE | 15% T_LANCHE | 15% T_LANCHE_MASSA |
| 🌙 Jantar | 25% T_JANTAR_EMAGR | 25% T_JANTAR | 25% T_JANTAR |

`LIMITES` — per-category `[min, max]` gram clamps applied at generation time. `gordura` (azeite) is `[10, 20]` and is never added to the `used` Set so it can repeat across meals.

`fmtQty(name, g, cal)` — converts grams to human units for specific foods. Returns `"Xg (N unidades) · Y kcal"`. Covered foods: ovos (50g), claras (33g), whey (30g/dose), pão francês (50g/unidade), pão de hambúrguer (50g/unidade), pão integral/branco (25g/fatia), banana (80g), maçã/laranja (130g/unidade), morango (15g/unidade), azeite (12g/col. sopa).

### Editable meal plan items

After generation, each food renders as a text input (`.meal-item-input`) inside `.meal-item-ac` (positioned wrapper hosting autocomplete dropdown `.meal-item-dd`). The full `DB` is searchable — not just `PLAN_DB`.

`setupPlanItemAC(inp, dd)` — wires fuzzy search + keyboard navigation to a plan item input. Called for each `.meal-item-input` after `box.innerHTML` is set, and again for inputs created by `addFood()`.

**`selectPlanFood(inp, food)` — two modes:**
- **Swap** (`data-actual-cal > 0`): computes `neededCal = dataset.targetTotal − sum(other items' data-actual-cal)`, sets `g = round(neededCal / food.cal * 100)`, forces `item.dataset.actualCal = neededCal` (exact, no rounding drift). `LIMITES` intentionally not applied. Guarantees the day total never changes when swapping.
- **New item** (`data-actual-cal === 0`): uses `max(LIMITES.min, 100)` as default portion, sets `actualCal` from that, then calls `updateTargetTotal()` to absorb the new food into the locked total.

`recalcTotals()` — recomputes per-meal `.meal-kcal` chips, macro totals, and the day total from current `data-actual-*` attributes. Shows the live computed sum (not a locked value), so add/remove operations naturally update the display.

`updateTargetTotal()` — sums all `.meal-item[data-actual-cal]` in `#planResult` and writes the result back to `planResult.dataset.targetTotal`. Call this after any add/remove so subsequent swaps lock to the new total.

### Add / remove meals and foods

Each generated meal card has:
- **"Excluir refeição"** button (`.btn-rm-meal`) — red pill in the meal title; calls `removeMeal(btn)`
- **"＋ Alimento"** button (`.btn-add-food`) — green dashed, at the bottom of the card; calls `addFood(btn)`
- Each food item has a **red × button** (`.btn-rm-food`); calls `removeFood(btn)`

A **"＋ Adicionar refeição"** button (`.btn-add-meal`, violet) sits between the meal cards and the total bar; calls `addMeal()`.

`addMeal()` — inserts a new `.meal-card` with an editable `.meal-name-input` and no foods; user types the name and adds foods via `addFood`.  
`removeMeal(btn)` / `removeFood(btn)` — remove the element, then call `updateTargetTotal()` + `recalcTotals()`.  
`addFood(btn)` — creates a blank `.meal-item` (`actualCal = 0`), wires `setupPlanItemAC`, focuses the input.

### PDF export

`printPlan()` — syncs `.meal-item-input` `.value` → `value` attribute (so edited names survive innerHTML clone), copies `#planResult` into the hidden `#printArea` div with a header (`#printMeta`), then calls `window.print()`. Print styles strip interactivity from inputs and hide dropdowns. No external libraries.

`#btnPdf` and `#btnClosePlan` are hidden until `generatePlan()` succeeds. Similarly `#btnCloseHB` and `#btnCloseWater` appear only after their respective calculations.

### Dark / light mode

`toggleTheme()` — flips `data-theme` on `<html>`, saves to `localStorage` under key `nd-theme`. On page load an IIFE reads `localStorage` or falls back to `prefers-color-scheme`. Toggle button `#themeToggle` is positioned `absolute` inside the `<header>`.

## Button colors

| Button | Light | Dark |
|--------|-------|------|
| Calcular substituição | `--green` + charcoal text | same |
| Calcular água | `#1a3a5c` (navy) | `#2563eb` (blue-500) |
| Calcular gasto calórico | `#5b21b6` (violet) | `#7c3aed` (violet-500) |
| Sugerir refeições | `#0f766e` (teal) | `#0d9488` (teal-500) |
| ＋ Adicionar refeição | `#5b21b6` (violet) | `#4c1d95` (violet-900) |
| ＋ Alimento | dashed `--green` border | same, translucent |

## Key conventions

- All DB nutritional values are **per 100 g** — never store per-serving values.
- Calorie-equivalence formula must stay symmetrical: `qA * cal_A = qB * cal_B`.
- `--green` affects header, main button, focus rings, and result highlights — changes ripple everywhere.
- New modals follow the pattern: `modal-bg.hidden` → `modal` → result div toggled with `.hidden`. Field ID prefixes: `w-` water, `h-` Harris-Benedict, `p-` meal planner.
- Presunto, sardinha, atum are **breakfast/snack proteins** — never include them in `T_ALMOCO` or `T_JANTAR` templates.
- When **swapping** a meal plan food, `LIMITES` are not applied — the calorie balance constraint takes priority.
- When **adding** a new food, `LIMITES.min` (or 100 g, whichever is larger) is used as the default portion, and `updateTargetTotal()` must be called afterwards.
- After any add/remove of a meal or food, always call `updateTargetTotal()` then `recalcTotals()`.
- GitHub credentials are stored in the Windows Credential Manager — `git push` works without any token in the URL.
