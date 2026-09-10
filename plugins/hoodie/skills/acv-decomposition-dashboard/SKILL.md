---
name: acv-decomposition-dashboard
description: Build a two-month ACV decomposition dashboard for one or more brands in a state — won/lost/retained store movement, a dollar bridge, whitespace, a county map, and a competitive market-movers panel — from Hoodie market intelligence data. Use this whenever the user asks for a market decomposition dashboard, distribution waterfall, won/lost store analysis, whitespace analysis, store-movement or shelf-share view, or a county/geographic breakout for a brand or portfolio of brands, even if they don't use the word "dashboard". Also use it when the user asks to update or rebuild an existing decomposition dashboard.
---

# ACV Decomposition Dashboard

Produces a single-file HTML dashboard that answers: **where did this brand gain and lose distribution between month A and month B, and what does the rest of the market look like?**

The output has five parts:

| Part | Answers |
|---|---|
| Headline + dollar bridge | How did dollars move: start, same-store change, won, lost, end |
| Store-detail table | Which stores were retained / won / lost / whitespace |
| County map | Which counties have the most and least shelf presence |
| Market movers | Which competitors gained and lost |
| Per-brand tabs (multi-brand builds) | The same view per brand, plus a combined rollup |

**Reference files** — read these when the relevant step tells you to, not upfront:
- `references/pivotquery-recipes.md` — exact pivotQuery call shapes, measured call-volume/payload savings, and data-hygiene gotchas (nulls, brand-name whitespace, synthetic rows)
- `references/county-map.md` — boundary geometry, projection, colour-metric logic, and map interaction

## 1. Confirm the inputs

Ask (AskUserQuestion) for anything not already stated:

- **Brand(s)** — sibling brands can be combined into a company rollup tab plus per-brand tabs.
- **State** and **category**.
- **Two-month window** — a starting month and an ending month.

## 2. Choose the data-pull strategy

This is a real trade-off and the user must pick. Don't decide silently.

| | `marketIntelligence_acv` per brand/month | `marketIntelligence_pivotQuery` consolidated |
|---|---|---|
| Best for | 1–3 brands | 4+ sibling brands (portfolio rollup) |
| Call volume | Higher — see `references/pivotquery-recipes.md` for measured numbers | Far lower — see the same reference |
| Stock health | `AVG_DAYS_IN_STOCK_PERCENT`, `AVG_OOS_SKU_PERCENT` | **Not available.** Only `avgOutOfStockDays`, a day-count gap — not a comparable % |

Choosing pivotQuery means the store-detail table loses its "In stock %" / "OOS %" columns and the mix-shift panel (§6) can't be built at all. Those fields must be **dropped, not approximated**. Put the choice to the user explicitly:

- **Full efficiency** — pivotQuery, drop the stock-health fields.
- **Status quo** — stay on `marketIntelligence_acv`, keep stock health, accept the call volume.
- **Document only** — note the pattern for next time, don't rebuild.

## 3. Pull the data

Read `references/pivotquery-recipes.md` first if you're on the consolidated path — it has the exact `rowGroups`/`columnGroups`/`metrics` shapes for the per-store brand pull, the universe pull, and the store→county pull, plus the data-hygiene rules (null handling, synthetic rows, brand-name whitespace) that apply regardless of which path you're on.

Whichever path you're on, you also need:

- **Category brand report** — `marketIntelligence_acv`, `groupBy: ["Brand"]`, filtered to state + category. Pull **wide** (limit 60–100); it feeds the market-movers panel. Already a single call, doesn't benefit from consolidation.
- **County metadata** — see §5 / `references/county-map.md`. Also a single call.

## 4. Decompose store movement (python)

Match stores across months by name. Normalise first: strip newlines and extra whitespace, convert curly quotes to straight, drop trailing parentheticals.

```
retained   = in both months
won        = ending month only
lost       = starting month only
whitespace = universe − (stores in either month)
```

Dollar bridge: `start $ + same-store Δ + won $ − lost $ = end $`

Assert `retained + won == ending stores` and `retained + lost == starting stores` before going further.

