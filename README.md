# 🎲 DiceBear Avatar Explorer

A small single-page app to interactively explore and customize
[DiceBear](https://www.dicebear.com/) avatars. Everything is generated
**locally in the browser** with the `@dicebear/core` + `@dicebear/collection`
npm packages — there are **no HTTP calls to dicebear.com**.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173).

To build a production bundle:

```bash
npm run build
npm run preview
```

Everything works fully offline after `npm install`.

## What it does

- **Live preview** on the left updates instantly on any change.
- **Style dropdown** switches between human-figure styles: Avataaars,
  Adventurer, Personas, Big Smile, Lorelei. When you switch styles the control
  panel rebuilds to match that style's real options.
- **Schema-driven controls.** The right panel is generated at runtime from the
  selected style's JSON Schema (`style.schema` shipped in the npm package).
  Nothing is hardcoded, so the controls always reflect what the style actually
  supports:
  - **Enum options** (hair/top, clothing, eyes, eyebrows, mouth, accessories, …)
    → a dropdown plus an optional thumbnail grid (toggle `▦ grid`).
  - **Colour options** (skinColor, hairColor, clothesColor, backgroundColor, …)
    → swatches from the schema's palette plus a custom colour picker.
  - **Probability options** (facialHairProbability, glassesProbability, …)
    → a slider with an on/off toggle.
- **Seed** — typing a new seed reshuffles every *auto* (un-pinned) option.
- **Randomize** — new random seed and a random valid value pinned for every
  enum/colour option.
- **Reset** — back to the default seed with all pins cleared.
- **Download SVG**, **Download PNG** (rasterized via canvas), and **Copy config**
  (copies the exact `{ style, options }` JSON so you can reuse it in your own app).

## Pinning

Each DiceBear option takes an **array** of allowed values and the seed picks one
from it. When you choose a value, this app **pins** it — it sets that option to a
single-element array so the chosen feature is guaranteed regardless of the seed.
Un-pinned options stay driven by the seed. The badge on each control shows
`auto` vs `📌 pinned`.

## Terminology

DiceBear has no literal "gender" or "race" option, and this app does not invent
one:

- **Skin tone** is represented by the `skinColor` swatches (the standard approach).
- Instead of a gender toggle, the real hair, facial-hair and clothing options are
  exposed so you can compose whatever look you want.

## Copy config → use in your own app

The **Copy config** button gives you something like:

```json
{
  "style": "avataaars",
  "options": {
    "seed": "explorer",
    "top": ["bigHair"],
    "facialHair": ["beardMajestic"],
    "facialHairProbability": 100,
    "skinColor": ["614335"]
  }
}
```

which you can drop straight into `createAvatar`:

```ts
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

const svg = createAvatar(avataaars, {
  seed: 'explorer',
  top: ['bigHair'],
  facialHair: ['beardMajestic'],
  facialHairProbability: 100,
  skinColor: ['614335'],
}).toString();
```

## Tech

React + Vite + TypeScript, plain CSS. DiceBear `@dicebear/core` **9.4.x** and
`@dicebear/collection` **9.4.x**.
