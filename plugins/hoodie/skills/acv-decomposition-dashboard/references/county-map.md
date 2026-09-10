# County map

Read this when building the geographic breakout in §5 of SKILL.md.

## Store → county mapping

`marketIntelligence_pivotQuery` with `rowGroups: [countyCode, countyName, dispensaryNameAnn]` — see `pivotquery-recipes.md`. One-time pull, reused for both months.

## Boundary geometry

Public-domain US counties GeoJSON, filtered to the state's FIPS prefix, projected to static SVG paths at build time:

- `cos(lat)` scale
- y-flip
- `fill-rule="evenodd"`

Add a tighter inset projection for dense small-geography clusters (e.g. NYC boroughs) — the standard state-wide projection compresses them to the point of being unclickable.

## Per-county rollup

For each store, look up its county, then sum into county buckets:

- Category dollars/store-count — **all universe stores**
- Brand dollars/store-count — **retained + won stores** for the subject brand

## Map colour metric

Default to **store-count share**, not dollar share: colour each county by

```
brandStores / categoryStores * 100
```

on a **fixed 0–100% scale**.

Why: this reads intuitively as "how much of this county's shelf space do we have", and because it's a percentage of count it's naturally bounded — no clamping logic is needed for outlier counties, unlike a dollar-weighted share.

Keep both pairs in the per-county data regardless of which one drives the fill:

- `brandStores` / `categoryStores` — for the %, and for the tooltip's raw count
- `brandDollars` / `categoryDollars` — for tooltip context only

The fill colour and the map legend (`0% … 100%`) key off the store-count share only.

### Dollar-weighted fallback

Only build this if the user explicitly asks for a dollar-weighted share instead of store-count share. Dollar share isn't naturally bounded the way a percentage-of-count is, so it needs the older data-relative-max approach:

- Build the domain from counties with a minimum sample size (e.g. `categoryStores >= 5`)
- Clamp above the max

## Wording

Say "X% of dispensaries" or "X of Y dispensaries" — never "X \<category\> stores".

## Interaction

Clicking a county filters the existing store-detail table via a dismissible chip, reusing the segment/search/sort machinery already built into that table — don't build a second, parallel filtering mechanism for the map.
