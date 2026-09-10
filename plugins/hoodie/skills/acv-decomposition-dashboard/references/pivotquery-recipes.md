# pivotQuery recipes

Read this when building the consolidated (4+ brand) data-pull path from §2/§3 of SKILL.md.

## Per-store brand data (one call, paginated via cursor)

```
rowGroups:    [{kind: attribute, field: "brand"},
               {kind: attribute, field: "dispensaryNameAnn"}]
columnGroups: [{kind: time, field: "seenAt"}]
period:       2                       # covers both months in one shot
metrics:      ["dollars", "units", "skuCount", "weightedAveragePrice"]
filter:       state + full brand-name list
```

## All-category universe pull

Same call, dropping the brand grouping:

```
rowGroups: [{kind: attribute, field: "dispensaryNameAnn"}]
```

Source the brand data and the universe pull from pivotQuery **together**. `dispensaryNameAnn` and the ACV tool's `DISPENSARY_NAME` occasionally differ by a few characters — mixing sources reintroduces a name-matching problem the consolidated path otherwise avoids entirely.

## Store → county mapping (one-time pull)

```
rowGroups: [countyCode, countyName, dispensaryNameAnn]
```

One pull, reused for both months of the build — county assignment doesn't change month to month.

## Call volume, measured

Tested on a 9-brand, 2-month NY build:

| | Per-brand-per-month (`marketIntelligence_acv`) | Consolidated (`pivotQuery`) |
|---|---|---|
| Brand pulls | 18 separate calls | 2 calls (paginated via cursor) |
| Universe pull | 2 calls (one per month) | 1 call |
| Total (incl. wide brand report + county metadata) | ~23 calls | ~6 calls |
| Payload | Per-row named-field JSON, ~24 repeated keys per row | Positional arrays, columns defined once — roughly 7x less raw payload for the same store coverage |

## Things that trip this up

- **Nulls are real, not missing data.** A null value for one month while the other month has data means the store didn't carry the brand that month — exclude it from that month's set. A literal `0` is a real, present-that-month record and should stay in the set.
- **Brand names are UPPER-CASE and can carry unexpected internal whitespace** (e.g. a genuine double space inside a brand name). If a guessed spelling returns zero rows, search the full unfiltered brand list before concluding there's no data — an empty result from a filtered query more often means a spelling mismatch than an absence of data.
- **Exclude** the synthetic `Non-Tracked <State> Sales` dispensary row from every pull (a platform bucket for unattributed sales, not a real store), and any `BRAND: null` row from brand-vs-brand comparisons.
- **Oversized results** are saved to files under the session's tool-results dir. Copy them to a working folder and process with `jq`/python — never transcribe rows by hand.
