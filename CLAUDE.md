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
- **IMC calculator** (`calcIMC()`): Modal opened by `openIMC()`. Requires peso (kg), altura (cm), and idade (years). `openIMC()` pre-fills `i-peso`, `i-altura`, `i-idade` from the water modal fields (`w-peso`, `w-altura`, `w-idade`) if already filled. `imcClass(imc)` maps the result to `{ cor, badge, grade, tip }` per WHO brackets. `imcHTML(imc, alturaM)` renders the full result with ideal weight range. CSS classes `.imc-verde` (healthy), `.imc-amarelo` (attention), `.imc-vermelho` (outside range) provide color-coded gradients.

## Button layout and colors

Three action buttons below the substitution form:
- **Calcular substituição** — charcoal `#2B2B2B`
- **Calcular ingestão de água** — navy `#1a3a5c`
- **Calcular IMC** — purple `#5b21b6`

## Key conventions

- All nutritional values in the DB are **per 100 g**.
- The calorie-equivalence formula must stay symmetrical: changing `qA` or swapping foods should always satisfy `qA * cal_A = qB * cal_B`.
- The `--green` variable is used for interactive elements, header background, and result highlights — changing it affects the entire visual identity.
- The app has no persistence, no backend, and no external requests.
- New features that require user input should follow the modal pattern established for both calculators (`modal-bg` → `modal` → result area toggled with `.hidden`). Field IDs use a prefix: `w-` for water, `i-` for IMC.
