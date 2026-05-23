# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Single-file web app (`index.html`) — no build step, no dependencies, no server required. Open directly in a browser.

## Architecture

Everything lives in `index.html`:

- **CSS** (`<style>`): CSS custom properties in `:root` drive the entire color palette. Branding colors: `--green: #62C823` (Nunzio lime green), `--charcoal: #2B2B2B`.
- **Food database** (`const DB`): Array of ~84 objects `{ name, cal, prot, carb, fat, fib }` — values are per 100 g. This is the source of truth for all calculations.
- **Autocomplete** (`setupAC(inputId, dropdownId)`): Returns a `{ getFood() }` handle. Two instances — `acA` (current food) and `acB` (substitute).
- **Food substitution** (`calculate()`): Core formula — `qB = (qA / 100 * fA.cal) / fB.cal * 100`. Macros are scaled linearly from per-100g values. Results and macro comparison bars are rendered into `#results`.
- **Water calculator** (`calcWater()`): Modal opened by `openWater()`. Uses WHO age-bracket factors (ml/kg): 18–30 → 40, 31–55 → 35, 56–65 → 30, 65+ → 25. Also shows BMI. Modal closes on `Esc`, outside click, or `×` button.

## Key conventions

- All nutritional values in the DB are **per 100 g**.
- The calorie-equivalence formula must stay symmetrical: changing `qA` or swapping foods should always satisfy `qA * cal_A = qB * cal_B`.
- The `--green` variable is used for interactive elements, header background, and result highlights — changing it affects the entire visual identity.
- The app has no persistence, no backend, and no external requests.
- New features that require user input should follow the modal pattern already established for the water calculator (`modal-bg` → `modal` → result area toggled with `.hidden`).