For a company rollup across sibling brands, write a variadic `merge(*dicts)` that sums dollars/units/SKUs across any number of brand dicts and dollar-weights the price and any other weighted averages. This scales to any brand count — don't hand-write pairwise merges.

Every subject brand must appear in the supporting ACV report table even if it falls outside the top-N by ACV%. Look up and append missing subject-brand rows from the full unfiltered brand list, re-sort, then highlight all of them.

## 5. County / geographic breakout

Read `references/county-map.md` for the full detail (boundary geometry, projection, colour-metric logic, wording, and interaction). In brief:

- Map stores to counties via the pivotQuery pull described there.
- Colour counties by **store-count share** (`brandStores / categoryStores * 100`) on a fixed 0–100% scale by default — not dollar share, and not a data-relative max.
- Clicking a county filters the store-detail table via a dismissible chip.

## 6. Market movers

Built from the wide brand ACV report, excluding the subject brand(s) and the null/unbranded row. Three tight panels, a handful of entries each, one line of context per entry:

| Panel | Selection |
|---|---|
| Established gainers | Large store base (200+), still meaningfully ACV-positive |
| Fast-moving newcomers | Small store base (under ~150–180), large positive ACV% swing |
| Biggest losers | Sort `ACV%_DIFF` ascending; report store count **and** dollar change together |

**Store-level mix-shift panel** (ACV-tool path only): among retained stores, rank by `|SKU count delta|` for the subject brand, paired with OOS% change. This needs `AVG_OOS_SKU_PERCENT` and so isn't buildable on the pivotQuery path — say so rather than silently omitting it.

## 7. Build the dashboard

Single-file HTML. This skill carries no brand theme of its own — confirm styling with the user (or their own brand skill, if one is available in the environment) before building:

- If the user has given a house style, palette, or logo, or a client-brand skill is available in the environment, use that.
- Otherwise, ask the user for their preferred palette/logo, or default to a clean, neutral theme (a single accent colour, generous whitespace, plain sans-serif) — do not invent or assume any particular company's branding.

If `dataviz` and/or `artifact-design` skills are also available, consult them for chart and visual-design conventions. If they're not available, fall back to: consistent axis and legend treatment across all charts, one accent colour for emphasis, and generous whitespace over dense layouts.

- Make **every** supporting report/data table sortable by clicking column headers (toggle direction on repeat click), not just the primary store-detail table.
- Pick a sensible default sort — dollars descending usually beats a rate-based metric, since scale is normally the question.
- For 4+ brand tabs: move any panel whose structure is identical across tabs but whose content is tab-reactive (the mix-shift panel, for instance) into a single page-level section updated imperatively per tab, rather than duplicating markup inside every tab template. Shorter page, and it reads better as a bottom-of-page investigative section.

## 8. Render-test before publishing

Wrap in a doctype shell and load in headless Chromium. In this environment:

```
Playwright: executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
            args: ['--no-sandbox']
```

Check zero page/console errors across **every tab × segment combination**, verify DOM sums against the headline numbers, and verify any changed metric (e.g. a map recoloured to a new field) against its raw source numbers via a DOM query — not visually.

## 9. Publish

Publish with the Artifact tool. Keep the same file path/URL to update the same link.

## Verification checklist

Run all of these before publishing:

- [ ] `retained + won == ending store count` and `retained + lost == starting store count`, for every view.
- [ ] Per-store dollar sums equal headline start/end dollars, for every view.
- [ ] Combined tab equals the sum of its brands **exactly**, not approximately, when using a `merge()` rollup.
- [ ] Dollar bridge closes: `start + same-store + won − lost = end`.
- [ ] No JS/console errors across every tab × segment × map-click combination.
- [ ] Map (store-count share): every county's share is in [0, 100] and equals `brandStores / categoryStores * 100` exactly — spot-check several via DOM query. Legend reads a fixed 0%/100%, not a data-relative max.
- [ ] After any pivotQuery rebuild: the new pipeline's combined/company-rollup dollar total matches the prior build's total exactly. This is the single most reliable check that consolidation didn't silently drop or double-count rows.
