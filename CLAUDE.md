# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Single-file web app (`index.html`) — no build step, no dependencies, no server required. Open directly in a browser.

## Architecture

Everything lives in `index.html`:

- **CSS** (`<style>`): CSS custom properties in `:root` drive the entire color palette. Branding colors: `--green: #62C823` (Nunzio lime green), `--charcoal: #2B2B2B`.
- **Food database** (`const DB`): Array of 223 objects `{ name, cal, prot, carb, fat, fib }` — values are per 100 g. Expanded with TACO (Tabela Brasileira de Composição de Alimentos) 4th edition. Source of truth for all calculations.
- **Autocomplete** (`setupAC(inputId, dropdownId)`): Returns a `{ getFood() }` handle. Two instances — `acA` (current food) and `acB` (substitute).
- **Food substitution** (`calculate()`): Core formula — `qB = (qA / 100 * fA.cal) / fB.cal * 100`. Macros are scaled linearly from per-100g values. Results and macro comparison bars are rendered into `#results`.
- **Water calculator** (`calcWater()`): Modal opened by `openWater()`. Uses WHO age-bracket factors (ml/kg): 18–30 → 40, 31–55 → 35, 56–65 → 30, 65+ → 25. Shows daily liters and glass count only — no BMI. Modal closes on `Esc`, outside click, or `×` button.
- **Harris-Benedict calculator** (`calcHB()`): Modal opened by `openHB()`. Inputs: sexo (m/f), nível de atividade (select, 1.2–1.9), peso, altura, idade — last three pre-filled from water modal (`w-peso`, `w-altura`, `w-idade`). Computes TMB (basal metabolic rate) and GET (total energy expenditure = TMB × activity factor). Displays three clickable goal cards (emagrecer GET−500, manter GET, ganhar massa GET+400). Each card calls `usarNoPlano(kcal, objetivo)` which closes the HB modal, pre-fills `p-cal` and `p-objetivo` in the meal planner, and opens it directly. Button is purple `#5b21b6`.

## Meal planner (`generatePlan()`)

Modal opened by `openPlan()`. Inputs: `p-objetivo` (emagrecer / manter / massa) and `p-cal` (daily kcal target). Uses `PLAN_DB` — a 52-food curated subset of `DB` filtered by `PLAN_NAMES` (practical foods found in any major Brazilian supermarket: frango, ovo, atum, arroz, feijão, batata, pão, tapioca, fruits, vegetables, dairy). `catFood(f)` assigns each food to a category (`proteina`, `carbo`, `verdura`, `fruta`, `laticinios`) via regex. `PLANOS` defines 5–6 meal slots per objective, each with a calorie percentage (`pct`) and ordered category list. `pickFood(cat, used)` draws a random food from `PLAN_DB` for that category, excluding already-used foods. Portion grams are calculated from the slot's calorie target and clamped by `LIMITES`. Snack slots use `fruta` + `laticinios` (no oleaginosa). Modal closes on `Esc`, outside click, or `×`. Button is teal `#0f766e`.

## Button layout and colors

Four action buttons below the substitution form:
- **Calcular substituição** — charcoal `#2B2B2B`
- **Calcular ingestão de água** — navy `#1a3a5c`
- **Calcular gasto calórico** (Harris-Benedict) — purple `#5b21b6`
- **Sugerir refeições do dia** — teal `#0f766e`

## Key conventions

- All nutritional values in the DB are **per 100 g**.
- The calorie-equivalence formula must stay symmetrical: changing `qA` or swapping foods should always satisfy `qA * cal_A = qB * cal_B`.
- The `--green` variable is used for interactive elements, header background, and result highlights — changing it affects the entire visual identity.
- The app has no persistence, no backend, and no external requests.
- New features that require user input should follow the modal pattern established for all calculators (`modal-bg` → `modal` → result area toggled with `.hidden`). Field IDs use a prefix: `w-` for water, `h-` for Harris-Benedict, `p-` for the meal planner.
