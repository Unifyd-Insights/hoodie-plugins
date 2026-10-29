---
name: "shelf-check"
description: "Shelf health check for a dispensary. Turns a POS export plus Hoodie market data into a shareable report page. It starts with the shelf by category versus the state, then gives keep, fix or cut verdicts per product line, with strains to rotate, replacement lines for every cut and a 30-day plan for every fix. For a multi-store file it reports at the total banner (chain) level and flags lines where one location drives, lags, spikes or slides. Use this whenever someone uploads POS sales or inventory files and asks to check their shelf, shelf health, assortment, menu, what to cut, what to replace, slow movers or dead stock, even if they don't say \"shelf check\"."
---

# Shelf Check

The reader is a store owner, manager or buyer who is not data savvy. They upload whatever their POS exports and want to know what to do with their shelf. Do the analysis quietly and hand them a clean, shareable, Hoodie-branded report page, an email-safe PDF and HTML copy to attach to client emails, and a 3–5 line summary in chat.

## Hoodie branding

Every page this skill publishes is a Hoodie Analytics asset, so it follows the `jesse-hoodie-brand-kit` skill. The engine already bakes in the visual layer; you own the words.

- **Look (built into `render`):** a Brand Dark Green to Brand Dark Navy header band with the white reversed wordmark, Nunito headings, Inter body and numbers, Hoodie Blue `#1D3463` headings and bars, Hoodie Green `#50BB80` accents, and a Hoodie footer line. Verdict colors come from the palette (Keep: green, Fix: gold, Rotate: navy, Watch: slate). Cut uses one functional red, the only off-palette color, because "remove this" needs to read instantly; keep it to the Cut status only.
- **Logo:** pass `--logo` the reversed wordmark from the brand kit (`assets/logo_wordmark_white.png`). Find it with `find / -name logo_wordmark_white.png -path '*hoodie-brand-kit*' 2>/dev/null | head -1`. The engine trims and shrinks it and embeds it in the page. If the file isn't found, it falls back to a text wordmark, so never redraw the logo.
- **Voice for everything you write into `extra.json` and the chat reply:** the store is the hero and Hoodie is the guide. No exclamation points, no urgency language, no em dashes (use a period, comma, colon or parentheses). Never say "menu" or "menus" for Hoodie's data; say storefront data, listings, items or "what's on the shelf". Lead with what the store should do, not with money; dollars are evidence, not the headline.
- **Brand check before publishing:** search `extra.json` and the rendered page for the em dash character and the word "menu"; there should be none.
- **Email delivery:** the interactive `report.html` carries JavaScript, and Gmail and other mail scanners flag HTML attachments with scripts as a virus. Never hand it over as an email attachment. Every run also builds a script-free HTML copy and a PDF (step 8), and the PDF is the file to attach.

## Look at the shelf in three layers, widest first

Judging every strain on its own is noise. Blue Dream and Gelato in the same brand's 2g all-in-one are one buying decision, and a buyer decides space by category before brand. So the check runs top-down:

1. **Shelf space** (category + form + size, e.g. "1g all-in-ones", "14g flower", "100mg 10pk gummies"). Does this space earn its share? Compare the store's share of the category's sales with the state's share from Hoodie (statewide by default; county only when the user asks for a local view). Also check how many products split its sales.
   - **Under-built**: the state sells much more here; add a strong line.
   - **Crowded**: too many products for the sales.
   - **Over-built**: bigger than the state *and* crowded.
   - **Heavy**: a much bigger share of the category than in the state (over 1.6× the state's share, at least 5% of the category and 5 points above the state), but its products sell at a normal pace, so it isn't crowded. Not a cut signal on its own: it's fine when the store means to specialize there; otherwise hold new lines and steer new buys toward under-built spaces.
   - **Balanced**.
2. **Product line** (one brand's product in that space, all strains together, e.g. "Grow Sciences Live Resin 2g all-in-one"). Each line gets one verdict, judged against other lines in the same space:
   - **Keep**: sells at or above similar products per strain. Flag strains that need reordering.
   - **Fix**: should sell better. Most strains ran out, its brand is strong in the state but it's slow here, or it's the only line in its space. It gets a cause and a 30-day plan.
   - **Cut**: the whole line is under half the pace of similar lines, weak in the state, not new and not the only option. It gets an exit step and up to 3 replacement lines: brands the store doesn't carry in that space, ranked by statewide sales.
   - **Watch**: new, or middling.
3. **Strain**, only inside lines worth keeping or fixing. A strain selling under 40% of its line's average is **Rotate**: swap it for one of that line's best-selling strains in the state that the store doesn't carry. A strain in a cut line isn't judged on its own; the line goes.

Write for the store team: say "sells about 12 a week", "ran out", "$640 sitting on the shelf". Don't show scores, percentiles or words like velocity, SKU rationalization, peer group or median.

**Replacements and rotate picks come only from Hoodie market data.** The POS file defines what's being replaced (size, form, price) and which brands and strains are already on the shelf, so those can be excluded. The store's own products are never suggested as replacements.

## Chains: report at the banner level, then flag the locations

When the file holds several stores of one banner, the main page is the whole chain, not one page per store. A buyer orders for the chain, so the shelf, the line calls, replacements and gaps are read on all stores added together. Then the page looks underneath the total for stores that are out of step, because a chain number can hide a store problem:

- **Your stores** table: each store's weekly sales, share of chain sales, trend (when the file has a longer window such as L3M next to L4W) and its own keep, fix and cut counts.
- **Location flags**, one card per line, strongest first (up to 12):
  - **One store drives it**: a store sells over half the line's chain sales and at least twice the fastest other store's pace (scaled to store size). The line looks stronger chain-wide than it is; order by store and learn from that store.
  - **Lagging at one store**: the line works elsewhere, but one store sells under 40% of even the slowest other store's pace. The fix is local (stock, shelf spot, price), so don't cut it chain-wide.
  - **Spike / Slide** (needs a longer window): a store moved at least 30% and 5 a week off its own longer-window pace, and at least 25 points more than the other stores did. The card says how much of the chain's change came from that store. Category-level spikes and slides (20% and $500 a week, mostly from one store) also show.
  - **Keep at one store only**: the chain call is Cut, but the line still earns its space at one or two stores.
- Comparing each store with its fastest and slowest peer, not the chain average, keeps one outlier store from making every other store look out of line.
- Chain on-hand adds the stores together, so chain-level reorder flags are usually empty even when single stores are about to run out. Run `finalize` on each store folder too, count its `reorder_now`, and put the total on the Keep tile with `reorder_tile` in `extra.json` (e.g. "55 store-level reorders due within two weeks").

Store-level pages are still available: they are built along the way, so offer them as a follow-up.

## The engine

The analysis is done by `shelf_check.py`, embedded at the bottom of this file between the `ENGINE START` and `ENGINE END` markers. Use it rather than re-deriving the logic. The cleaning, line grouping, space comparison and verdict rules were tuned on a real 1,900-product export, and the script keeps every run consistent. Extract it to your working directory without retyping it:

```bash
python3 - "$SKILL_DIR/SKILL.md" <<'PY'
import sys, re
t = open(sys.argv[1]).read()
code = re.search(r'<!-- ENGINE START -->\s*```python\n(.*?)```\s*<!-- ENGINE END -->', t, re.S).group(1)
open('shelf_check.py', 'w').write(code); print('engine ready')
PY
```

`$SKILL_DIR` is the skill's base directory shown when the skill loads. If the file can't be read, write the code block out yourself.

| Stage | Command | Produces |
|---|---|---|
| prep | `python3 shelf_check.py prep <file> --out work [--days N] [--store NAME] [--long-days N]` | `products.csv`, `summary.json` |
| score | `python3 shelf_check.py score work --market work/market.csv --market-space work/market_space.csv --house "BRAND,BRAND"` | `lines.csv`, `spaces.csv`, `verdicts.csv`, `cut_slots.csv`, `rotate_lines.csv`, `price_checks.csv` |
| add-repl | `python3 shelf_check.py add-repl work --slot S1 --json result.json` (once per Hoodie query) | appends to `work/replacements.csv` |
| finalize | `python3 shelf_check.py finalize work --repl work/replacements.csv --prices work/nearby_prices.csv --title "Store" --period "Sep 15 – Oct 12, 2026" --market-label "Hoodie, Arizona statewide, Jul–Sep 2026" --scope state` | `report.json` |
| render | `python3 shelf_check.py render work --extra work/extra.json --logo /path/to/logo_wordmark_white.png --out work/report.html` | the interactive Hoodie-branded report page (for publishing only) |
| render --static | same as render plus `--static --out "Store_Shelf_Health.html"` | email-safe page: no JavaScript, no external links, full product list as plain rows |
| pdf | `python3 shelf_check.py pdf "Store_Shelf_Health.html" --out "Store_Shelf_Health.pdf"` | Letter-size PDF in the light theme, the file to attach to emails |
| banner | `python3 shelf_check.py banner work_store1 work_store2 ... --out work_banner --name "Banner"` (after prep and score in each store folder) | `work_banner/products.csv`, `locations.json`; then run score, finalize and render on `work_banner` |

`prep` reads a shorter and a longer sales window when the file has both (e.g. "L4W Units" plus "L3M Units", or "Units Long" / "Sales Long"); the days come from the column names, or pass `--long-days`. The longer window only feeds the spike and slide flags and the store trend column. `finalize` adds the store table and location flags whenever the folder has a `locations.json`.

`--market`, `--market-space`, `--repl` and `--prices` are optional. Leave out any you couldn't build; the page drops the parts that need them.

## Workflow

### 1. Get the file and ask only what you can't tell

Best input is one report with each product's units sold, sales, units on hand, price and cost over the last 4–12 weeks. Hoodie retail exports and most POS product-sales reports work as-is (CSV or Excel; the engine finds the header row and recognises common column names). Ask at most two short questions, and only when the file doesn't answer them:

1. How many days of sales the report covers (the engine reads "(28 Days)"-style headers and date columns itself).
2. Only if the stores in the file belong to different banners: which banner to report on. Several stores of one banner get the banner report with location flags by default; don't ask.

If there are no units on hand, run anyway and say reorders and shelf dollars are missing. If there are no sales at all, explain in two sentences which report to pull.

A "Received Date" or "Days Since Received" column usually marks the latest delivery, not the first sale, so don't map it to first-sale dates (it would make nearly everything look new).

### 2. Prep and sanity-check

Run `prep`. Read the printout: columns used, rows removed, products per category, and whether a longer window was found (`long_days`).

For a multi-store file, run `prep --store "<name>"` and then `score` once per store, each into its own folder, then `banner <store folders> --out work_banner --name "<Banner>"`. Everything from step 4 on runs on `work_banner` (step 3's market files serve all of them). Score the store folders with the same `--market`, `--market-space` and `--house` arguments as the banner, so the per-store calls in the store table match.

- **Categories**: these are inferred from product names when the file has none. Look at anything that landed in `Other` or `Accessories`, and check a handful of rows per category in `products.csv`.
- **Lines**: skim `line_name` for the biggest brands. Lines group by brand, then series words (live resin, liquid diamonds, rosin, noir, gummy…), then form, size and pack. A brand selling two very different price points at one size gets split, e.g. "(~$30)" vs "(~$45)".
- **Fixes**: if a pattern is misread, edit `CAT_RULES`, `SUBFORMS` or `SERIES` in your copy of the script and re-run prep. A store-specific naming habit and a sub-brand word that should start its own line are the usual causes.
- **Odd headers**: if prep stops with "Missing required columns", rename the file's headers to plain ones (`Dispensary, Product, Brand, Category, Units Sold, Net Sales, Units On Hand, Price, Cost`) in a copy and prep that. The engine already reads common "L4W"-style headers such as "L4W Unit Sales" and "Store Location".

### 3. Pull the local market from Hoodie

Skip this step if the Hoodie tools aren't connected; the engine then judges on the store's own sales and trend, and there is no market comparison. Otherwise compare with the whole state: filter every market query below by `states` only, use the last three full months, and pass `--scope state` to `finalize` with a label such as "Hoodie, Missouri statewide, Jul–Sep 2026". The same statewide pull serves every store in a banner. Use a county view only when the user asks for one: resolve the county with `filters_values` (`filterKey: "countyNames"`, by state and city), add `countyNames` to every market query (all the stores' counties for a banner) and pass `--scope county`.

Statewide pulls are large. The brand query can run past 1,000 rows, so check `cursor` and fetch the next page with the identical request before building `market.csv`. Nearby price checks (step 6) stay local either way, because shoppers compare prices with stores near them.

- **Brand strength** → `work/market.csv`, columns `category,brand,m1,m2,m3,stores`. One `marketIntelligence_pivotQuery`:
  - rows `category` + `brand`, columns `seenAt`, metrics `dollars` + `dispensaryCount`, `pageSize` 1000
  - m1 is the oldest month; `stores` is the dispensary count in the latest month
  - Hoodie uses `Oral` for tinctures and capsules, and counts beverages under `Edibles`
- **Space mix** → `work/market_space.csv`, columns `category,segment,size,dollars`. One query, rows `category` + `segment` + `productPresentation`, metric `dollars`, `pageSize` 1000.
  - Sum across pack sizes; Hoodie's pack field is often blank.
  - Convert Hoodie's sizes to the store's format ("3.50 gram" → "3.5g", "100.00 mg" → "100mg"). Hoodie reports vape sizes in mg, so turn "1000.00 mg" vapes into "1g" and "500.00 mg" into "0.5g".
  - Add one row per category with segment `__total__` and the category's total dollars, so shares are exact even if you drop small rows.
  - The engine maps store spaces to Hoodie segments (Disposables / Cartridges, Buds / Shake, Single / Multipack, Soft Candy / Chocolate / Beverages, Resin\Wax / Rosin / Shatter / Crystalline…). It compares shares at the level Hoodie reports them, so all 100mg gummy pack sizes are judged together.
  - When the store's size unit can't match Hoodie's (topicals in oz vs Hoodie's mg), set `county_share` to blank for those rows in `spaces.csv` before `finalize`, rather than showing a false 0%.
- **House brands**: brands the operator owns (Savvy and The Essence at Zen Leaf, which Verano owns; Sinse and BeLeaf at SWADE). The market has nothing fair to compare them to, so they're judged on the store's own sales. Find them two ways and pass the union with `--house`:
  - **Same owner**: one query filtered to the store (`dispensaries`) or banner (`banners`), rows `brandCompanyName` + `brand`. Any brand whose company matches the store's operator or parent counts.
  - **Exclusive**: brand dollars in the state filtered to the store's `banners`, compared with the same brands unfiltered. Brands with 80% or more of their sales inside the banner count too.

Large results get saved to a file; parse them with Python. Results under the size limit come back inline and can't be read from the shell, so for the brand and space queries add a few spare metrics (units, weightedAveragePrice, skuCount) to push them over the limit and into a file. For the small replacement queries, write `work/replacements.csv` directly (columns `slot,title,dollars,stores,avg_price`, skipping null titles) instead of using `add-repl`. Read `meta.warnings` on every Hoodie response and mention anything it says in the report notes. Hoodie market figures are modelled monthly estimates and the store file is its own register data, so never add or blend the two.

### 4. Score

Run `score` and check the printout:

- **Line verdicts and strains to rotate**: sanity-check the counts.
- **Space statuses**: the "Under-built" spaces become the page's headline. "Over-built" and "Heavy" spaces are the over-assortment story; mention the biggest one in the short version when it's well out of line with the state.
- **`market_matched_share`**: if it's under about 60%, brand spellings differ. Compare `summary.json → category_brands` with `market.csv`, fix them, then re-score.
- **Chains**: chain line totals favour lines carried at every store. Before accepting a cut, divide the line's chain rate by the number of stores carrying it and compare with similar lines. A house-brand line in an under-built space that sells at a fair per-store pace is better as a Fix; change `verdict`/`fix_reason` in `lines.csv` and `line_verdict`/`status` in `verdicts.csv`, clear its `slot`, and say why in the notes.

### 5. Ask Hoodie for replacements, additions and rotations

`score` writes the query plan. Every query is a `marketIntelligence_pivotQuery`:

- **Rows and metrics**: rows `productCompositeTitleV2`; metrics `dollars`, `dispensaryCount`, `weightedAveragePrice`; sort `metric:dollars`; `pageSize` 25; last three full months; the same market scope as step 3 (the state, or the county when asked).
- **Pacing**: run up to three at a time. Hoodie rate-limits bursts; if it says so, wait a minute (`sleep 60`) before the next batch.
- **Importing**: import each result with `add-repl --slot <id>`. Pass the saved tool-result file if the tool saved one; otherwise write the JSON you received to a file first.

| Plan file | Rows | Query filters | Used for |
|---|---|---|---|
| `cut_slots.csv`, `kind = replace` (S1, S2…) | one per space with cut lines, by $ on the shelf | `categories` = `hoodie_category`, `segments` = `segment_hint`, `productPresentations` = `size_label`, `packSizes` = `pack_filter`, `actualPrice` ≈ 0.85× `price_lo` to 1.15× `price_hi` | replacement lines on cut cards |
| `cut_slots.csv`, `kind = add` (A1, A2…) | one per under-built space | same filters | "Try:" lines on the shelf-by-category table |
| `rotate_lines.csv` (L…) | lines with strains to rotate | `brands` = `brand`, plus the same category, segment, size and pack filters, no price filter | "Try instead" strains |

Run the top 8 replace slots and all add and rotate rows, skipping Accessories. For infused flower and pre-roll slots, keep only titles that say Infused; for regular ones, drop those titles.

The engine then works line-level:

- **Replacements and additions**: it groups market titles into lines (brand + Hoodie's form wording). It drops any brand the store already sells in that shelf space, so a replacement is always new to the shelf. It shows up to 3 lines with their top two strains, store count and average price.
- **Rotate picks**: it drops strains the store already carries. A thin or empty list is a real finding: the store already carries that line's best sellers in the market. Don't widen filters to pad it.

### 6. Check nearby prices for slow lines

`price_checks.csv` lists up to 15 Fix lines that are slow even though their brand is strong locally. Price is the most common cause, so check it:

- **Query**: one `menu_pivotQuery` per brand (or one query with all the brands), rows `brand` + `segment` + `productPresentation` + `packSize`, metric `avgPrice`.
- **Filter**: the store's county (all the stores' counties for a banner, even when the market view is statewide), or a `geoBoundingBox` of about ±0.1° around the store when you know its coordinates.
- **Output**: write `work/nearby_prices.csv` with columns `line_id,nearby_price`. Leave out lines with no like-for-like listing, and lines priced well below nearby stores (the plan would call that "in line"); mention those in the notes instead.

The engine flags lines priced more than 8% above nearby stores and writes a price-match plan. Everything else gets a listing, placement and budtender plan.

### 7. Write the words

Create `work/extra.json`:

```json
{
  "page_title": "Gilbert Shelf Health",
  "short_version": "Two or three plain sentences, widest view first: the one or two spaces most out of line with the state, then the biggest action (usually restocking), then how many whole lines to cut versus strains to rotate.",
  "gaps": ["Up to 3 plain sentences about price points or forms that sell well in the state where the store carries nothing at all."],
  "notes": ["Anything a reader needs to trust the numbers, e.g. a Hoodie warning or a fixed category rule."],
  "reorder_tile": "Optional. Replaces the Keep tile's reorder line, e.g. the store-level reorder count on a banner page."
}
```

Gaps are for spaces the store doesn't carry at all; spaces it carries but under-builds already show on the page.

- **Data**: compare one market query (rows `category` + `priceBracket`, metric `dollars`, same market scope) with the store's products by category and price in `verdicts.csv`. The space-mix pull from step 3 also shows sizes the store doesn't carry (28g flower, 1000mg gummies).
- **Price bands**: Hoodie's first band is "$0 - $9.99" and its $5 bands start after that, so build the store's bands the same way.
- **Threshold**: call something a gap only when it's at least 5% of the market's category sales and the store has 0–1 products there.

`page_title` is the store's name plus "Shelf Health", for example "Gilbert Shelf Health". For a banner, use the banner name ("Swade Shelf Health"), and let the short version name the one or two strongest location flags after the market view, e.g. "Ellisville sells most of the chain's Proper 14g flower, so order it by store." Never name a competitor store anywhere: say "nearby stores", "your state" or "your county". Follow the Hoodie voice rules in "Hoodie branding" above for every sentence here.

### 8. Finalize, render, check, publish, export

Run `finalize`, then `render`. Before publishing, read `report.json` and sanity-check:

- **Spaces**: the shelf-by-category rows make sense. A share like "87% vs 11%" usually means a category mismatch; check `HOODIE_CAT` and the segment mapping.
- **Cuts**: no cut line has a high weekly rate or mostly ran-out strains.
- **Replacements**: they match the space's form and size, and none is a brand already on that shelf.
- **Reorders**: quantities look like 2–6 weeks of sales, not hundreds. On a banner page they are chain totals (the footer says so).
- **Location flags**: each one names a real store from the file, a Driver line isn't also tagged Lagging at a normal store, and spikes aren't explained by a store that was simply out of stock earlier (check its store page).

Fix the inputs and re-run rather than hand-editing the HTML.

Publish `work/report.html` with the Artifact tool (load the `artifact-design` skill first if the tool asks for it; the page already follows its contract and the Hoodie brand kit). Before publishing, screenshot it once in light and once in dark mode to confirm the wordmark shows and the header band reads. Use icon `chart` and a description such as "Shelf by category vs. Arizona statewide sales, plus keep, fix, cut and rotate calls for every product line at Zen Leaf Gilbert." If the Artifact tool isn't available, send the static HTML and PDF below instead, never `report.html`.

**Email-safe copies, every run.** Gmail and other mail scanners flag HTML attachments that carry JavaScript as a virus, and `report.html` carries the search and filter script. So always build the two attachable files as well, named after the store or banner:

```bash
python3 shelf_check.py render work --extra work/extra.json --logo "$LOGO" --static --out "<Store>_Shelf_Health.html"
python3 shelf_check.py pdf "<Store>_Shelf_Health.html" --out "<Store>_Shelf_Health.pdf"
```

- `--static` writes the full product list as plain rows and drops the script, the search controls and the Google Fonts links, and adds print rules so cards and rows don't split across pages.
- `pdf` prints the static page on Letter paper in the light theme with Playwright's Chromium.
- Check: `grep -ci "<script" <Store>_Shelf_Health.html` returns 0, there are no `http` links in it, and a couple of PDF pages look right (render them with `pdftoppm -png -r 45` and read the images).
- Write both files to the outputs folder and send them to the user. Say the PDF is the file to attach to client emails, and the published link is the interactive version to share instead of an attachment.

### 9. Reply in chat

Keep it short, because the page holds the detail:

- The short version (2–3 sentences, widest view first).
- One line of counts: lines to keep, fix and cut; strains to rotate.
- For a banner: one line on the location flags (how many, and the strongest one), plus an offer of the per-store pages.
- One line on what's on the page, and that the PDF is the email-safe copy.
- One follow-up offer, such as "Want a reorder list to send to vendors, or the cut list as a spreadsheet?"

## Judgment calls the engine leaves to you

- **Deli and bulk flower** sells by the gram. The engine writes weekly rates in grams for "Deli Style" names. Watch for other bulk formats.
- **Sub-brands** (e.g. a premium tier sold under the same brand at a similar price) can land in one line. If a line's strains split into a clear fast group and slow group by name, add the sub-brand word to `SERIES` and re-run. Otherwise the slow group simply shows up as strains to rotate, which is still the right call.
- **Promotional or seasonal items** that just ended can look dead. If names say "holiday", "limited" or "promo", move them to Watch in your notes rather than presenting them as cuts.
- **Stock gaps distort rates.** Lines whose strains were out most of the period are labelled "out most of the period", and their missed-sales estimate is dropped as unreliable. Products in stock under ~2 weeks are treated as new. Both show in the page footer.
- **Location flags and promos**: a spike at one store is often a deal or a display. If you know of one (names, notes or the user says so), say it in the notes instead of presenting it as demand. A store that carries a line alone gets no Driver or Lagging flag, since there is nothing to compare it with.
- **No market data**: the shelf-by-category comparison, replacements, rotate picks and price checks can't be produced. Say that in one line and still publish the page.

## Engine source

<!-- ENGINE START -->
```python
#!/usr/bin/env python3
"""Shelf Check engine (Hoodie Analytics branded). Three layers: shelf space (category + form + size) -> product line (brand + series in that space) -> strain.
Stages:
  prep      <pos_file> --out DIR [--days N] [--store NAME] [--long-days N]
  score     DIR [--market market.csv] [--market-space market_space.csv] [--house "BRAND,BRAND"]
  add-repl  DIR --slot S1|L12 --json hoodie_result.json      (repeat per Hoodie query)
  finalize  DIR [--prices nearby_prices.csv] [--repl DIR/replacements.csv] --title "Store" --period "label" --market-label "label" [--scope state|county]
  render    DIR [--extra extra.json] [--logo logo_wordmark_white.png] [--static] --out report.html
  pdf       STATIC_HTML --out report.pdf                    (print a --static page to PDF for email)
  banner    STORE_DIR STORE_DIR ... --out DIR --name "Banner"   (after prep + score per store; then score/finalize/render DIR)
All outputs land in DIR. Read DIR/summary.json after each stage."""
import sys, re, json, argparse, math
import pandas as pd, numpy as np

# ---------------------------------------------------------------- helpers
SYN = {  # template field -> header patterns (lower-case, whitespace collapsed)
    'product': [r'^product( name)?$', r'^item( name)?$', r'^description$', r'^name$'],
    'category': [r'^category$', r'^product (type|category)$', r'^type$', r'^class$'],
    'brand': [r'^brand$', r'^vendor$', r'^producer$', r'^manufacturer$'],
    'store': [r'^dispensary$', r'^store$', r'^location$', r'^shop$', r'^store (location|name)$'],
    'units': [r'^units?( sold)?( \(\d+ days\))?$', r'^qty sold$', r'^quantity( sold)?$', r'^items sold$', r'unit sales$', r'^l\d+w units( sold)?$'],
    'sales': [r'^net sales', r'net \$ sales', r'^sales( \(\d+ days\))?$', r'^gross sales', r'^revenue', r'^total sales', r'^total$', r'^l\d+w (net )?sales'],
    # optional longer window (e.g. L3M next to L4W): only used to spot spikes and slides
    'units_long': [r'^units long$', r'^l\d+[mw] units( sold)?$'],
    'sales_long': [r'^sales long$', r'^l\d+[mw] (net )?sales'],
    'onhand': [r'^stock level$', r'on hand', r'^available$', r'^inventory$', r'^quantity available$', r'^stock$'],
    'price': [r'^price$', r'^unit price$', r'^retail price$', r'^msrp$'],
    'cost': [r'cost', r'^cogs$'],
    'size': [r'^measure$', r'^size$', r'^weight$', r'^net weight$', r'^unit of measure$'],
    'date': [r'^date$', r'sold date', r'transaction date', r'^created'],
    'first_sold': [r'first sold', r'first sale', r'date added'],
    'oos_days': [r'days since oos'],
    'lost': [r'lost opportunity'],
    'adu': [r'avg daily units'],
}
def norm(c): return re.sub(r'\s+', ' ', str(c)).strip().lower()
def num(x):
    if pd.isna(x): return np.nan
    s = str(x).strip().replace('$', '').replace(',', '').replace('%', '')
    if s in ('', '-', '--', 'n/a', 'nan'): return np.nan
    neg = s.startswith('(') and s.endswith(')'); s = s.strip('()')
    mult = 1
    if s[-1:].lower() == 'k': mult, s = 1e3, s[:-1]
    elif s[-1:].lower() == 'm': mult, s = 1e6, s[:-1]
    try: v = float(s) * mult
    except ValueError: return np.nan
    return -v if neg else v

def load(path):
    if path.lower().endswith(('.xlsx', '.xls')):
        sheets = pd.read_excel(path, sheet_name=None, header=None)
        raw = max(sheets.values(), key=len)
    else:
        import csv, io   # exports often have ragged title rows above the header, so read rows as-is and pad
        text = open(path, encoding='utf-8-sig', errors='ignore').read()
        sample = text[:5000]
        try: dialect = csv.Sniffer().sniff(sample, delimiters=',;\t|')
        except csv.Error: dialect = csv.excel
        rows = [r for r in csv.reader(io.StringIO(text), dialect)]
        width = max(len(r) for r in rows)
        raw = pd.DataFrame([r + [None] * (width - len(r)) for r in rows], dtype=object)
    # header row = first row (of top 15) with >= 3 recognised fields
    best, bi = 0, 0
    for i in range(min(15, len(raw))):
        hits = sum(any(re.search(p, norm(v)) for ps in SYN.values() for p in ps) for v in raw.iloc[i].tolist())
        if hits > best: best, bi = hits, i
    df = raw.iloc[bi + 1:].copy(); df.columns = [norm(c) for c in raw.iloc[bi]]
    return df.reset_index(drop=True)

def map_cols(df):
    used, m = set(), {}
    for f, pats in SYN.items():
        for c in df.columns:
            if c in used: continue
            if f == 'cost' and 'margin' in c: continue
            if f in ('units', 'units_long') and ('avg' in c or 'daily' in c): continue
            if f == 'onhand' and ('days' in c or 'order' in c): continue
            if any(re.search(p, c) for p in pats):
                m[f] = c; used.add(c); break
    return m

CAT_RULES = [  # order matters: first match wins
    ('REMOVE', r'tester|\beply\b|promo|sample|display|patient education|insider|gift card|\bfee\b|donation|exit bag|\bbag\b(?!.*(flower|gram))'),
    ('Pre-Rolls', r'pre-?roll|blunt|\bjoints?\b|\bdogwalker'),
    ('Vapes', r'all-in-one|\baio\b|disposable|cartridge|\bcarts?\b|\bpods?\b|\bvape'),
    ('Flower', r'flower|\bground\b|smalls|\bshake\b|popcorn|\bbuds?\b|deli style|\beighth\b'),
    ('Concentrates', r'\d(?:\.\d+)?g (?:live )?(?:hash )?(?:rosin|shatter|sugar|badder|batter\b|budder|diamonds|wax|resin|crumble|sauce|hash|jam)\b'),
    ('Edibles', r'gumm|chocolate|candy|\bchews?\b|cookie|brownie|caramel|taffy|lozenge|\bmints?\b.*mg|\bbites\b|edible|\btablets? .*mg'),
    ('Beverages', r'beverage|\bdrink|soda|seltzer|tonic|fl ?oz|\bshot\b|\btea\b.*mg|lemonade.*mg'),
    ('Tinctures & Capsules', r'tincture|capsule|softgel|dropper|\brso\b|syringe|sublingual'),
    ('Topicals', r'topical|lotion|balm|salve|(?<!ice )cream|transdermal|\bpatch|bath bomb|roll-?on'),
    ('Concentrates', r'rosin|shatter|\bsugar\b|badder|batter\b|budder|diamonds|\bwax\b|live resin|crumble|sauce|\bhash\b|kief|distillate|\bjam\b|concentrate|thca|isolate|cold cure|dablicator'),
]
ACCESSORY = r't-?shirt|hoodie|\bhat\b|tray|lighter|papers|\bcones?\b|grinder|\bpipe|water pipe|bong|\brig\b|battery|torch|ashtray|stash|sticker|\bjar\b|\bcase\b|chillum|\bscale\b|vaporizer|hot knife|adapter|screen|\bpin\b|storage|\bglass\b|510 thread|dry herb|lanyard|merch'
def window_days(col):
    """Days covered by an 'L4W' / 'L3M' / 'L90D' style column name, else None."""
    mm = re.search(r'\bl(\d+)\s*([wmd])\b', str(col))
    if not mm: return None
    n, u = int(mm.group(1)), mm.group(2)
    return n * 7 if u == 'w' else (round(n * 30.4) if u == 'm' else n)
def window_label(days):
    if not days: return ''
    if days % 7 == 0 and days <= 84: return f"last {days // 7} weeks"
    return f"last {round(days / 30.4)} months"

HOODIE_CAT = {'Beverages': 'Edibles', 'Tinctures & Capsules': 'Oral'}

def infer_cat(name, given, size):
    p = name.lower()
    if given and str(given).strip() and str(given).lower() not in ('nan', '-'):
        g = str(given).strip().title()
        if re.search(r'tester|promo|sample', p): return 'REMOVE'
        if re.search(r'oral|tincture|capsule', g.lower()): return 'Tinctures & Capsules'
        for c, _ in CAT_RULES[1:]:
            if c.lower().rstrip('s') in g.lower(): return c
        if re.search(r'accessor|gear|merch|apparel|paraphernalia', g.lower()): return 'Accessories'
    for c, pat in CAT_RULES:
        if re.search(pat, p): return c
    if re.search(ACCESSORY, p) or 'each' in str(size).lower(): return 'Accessories'
    if 'mg' in str(size).lower(): return 'Edibles'
    return 'Other'

def size_of(name, size):
    s = str(size).strip() if size is not None and str(size).lower() not in ('nan', '') else ''
    if not s:
        m = re.search(r'(\d+(?:\.\d+)?)\s*(mg|g|gram|oz|ml)\b', name.lower())
        s = f"{m.group(1)}{m.group(2)}" if m else 'n/a'
    pk = re.search(r'\[(\d+)\s*pk\]|(\d+)\s*-?\s*(?:pk|pack|ct)\b', name.lower())
    pack = (pk.group(1) or pk.group(2)) if pk else '1'
    return s, pack

SUBFORMS = {  # (category, label, pattern, Hoodie segment hint)
    'Vapes': [('all-in-one', r'all-in-one|\baio\b|disposable', 'Disposables'), ('pod', r'\bpods?\b', 'Cartridges'), ('cartridge', r'cart', 'Cartridges')],
    'Flower': [('infused', r'infused', ''), ('ground', r'\bground\b|shake', ''), ('deli', r'deli style|deli\b', ''), ('smalls', r'smalls|popcorn', '')],
    'Pre-Rolls': [('infused', r'infused|diamond|kief|hash|rosin|blunt', ''), ('regular', r'.', '')],
    'Edibles': [('drink', r'beverage|lemonade|\bcola\b|drink|\btea\b|seltzer|soda', 'Beverages'), ('chocolate', r'chocolate|\bbar\b', 'Chocolate'), ('baked', r'brownie|cookie|baked|cake\b', 'Baked Goods'),
                ('hard candy', r'hard candy|lozenge|\bmints?\b|tablet', 'Hard Candy'), ('gummy', r'gumm|chew|fruit|candy|bites|pastille|pearls|taffy|\d+\s*pk', 'Soft Candy')],
    'Beverages': [('drink', r'.', 'Beverages')],
    'Concentrates': [('rosin', r'rosin', 'Rosin'), ('shatter', r'shatter', 'Shatter'), ('distillate', r'distillate|\brso\b|dablicator', 'Distillate'),
                     ('hash', r'\bhash\b|kief|temple', 'Hash'), ('diamonds', r'diamonds', 'Crystalline'), ('resin/wax', r'.', 'Resin\\Wax')],
}
SEG_HINT = {(c, lab): seg for c, rules in SUBFORMS.items() for lab, _, seg in rules}
def subform(cat, name):
    for lab, pat, _ in SUBFORMS.get(cat, []):
        if re.search(pat, name.lower()): return lab
    return 'standard'

SERIES = ['noir', 'reserve', 'htfse', 'liquid diamonds', 'live hash rosin', 'hash rosin', 'live rosin', 'cold cure', 'rosin', 'live resin', 'cured resin',
          'diamonds', 'distillate', 'badder', 'budder', 'batter', 'sugar', 'shatter', 'sauce', 'crumble', 'wax',
          'infused', 'sugar free', 'rso', 'pectin', 'chocolate', 'gummy', 'gummies', 'bites', 'smalls', 'ground', 'deli style', 'blunt']
def series_of(name):
    p = name.lower()
    for s_ in SERIES:
        if re.search(r'\b' + re.escape(s_) + r'\b', p): return s_
    return ''
def pretty_size(z, pack):
    m = re.match(r'([\d.]+)\s*(mg|gram|g|each|ml)', str(z).lower())
    if not m: out = str(z)
    else:
        v, u = float(m.group(1)), m.group(2)
        if u == 'mg' and v >= 500 and v % 500 == 0: out = f"{v/1000:g}g"
        elif u == 'mg': out = f"{v:g}mg"
        elif u in ('gram', 'g'): out = f"{v:g}g"
        elif u == 'each': out = ''
        else: out = f"{v:g}{u}"
    return (out + (f" {pack}pk" if str(pack) != '1' else '')).strip()
CAT_SINGULAR = {'Accessories': 'accessory', 'Edibles': 'edible', 'Pre-Rolls': 'pre-roll', 'Concentrates': 'concentrate', 'Beverages': 'beverage',
                'Topicals': 'topical', 'Vapes': 'vape', 'Flower': 'flower', 'Tinctures & Capsules': 'tincture', 'Other': 'product'}
def line_name(brand, series, cat, form, size, pack):
    form_txt = {'all-in-one': 'all-in-one', 'pod': 'pod', 'cartridge': 'cart', 'infused': 'infused', 'ground': 'ground',
                'deli': 'deli', 'smalls': 'smalls'}.get(form, '')
    bits = [re.sub(r"'S\b", "'s", brand.title()), series.title() if series and series not in form_txt else '', pretty_size(size, pack),
            form_txt or ('' if series else CAT_SINGULAR.get(cat, cat.lower()))]
    return re.sub(r'\s+', ' ', ' '.join(b for b in bits if b)).strip()

# ---------------------------------------------------------------- prep
def prep(a):
    import os; os.makedirs(a.out, exist_ok=True)
    df = load(a.file); m = map_cols(df)
    miss = [f for f in ('product', 'units') if f not in m]
    if miss: sys.exit(f"Missing required columns: {miss}. Found: {list(df.columns)}")
    d = pd.DataFrame({'product': df[m['product']].astype(str).str.strip()})
    for f in ('brand', 'category', 'store', 'size', 'date', 'first_sold'):
        d[f] = df[m[f]].astype(str).str.strip() if f in m else ''
    for f in ('units', 'sales', 'onhand', 'price', 'cost', 'oos_days', 'lost', 'adu', 'units_long', 'sales_long'):
        d[f] = df[m[f]].map(num) if f in m else np.nan
    d = d[d['product'].ne('') & d['product'].ne('nan')]
    notes = {'columns_used': m, 'rows_in_file': int(len(d))}
    if a.store:
        d = d[d.store.str.lower() == a.store.lower()]
    stores = sorted(set(d.store) - {''})
    notes['stores'] = stores
    # date range / transactions
    days = a.days
    if 'date' in m:
        dt = pd.to_datetime(d.date, errors='coerce')
        if dt.notna().any():
            notes['date_range'] = [str(dt.min().date()), str(dt.max().date())]
            days = days or max(1, (dt.max() - dt.min()).days + 1)
            d['_dt'] = dt
    if not days and 'units' in m: days = window_days(m['units'])
    if not days:
        hdr = ' '.join(m.values()); mm = re.search(r'(\d+)\s*days', hdr)
        days = int(mm.group(1)) if mm else None
    notes['days'] = days
    long_days = getattr(a, 'long_days', None) or (window_days(m['units_long']) if 'units_long' in m else None)
    if long_days and days and long_days <= days: long_days = None   # the 'long' window must be longer
    notes['long_days'] = long_days
    # aggregate duplicates / transaction lines
    d['key'] = d['product'].str.lower().str.replace(r'\s+', ' ', regex=True).str.replace(r'\b(med|medical|rec|adult[- ]use)\b', '', regex=True).str.strip()
    agg = {'product': 'first', 'brand': 'first', 'category': 'first', 'store': 'first', 'size': 'first',
           'units': 'sum', 'sales': 'sum', 'onhand': 'max', 'price': 'median', 'cost': 'median',
           'oos_days': 'min', 'lost': 'sum', 'adu': 'max', 'first_sold': 'first', 'units_long': 'sum', 'sales_long': 'sum'}
    if '_dt' in d:
        cut = d['_dt'].max() - pd.Timedelta(days=30)
        d['units_recent'] = np.where(d['_dt'] > cut, d.units, 0); agg['units_recent'] = 'sum'
        d['first_seen'] = d['_dt']; agg['first_seen'] = 'min'
    d = d.groupby('key', as_index=False).agg(agg)
    if '_dt' not in locals() and 'units_recent' not in d: d['units_recent'] = np.nan
    d['lost'] = d['lost'].replace(0, np.nan) if 'lost' in m else np.nan
    # run-local fix: rows out of stock for 3+ of the 4 weeks have a daily rate (and lost $) built on <7 in-stock days; don't trust them
    instock = np.where(d.adu > 0, d.units / d.adu.replace(0, np.nan), np.nan)
    d['recent_arrival'] = d.oos_days.isna() & (d.onhand > 0) & (instock < 14)
    thin = (d.oos_days.notna() & (d.oos_days > (days or 28) - 7)) | ((instock < 7) & (d.onhand <= 0))
    notes['recent_arrivals'] = int(d.recent_arrival.sum())
    notes['thin_rate_rows'] = int(thin.sum()); notes['thin_rate_lost_dropped'] = round(float(d.loc[thin, 'lost'].sum()))
    d.loc[thin, 'adu'] = np.nan; d.loc[thin, 'lost'] = np.nan
    # classify + clean
    d['brand'] = d.brand.replace({'-': '', 'nan': ''}).str.upper()
    d['cat'] = [infer_cat(p, c, s) for p, c, s in zip(d['product'], d.category, d['size'])]
    rem = {}
    rem['testers, promos and non-sale lines'] = int((d.cat == 'REMOVE').sum()); d = d[d.cat != 'REMOVE']
    d['units'] = d.units.fillna(0); d['sales'] = d.sales.fillna(0)
    zero = (d.price.fillna(0) <= 0.5) & (d.sales <= 0)
    rem['$0 items with no sales'] = int(zero.sum()); d = d[~zero]
    neg = d.onhand < 0
    rem['negative on-hand (ignored)'] = int(neg.sum()); d = d[~neg]
    d['onhand'] = d.onhand.fillna(0)
    dead = (d.units <= 0) & (d.onhand <= 0)
    rem['no stock and no sales'] = int(dead.sum()); d = d[~dead]
    notes['removed'] = rem
    weeks = (days or 28) / 7
    d['per_week'] = d.units / weeks
    if long_days and 'units_long' in m:
        d['per_week_long'] = d.units_long / (long_days / 7)
        d['sales_wk_long'] = d.sales_long / (long_days / 7) if 'sales_long' in m else np.nan
    else:
        d['per_week_long'] = np.nan; d['sales_wk_long'] = np.nan
    d['per_day'] = np.where(d.adu.notna() & (d.adu > 0), d.adu, d.units / (days or 28))
    d['real_price'] = np.where(d.units > 0, d.sales / d.units.replace(0, np.nan), d.price)
    d['real_price'] = d.real_price.fillna(d.price)
    d['unit_value'] = np.where(d.cost.fillna(0) > 0, d.cost, d.real_price)
    d['shelf_dollars'] = d.onhand * d.unit_value
    d['days_left'] = np.where(d.per_day > 0, d.onhand / d.per_day, np.inf)
    s_p = [size_of(p, s) for p, s in zip(d['product'], d['size'])]
    d['size_label'] = [x[0] for x in s_p]; d['pack'] = [x[1] for x in s_p]
    d['subform'] = [subform(c, p) for c, p in zip(d['cat'], d['product'])]
    d['form'] = d.cat + ' | ' + d.subform + ' | ' + d.size_label + (' x' + d.pack).where(d.pack != '1', '')
    n_form = d.groupby('form')['product'].transform('count')
    d['only_option'] = n_form == 1
    d['form_g'] = np.where(n_form >= 3, d.form, d.cat + ' | other sizes')
    def tier(g):
        if len(g) >= 9: return pd.qcut(g.real_price.rank(method='first'), 3, labels=['value', 'mid', 'premium']).astype(str)
        return pd.Series('all', index=g.index)
    d['tier'] = d.groupby('form_g', group_keys=False)[['real_price']].apply(tier)
    d['group'] = d.form_g + ' | ' + d.tier
    d['group_mid'] = d.groupby('group').per_week.transform('median')
    d['ran_out'] = d.oos_days.notna() | (d.lost.fillna(0) > 0) | ((d.onhand <= 0) & (d.units > 0))
    # new: first sale within 90 days if known
    d['is_new'] = False
    for col in ('first_seen', 'first_sold'):
        if col in d:
            fs = pd.to_datetime(d[col], errors='coerce')
            if fs.notna().any():
                ref = pd.Timestamp(notes.get('date_range', [None, str(pd.Timestamp.today().date())])[1])
                d['is_new'] = d.is_new | (fs > ref - pd.Timedelta(days=90))
    d['is_new'] = d.is_new | d.recent_arrival
    d['long_out'] = thin
    d['series'] = [series_of(p) for p in d['product']]
    d['brand_l'] = [b if b else ' '.join(p.split()[:2]).upper() for b, p in zip(d.brand, d['product'])]
    d['space'] = d.cat + ' | ' + d.subform + ' | ' + d.size_label + ' | ' + d.pack.astype(str)
    d['line_key'] = d.brand_l + ' | ' + d.series + ' | ' + d.space
    d['line_name'] = [line_name(b, s_, c, f, z, k) for b, s_, c, f, z, k in zip(d.brand_l, d.series, d.cat, d.subform, d.size_label, d.pack)]
    # one brand can sell two different products at the same size (e.g. a $30 and a $45 all-in-one); split those by price
    d['price_band'] = 0
    for k, g in d.groupby('line_key'):
        if len(g) < 2: continue
        band, anchor = 0, None
        for idx, p in g.real_price.sort_values().items():
            if anchor is not None and p > anchor * 1.3: band += 1; anchor = p
            if anchor is None: anchor = p
            d.at[idx, 'price_band'] = band
    split = d.groupby('line_key').price_band.transform('max') > 0
    if split.any():
        med = d[split].groupby(['line_key', 'price_band']).real_price.transform('median')
        d.loc[split, 'line_name'] = d.loc[split, 'line_name'] + ' (~$' + med.round().astype(int).astype(str) + ')'
        d.loc[split, 'line_key'] = d.loc[split, 'line_key'] + ' | $' + d.loc[split, 'price_band'].astype(str)
    acc = d.cat.isin(['Accessories', 'Other'])   # gear isn't sold in strains: each item is its own line
    d.loc[acc, 'line_key'] = 'ITEM | ' + d.loc[acc, 'product']; d.loc[acc, 'line_name'] = d.loc[acc, 'product']
    notes['first_sale_dates'] = ('first_sold' in m) or ('date' in m)
    notes['has_cost'] = 'cost' in m; notes['has_lost'] = 'lost' in m
    notes['products'] = int(len(d))
    notes['category_brands'] = {c: sorted(set(g.brand) - {''}) for c, g in d.groupby('cat')}
    notes['hoodie_category'] = HOODIE_CAT
    d.to_csv(f"{a.out}/products.csv", index=False)
    json.dump(notes, open(f"{a.out}/summary.json", 'w'), indent=1, default=str)
    print(json.dumps({k: v for k, v in notes.items() if k != 'category_brands'}, indent=1, default=str))
    print('categories:', d.cat.value_counts().to_dict())


# ---------------------------------------------------------------- score
SEG_COUNTY = {('Flower', 'ground'): 'Shake'}
def county_segment(cat, form, pack):
    if cat == 'Pre-Rolls': return 'Single' if str(pack) == '1' else 'Multipack'
    if cat == 'Flower': return SEG_COUNTY.get((cat, form), 'Buds')
    return SEG_HINT.get((cat, form), '')
# Hoodie segments for the Pre-Rolls/Flower replacement filter
def query_segment(cat, form, pack):
    return county_segment(cat, form, pack) if cat in ('Pre-Rolls', 'Flower') else SEG_HINT.get((cat, form), '')

def market_strength(mk):
    mk = mk.copy(); mk['brand'] = mk.brand.astype(str).str.upper()
    mk = mk[mk.brand != 'ALL OTHER']
    if not len(mk): return {}
    mk['total'] = mk[['m1', 'm2', 'm3']].sum(axis=1)
    mk = mk.sort_values(['category', 'total'], ascending=[True, False])
    mk['cum'] = mk.groupby('category').total.cumsum() / mk.groupby('category').total.transform('sum')
    mk['strong'] = (mk.cum <= 0.50) | ((mk.m3 > mk.m1 * 1.15) & (mk.stores >= 10))
    return {(c, b): s for c, b, s in zip(mk.category, mk.brand, mk.strong)}

def score(a):
    d = pd.read_csv(f"{a.dir}/products.csv", keep_default_na=False, na_values=[''])
    for c in ('brand', 'brand_l', 'series'): d[c] = d[c].fillna('').astype(str)
    d['pack'] = d['pack'].astype(str)
    notes = json.load(open(f"{a.dir}/summary.json"))
    house = {b.strip().upper() for b in (a.house or '').split(',') if b.strip()}
    look = market_strength(pd.read_csv(a.market)) if a.market else {}
    def market(r):
        if r['cat'] in ('Accessories', 'Other') or not r.brand or r.brand in house or not look: return 'n/a'
        return 'strong' if look.get((HOODIE_CAT.get(r['cat'], r['cat']), r.brand), False) else 'weak'
    d['market'] = d.apply(market, axis=1)
    if not look and d.units_recent.notna().any():   # no Hoodie: recent trend stands in for the market
        early = (d.units - d.units_recent).clip(lower=0)
        d['market'] = np.where(d.units_recent >= early * 0.5, 'strong', 'weak')

    # ---- layer 2: product lines (brand + series + form + size + pack); strains are the products inside a line
    L = d.groupby('line_key').agg(line=('line_name', 'first'), cat=('cat', 'first'), subform=('subform', 'first'),
        size_label=('size_label', 'first'), pack=('pack', 'first'), brand=('brand', 'first'), space=('space', 'first'),
        strains=('product', 'count'), per_week=('per_week', 'sum'), sales=('sales', 'sum'), shelf=('shelf_dollars', 'sum'),
        onhand=('onhand', 'sum'), lost=('lost', 'sum'), ran_out_share=('ran_out', 'mean'), long_out_share=('long_out', 'mean'),
        new_share=('is_new', 'mean'), market=('market', 'first'), price=('real_price', 'median'),
        price_lo=('real_price', 'min'), price_hi=('real_price', 'max'))
    L['per_strain'] = L.per_week / L.strains
    n = L.groupby('space').line.transform('count')
    L['cmp'] = np.where(n >= 3, L.space, L['cat'] + ' | ' + L.subform + ' | ' + L.size_label)
    n2 = L.groupby('cmp').line.transform('count')
    L['cmp'] = np.where(n2 >= 3, L.cmp, L['cat'] + ' | all')
    d['cmp'] = d.line_key.map(L.cmp)
    L['mid'] = L.cmp.map(d.groupby('cmp').per_week.median())   # typical product in the comparison group
    L['strong'] = (L.per_strain >= L.mid) & (L.per_week > 0)
    L['very_weak'] = L.per_strain < 0.5 * L.mid
    L['only_option'] = L.groupby('space').line.transform('count') == 1
    L['ran_out'] = L.ran_out_share >= 0.5
    L['long_out'] = L.long_out_share >= 0.5
    L['is_new'] = L.new_share >= 0.999
    def verdict(r):
        if r.strong: return 'Keep'
        if r.is_new: return 'Watch'
        if r.ran_out or r.market == 'strong': return 'Fix'
        if r.very_weak: return 'Fix' if r.only_option else 'Cut'
        return 'Watch'
    L['verdict'] = L.apply(verdict, axis=1)
    def fix_reason(r):
        if r.verdict != 'Fix': return ''
        if r.ran_out and r.long_out: return 'out most of the period'
        if r.ran_out: return 'ran out'
        if r.very_weak and r.only_option and r.market != 'strong': return 'only option'
        return 'slow despite local demand'
    L['fix_reason'] = L.apply(fix_reason, axis=1)
    L['edge'] = (L.verdict == 'Keep') & (L.market == 'weak')
    L['line_id'] = [f"L{i+1}" for i in range(len(L))]

    # ---- layer 3: strains inside Keep/Fix lines
    d = d.merge(L[['verdict', 'fix_reason', 'per_strain', 'strains', 'line_id']].rename(
        columns={'verdict': 'line_verdict', 'per_strain': 'line_per_strain', 'strains': 'line_strains'}),
        left_on='line_key', right_index=True, how='left')
    d['rotate'] = (d.line_verdict.isin(['Keep', 'Fix']) & (d.line_strains >= 2) & (d.per_week < 0.4 * d.line_per_strain)
                   & ~d.is_new & ~d.ran_out)
    d['status'] = np.where(d.line_verdict == 'Cut', 'Cut', np.where(d.rotate, 'Rotate', d.line_verdict))
    d['reorder_now'] = (d.status == 'Keep') & (d.days_left < 14)
    d['reorder_qty'] = np.where(d.reorder_now, np.ceil(30 * d.per_day - d.onhand).clip(lower=0), 0)
    L['rotate_n'] = L.line_id.map(d[d.rotate].groupby('line_id').size()).fillna(0).astype(int)

    # ---- layer 1: shelf spaces (category + form + size + pack)
    S = d.groupby('space').agg(cat=('cat', 'first'), subform=('subform', 'first'), size_label=('size_label', 'first'),
        pack=('pack', 'first'), lines=('line_key', 'nunique'), products=('product', 'count'), per_week=('per_week', 'sum'),
        sales=('sales', 'sum'), shelf=('shelf_dollars', 'sum'))
    # shares are taken within the county's category definitions so the two sides compare (drinks count as edibles, etc.)
    d['hcat'] = d['cat'].map(lambda c: HOODIE_CAT.get(c, c))
    S['hcat'] = S['cat'].map(lambda c: HOODIE_CAT.get(c, c))
    S['store_share'] = S.sales / S['hcat'].map(d.groupby('hcat').sales.sum())
    # crowding: does this space earn its product count? Compare sales per product with the category's average.
    cat_pp = d.groupby('cat').sales.sum() / d.groupby('cat').size()     # dollars, so 14g and 1g spaces compare fairly
    S['fair_products'] = (S.sales / S['cat'].map(cat_pp).replace(0, np.nan)).round().clip(lower=1).fillna(1).astype(int)
    S['crowded'] = (S.products >= 6) & (S.products >= 1.5 * S.fair_products) & (S.products - S.fair_products >= 4)
    S['county_share'] = np.nan
    if a.market_space:
        ms = pd.read_csv(a.market_space)
        ms['segment'] = ms['segment'].fillna('').astype(str); ms['size'] = ms['size'].fillna('').astype(str)
        tot_rows = ms[ms.segment == '__total__']                     # optional exact category totals
        ms = ms[ms.segment != '__total__']
        cat_tot = ms.groupby('category').dollars.sum()
        for c_, v_ in zip(tot_rows.category, tot_rows.dollars): cat_tot[c_] = v_
        def cshare(r):
            hc = HOODIE_CAT.get(r['cat'], r['cat'])
            if hc not in cat_tot: return np.nan
            seg = county_segment(r['cat'], r.subform, r.pack)
            m_ = ms[(ms.category == hc) & (ms['size'] == r.size_label)]
            if seg: m_ = m_[m_.segment.str.lower() == seg.lower()]
            return m_.dollars.sum() / cat_tot[hc]
        S['county_share'] = S.apply(cshare, axis=1)
    # the county reports some spaces as one bucket (all gummy pack sizes, carts + pods, infused + regular singles),
    # so judge your share at the same level: add up your spaces that fall in the same county bucket
    S['bucket'] = [f"{HOODIE_CAT.get(c, c)}|{county_segment(c, f, p)}|{z}" for c, f, p, z in zip(S['cat'], S.subform, S.pack, S.size_label)]
    S['bucket_share'] = S.groupby('bucket').store_share.transform('sum')
    def sstatus(r):
        cs = r.county_share
        if cs == cs and cs >= 0.03 and r.bucket_share < 0.6 * cs: return 'Under-built'
        if cs == cs and r.bucket_share > 1.6 * cs and r.crowded: return 'Over-built'
        # heavy: a much bigger slice of the category than in the market, even though its products sell at a normal pace
        if cs == cs and r.bucket_share > 1.6 * cs and r.bucket_share >= 0.05 and r.bucket_share - cs >= 0.05 and r.bucket_share < 0.95: return 'Heavy'
        if r.crowded: return 'Crowded'
        return 'Balanced'
    S['status'] = S.apply(sstatus, axis=1)
    S['cut_lines'] = S.index.map(L[L.verdict == 'Cut'].groupby('space').size()).fillna(0).astype(int)

    # ---- query plans for Hoodie: replacement lines for cut lines, stronger strains for rotate lines
    cl = L[L.verdict == 'Cut']
    slots = (cl.groupby(['cat', 'subform', 'size_label', 'pack']).agg(lines=('line', 'count'), shelf=('shelf', 'sum'),
             price_lo=('price_lo', 'min'), price_hi=('price_hi', 'max')).reset_index().sort_values('shelf', ascending=False))
    slots['slot'] = [f"S{i+1}" for i in range(len(slots))]
    slots['kind'] = 'replace'
    # under-built spaces get an 'add' query too: what sells in the county in that space that the store doesn't carry
    ub = (S[S.status == 'Under-built'].assign(gap=lambda x: (x.county_share - x.bucket_share)).sort_values('gap', ascending=False)
          .drop_duplicates('bucket').head(6))
    if len(ub):
        pr = d.groupby('space').real_price.agg(['min', 'max'])
        adds = pd.DataFrame({'cat': ub['cat'], 'subform': ub.subform, 'size_label': ub.size_label, 'pack': ub.pack, 'lines': 0,
                             'shelf': 0.0, 'price_lo': ub.index.map(pr['min']), 'price_hi': ub.index.map(pr['max'])}).reset_index(drop=True)
        adds['slot'] = [f"A{i+1}" for i in range(len(adds))]; adds['kind'] = 'add'
        slots = pd.concat([slots, adds], ignore_index=True)
        S['add_slot'] = ''
        for b_, sl_ in zip(ub.bucket, adds.slot): S.loc[(S.bucket == b_) & (S.status == 'Under-built'), 'add_slot'] = sl_
    else:
        S['add_slot'] = ''
    for df_ in (slots,):
        df_['hoodie_category'] = df_['cat'].map(lambda c: HOODIE_CAT.get(c, c))
        df_['segment_hint'] = [query_segment(c, f, p) for c, f, p in zip(df_['cat'], df_['subform'], df_['pack'])]
        df_['pack_filter'] = [f"{p} Pack" if (c in ('Pre-Rolls', 'Edibles', 'Beverages') or str(p) != '1') else '' for c, p in zip(df_['cat'], df_['pack'])]
    slots.to_csv(f"{a.dir}/cut_slots.csv", index=False)
    L = L.merge(slots[slots.kind == 'replace'][['cat', 'subform', 'size_label', 'pack', 'slot']], on=['cat', 'subform', 'size_label', 'pack'], how='left').set_index(L.index)
    L.loc[L.verdict != 'Cut', 'slot'] = ''
    rot = L[L.rotate_n > 0].sort_values('sales', ascending=False).head(10).copy()
    rot['hoodie_category'] = rot['cat'].map(lambda c: HOODIE_CAT.get(c, c))
    rot['segment_hint'] = [query_segment(c, f, p) for c, f, p in zip(rot['cat'], rot['subform'], rot['pack'])]
    rot['pack_filter'] = [f"{p} Pack" if (c in ('Pre-Rolls', 'Edibles', 'Beverages') or str(p) != '1') else '' for c, p in zip(rot['cat'], rot['pack'])]
    rot[['line_id', 'line', 'brand', 'hoodie_category', 'segment_hint', 'size_label', 'pack_filter', 'rotate_n']].to_csv(f"{a.dir}/rotate_lines.csv", index=False)
    fx = L[(L.verdict == 'Fix') & (L.fix_reason == 'slow despite local demand')]
    fx = fx.assign(gap=(fx.mid - fx.per_strain) * fx.price * fx.strains).sort_values('gap', ascending=False)
    fx[['line_id', 'line', 'brand', 'cat', 'size_label', 'pack', 'price']].head(15).to_csv(f"{a.dir}/price_checks.csv", index=False)

    L.reset_index().to_csv(f"{a.dir}/lines.csv", index=False)
    S.reset_index().to_csv(f"{a.dir}/spaces.csv", index=False)
    d.to_csv(f"{a.dir}/verdicts.csv", index=False)
    out = {'lines': L.verdict.value_counts().to_dict(), 'products': int(len(d)), 'strains_to_rotate': int(d.rotate.sum()),
           'reorder_now': int(d.reorder_now.sum()), 'cut_shelf_dollars': round(cl.shelf.sum()),
           'spaces': S.status.value_counts().to_dict(), 'market_matched_share': round((d.market != 'n/a').mean(), 2),
           'cut_slots': int((slots.kind == 'replace').sum()), 'add_slots': int((slots.kind == 'add').sum()), 'rotate_lines': len(rot)}
    notes['score'] = out; notes['house_brands'] = sorted(house)
    json.dump(notes, open(f"{a.dir}/summary.json", 'w'), indent=1, default=str)
    print(json.dumps(out, indent=1, default=str))

# ---------------------------------------------------------------- finalize
def toks(s): return set(re.findall(r'[a-z0-9]+', str(s).lower())) - {'the', 'g', 'mg', 'pk', 'gram', '1', 'x'}
def fmt_money(v): return f"${v:,.0f}"
GENERIC = {'vapes', 'vape', 'disposables', 'disposable', 'cartridges', 'cartridge', 'flower', 'pre', 'rolls', 'roll', 'infused',
           'gummies', 'edibles', 'concentrates', 'all', 'in', 'one', 'aio', 'mg', 'gram', 'g', '00', 'pk', 'pack', 'the', 'buds'}
def clean_line(brand, seg):
    seg = re.sub(r'(?i)resin\\wax|\bbuds\b', '', str(seg))
    seg = re.sub(r'(?i)\bdisposables\b', 'all-in-one', seg); seg = re.sub(r'(?i)\bcartridges\b', 'cart', seg)
    return re.sub(r'\s+', ' ', f"{brand} {seg}").strip().replace("(Il)", "(IL)")
def title_parts(t):
    bits = [x.strip() for x in str(t).split(' - ')]
    brand = bits[0]; strain = bits[1] if len(bits) > 1 else ''
    seg = bits[2] if len(bits) > 3 else ''
    return brand, strain, seg

def finalize(a):
    d = pd.read_csv(f"{a.dir}/verdicts.csv", keep_default_na=False, na_values=[''])
    for c in ('brand', 'brand_l', 'fix_reason', 'line_name'): d[c] = d[c].fillna('').astype(str)
    L = pd.read_csv(f"{a.dir}/lines.csv", keep_default_na=False, na_values=['']).fillna({'slot': '', 'fix_reason': '', 'brand': ''})
    S = pd.read_csv(f"{a.dir}/spaces.csv", keep_default_na=False, na_values=[''])
    notes = json.load(open(f"{a.dir}/summary.json")); days = notes.get('days') or 28; wks = round(days / 7)
    sc = getattr(a, 'scope', None) or 'state'      # the market the shelf is compared with: 'state' (default) or 'county'
    def unit(r): return 'g' if (r['cat'] == 'Flower' and r.subform == 'deli') else ''
    def rate(v, u=''):
        if v >= 10: return f"about {v:,.0f}{u} a week"
        if v >= 1: return f"about {v:.0f}{u} a week"
        return f"{v*wks:.0f}{u} sold in {wks} weeks"
    # nearby prices (line level)
    L['nearby_price'] = np.nan
    if a.prices:
        pr = pd.read_csv(a.prices); L['nearby_price'] = L.line_id.map(dict(zip(pr.line_id, pr.nearby_price)))
    over = (L.verdict == 'Fix') & (L.fix_reason == 'slow despite local demand') & (L.price > L.nearby_price * 1.08)
    L.loc[over, 'fix_reason'] = 'priced above nearby stores'
    # replacements (lines) and rotate picks (strains) from Hoodie market data only
    rep, rot = {}, {}
    if a.repl:
        r = pd.read_csv(a.repl).dropna(subset=['title'])
        tp = r.title.map(title_parts)
        r['r_brand'] = [x[0] for x in tp]; r['r_strain'] = [x[1] for x in tp]; r['r_seg'] = [x[2] for x in tp]
        carried_t = [toks(p) for p in d['product']]
        for s, g in r.groupby('slot', sort=False):
            if s[0] in 'SA':
                spaces = set(L[L.slot == s].space) if s[0] == 'S' else set(S[S.add_slot == s]['space'])
                buckets = set(S[S['space'].isin(spaces)].bucket)            # a new line must be new to the whole shelf space,
                spaces = set(S[S.bucket.isin(buckets)]['space']) | spaces    # e.g. a pod replacement can't be a brand you sell as carts
                store_brands = {frozenset(toks(b)) for b in d[d.space.isin(spaces)].brand_l if toks(b)}
                def carried_brand(b):
                    bt = toks(b)
                    return any(sb and len(bt & sb) / max(1, len(bt)) >= 0.6 for sb in store_brands)
                g = g[~g.r_brand.map(carried_brand)]
                if g.empty: rep[s] = []; continue
                g = g.assign(wd=g.avg_price * g.dollars).sort_values('dollars', ascending=False)
                agg = (g.groupby(['r_brand', 'r_seg'], sort=False)
                       .agg(dollars=('dollars', 'sum'), stores=('stores', 'max'), wd=('wd', 'sum'),
                            top=('r_strain', lambda x: ', '.join(list(x)[:2])))
                       .reset_index())
                agg['avg_price'] = agg.wd / agg.dollars.where(agg.dollars > 0, 1)
                agg = agg.sort_values('dollars', ascending=False)
                agg = agg.drop_duplicates('r_brand').head(3)
                rep[s] = [{'line': clean_line(b, seg), 'top': t, 'stores': int(st), 'avg_price': round(p, 2)}
                          for b, seg, t, st, p in zip(agg.r_brand, agg.r_seg, agg.top, agg.stores, agg.avg_price)]
            else:
                def is_carried(t):
                    nt = toks(t) - GENERIC
                    return any(len(nt & c) / max(1, len(nt)) >= 0.8 for c in carried_t)
                g = g[~g.r_strain.map(lambda x: not x) & ~g.title.map(lambda t: is_carried(title_parts(t)[1] + ' ' + title_parts(t)[0]))]
                rot[s] = list(g.sort_values('dollars', ascending=False).r_strain.drop_duplicates().head(3))
    # line plans
    def strains_of(lid, cond=None):
        x = d[d.line_id == lid]
        if cond is not None: x = x[cond(x)]
        return x
    def plan(r):
        x = strains_of(r.line_id)
        if r.fix_reason == 'out most of the period':
            wk = max(r.mid, r.per_strain) * r.strains
            return ("Out of stock for most of the period, so its sales here say little. Its brand sells well in your market.",
                    ["Ask the vendor if the line is still available; if not, take it off the shelf and use the space for a replacement",
                     f"If it is, reorder about {math.ceil(4*wk):,.0f} across its {r.strains} strains (a month at what similar lines sell here)",
                     "Set minimums so each strain reorders at about 2 weeks of stock"])
        if r.fix_reason == 'ran out':
            ro = x[x.ran_out]
            need = int(sum(max(0, math.ceil(30 * pdy) - oh) for pdy, oh in zip(ro.per_day, ro.onhand)))
            lost = r.lost if r.lost == r.lost else 0
            return (f"{len(ro)} of its {r.strains} strains ran out" + (f", about {fmt_money(lost)} in missed sales" if lost > 0 else '') + '.',
                    [(f"Reorder about {need:,} across the strains that ran out" if need >= 3 else "Back in stock, so no big order is needed today"),
                     "Set minimums at about 2 weeks of sales per strain so the line doesn't go dark again",
                     "Check in 4 weeks; if it's still slow while in stock, move it to Cut"])
        if r.fix_reason == 'priced above nearby stores':
            return (f"The brand sells well nearby, but you're about {fmt_money(r.price - r.nearby_price)} above nearby stores.",
                    [f"Match nearby pricing (about {fmt_money(r.nearby_price)}) on the line for 30 days",
                     "Feature it in your online deals section during the test",
                     "Keep it if weekly sales at least double; otherwise move it to Cut"])
        if r.fix_reason == 'only option':
            return ("Slow, but it's your only line at this size and form.",
                    ["Keep one line here so customers have a choice",
                     f"Swap it for one of the {sc}'s best sellers at this size when stock runs down"])
        np_txt = f" Your price is in line with nearby stores (about {fmt_money(r.nearby_price)})." if r.nearby_price == r.nearby_price else ''
        return (f"The brand sells well in your market but this line is slow here.{np_txt}",
                ["Check the online product listing: right category, photo, clear name and size",
                 "Move it to eye level or the featured section, and brief budtenders on it",
                 "Run a 2-week bundle or sample day; keep it if weekly sales double, otherwise move it to Cut"])
    def line_item(r, kind):
        x = strains_of(r.line_id)
        base = {'line': r.line, 'category': r['cat'], 'strains': int(r.strains), 'per_week': rate(r.per_week, unit(r)),
                'shelf': round(r.shelf), 'price': round(r.price, 2),
                'strain_names': [p for p in x.sort_values('per_week', ascending=False)['product']]}
        if kind == 'fix': base['why'], base['plan'] = plan(r); base['reason'] = r.fix_reason
        if kind == 'cut':
            sold = x.units.sum()
            base['why'] = f"{sold:.0f} sold across {int(r.strains)} strain{'s' if r.strains > 1 else ''} in {wks} weeks, {fmt_money(r.shelf)} on the shelf. Similar lines here sell more than twice as fast."
            base['exit'] = 'Return to vendor or mark down 30% to clear' if sold == 0 else 'Mark down 20-25% or bundle, and stop reordering the line'
            base['replacements'] = rep.get(r.slot, [])
        if kind == 'rotate':
            slow = x[x.rotate].sort_values('per_week')
            base['slow'] = [f"{p} ({rate(w, unit(r))})" for p, w in zip(slow['product'], slow.per_week)]
            base['try'] = rot.get(r.line_id, [])
            base['line_rate'] = rate(r.per_strain, unit(r)) + ' per strain'
        return base
    keepL = L[L.verdict == 'Keep']; fixL = L[L.verdict == 'Fix']; cutL = L[L.verdict == 'Cut']; watchL = L[L.verdict == 'Watch']
    fixL = fixL.assign(val=fixL.lost.fillna(0) + (fixL.mid - fixL.per_strain).clip(lower=0) * fixL.price * fixL.strains * (days / 7)).sort_values('val', ascending=False)
    rotL = L[L.rotate_n > 0].sort_values('sales', ascending=False)
    reorder = d[d.reorder_now].sort_values('sales', ascending=False)
    def reorder_item(r):
        u = unit(r)
        left = 'Out now' if r.onhand <= 0 else ('Less than a day left' if r.days_left < 1 else f"About {r.days_left:.0f} days left")
        return {'product': r['product'], 'line': r.line_name, 'per_week': rate(r.per_week, u), 'on_hand': int(r.onhand),
                'note': left + (f" · reorder about {r.reorder_qty:,.0f}{u}" if r.reorder_qty > 0 else '')}
    S['hcat'] = S['cat'].map(lambda c: HOODIE_CAT.get(c, c))
    S = S.sort_values(['hcat', 'sales'], ascending=[True, False])
    S['add_slot'] = S['add_slot'].fillna('').astype(str) if 'add_slot' in S else ''
    S['show'] = ((S.store_share >= 0.04) | ((S.status != 'Balanced') & ((S.county_share.fillna(0) >= 0.03) | (S.store_share >= 0.015)))) & ~S['cat'].isin(['Accessories', 'Other'])
    spaces = []
    for _, s in S[S.show].iterrows():
        label = pretty_size(s.size_label, s.pack) + ' ' + {'all-in-one': 'all-in-ones', 'pod': 'pods', 'cartridge': 'carts', 'infused': 'infused',
                 'ground': 'ground', 'deli': 'deli', 'smalls': 'smalls', 'regular': 'singles' if str(s.pack) == '1' else 'packs',
                 'gummy': 'gummies', 'chocolate': 'chocolate', 'baked': 'baked goods', 'hard candy': 'hard candy', 'drink': 'drinks',
                 'rosin': 'rosin', 'shatter': 'shatter', 'distillate': 'distillate', 'hash': 'hash', 'resin/wax': 'badder & wax',
                 'standard': '' if s['cat'] != 'Flower' else 'flower'}.get(s.subform, s.subform)
        act = {'Under-built': f"Sells a bigger share in your {sc} than here. Add one of the {sc}'s strong lines.",
               'Over-built': f"Bigger here than in your {sc}, and {s.products} products share sales that about {s.fair_products} would carry. Trim the slowest lines and strains.",
               'Heavy': f"Takes {s.bucket_share:.0%} of your {({'Oral': 'tincture and capsule'}.get(s.hcat, s.hcat.lower()))} sales vs {s.county_share:.0%} in your {sc}, though its products sell at a normal pace. Fine if it's a deliberate specialty; otherwise hold off on adding lines here and put new buys toward under-built spaces.",
               'Crowded': f"{s.products} products across {s.lines} lines share sales that about {s.fair_products} would carry. Cut the weakest lines and rotate slow strains.",
               'Balanced': ''}[s.status]
        spaces.append({'cat': {'Oral': 'Tinctures & Capsules'}.get(s.hcat, s.hcat), 'space': label.strip() or s.subform, 'lines': int(s.lines), 'products': int(s.products),
                       'per_week': round(s.per_week), 'store_share': round(s.store_share, 3), 'bucket_share': round(s.bucket_share, 3), 'shared_bucket': bool(abs(s.bucket_share - s.store_share) > 1e-9),
                       'county_share': (round(s.county_share, 3) if s.county_share == s.county_share else None),
                       'status': s.status, 'action': act, 'cut_lines': int(s.cut_lines), 'add_lines': rep.get(s.add_slot, []) if s.add_slot else []})
    report = {
        'title': a.title, 'period': a.period, 'market_label': a.market_label, 'scope': sc,
        'counts': {k: int((L.verdict == k).sum()) for k in ('Keep', 'Fix', 'Cut', 'Watch')},
        'products': int(len(d)), 'lines': int(len(L)), 'rotate_strains': int(d.rotate.sum()), 'rotate_lines': int(len(rotL)),
        'reorder_now': int(d.reorder_now.sum()), 'out_now': int(((d.status == 'Keep') & (d.onhand <= 0)).sum()),
        'lost_total': round(d.lost.sum()) if d.lost.notna().any() else None,
        'cut_shelf': round(cutL.shelf.sum()), 'fix_lost': round(fixL.lost.sum()) if fixL.lost.notna().any() else None,
        'space_status': S.status.value_counts().to_dict(),
        'spaces': spaces,
        'reorder_top': [reorder_item(r) for _, r in reorder.head(10).iterrows()],
        'fix_top': [line_item(r, 'fix') for _, r in fixL.head(10).iterrows()],
        'cut_top': [line_item(r, 'cut') for _, r in cutL.sort_values('shelf', ascending=False).head(10).iterrows()],
        'rotate_top': [line_item(r, 'rotate') for _, r in rotL.head(10).iterrows()],
        'edge_top': [line_item(r, 'keep') for _, r in keepL[keepL.edge].sort_values('sales', ascending=False).head(5).iterrows()],
        'all': [{'product': r['product'], 'line': r.line_name, 'cat': r['cat'], 'status': r.status, 'per_week': round(r.per_week, 1),
                 'onhand': int(r.onhand), 'days_left': int(min(r.days_left, 9999)) if r.days_left == r.days_left else 9999,
                 'shelf_dollars': round(r.shelf_dollars)} for _, r in d.iterrows()],
        'notes': notes,
    }
    import os
    if os.path.exists(f"{a.dir}/locations.json"):
        report['locations'] = location_flags(a.dir, d, L.reset_index() if 'line_key' not in L else L, days, rate, fmt_money)
        print('location flags:', [(f['kinds'], f['line'], f['stores_flagged']) for f in report['locations']['flags']])
    json.dump(report, open(f"{a.dir}/report.json", 'w'), indent=1, default=str)
    print(json.dumps({k: report[k] for k in ('counts', 'lines', 'products', 'rotate_strains', 'reorder_now', 'out_now', 'cut_shelf', 'space_status')}, indent=1, default=str))
    print('replacement slots filled:', {s: len(v) for s, v in rep.items()}, '| rotate picks:', {s: len(v) for s, v in rot.items()})

# ---------------------------------------------------------------- banner
def banner(a):
    """Roll several prepped-and-scored store folders into one chain-level folder. Then run score, finalize and render on
    --out as usual; finalize sees locations.json and adds the store table and location flags."""
    import os, argparse as _ap
    os.makedirs(a.out, exist_ok=True)
    frames, stores, days, long_days = [], [], None, None
    for sd in a.dirs:
        if not os.path.exists(f"{sd}/verdicts.csv"): sys.exit(f"{sd}: run prep and score for this store first")
        n = json.load(open(f"{sd}/summary.json"))
        p_ = pd.read_csv(f"{sd}/products.csv", keep_default_na=False, na_values=[''])
        name = (n.get('stores') or [os.path.basename(sd.rstrip('/'))])[0]
        frames.append(p_.assign(_store=name)); stores.append({'name': name, 'dir': sd})
        days = days or n.get('days'); long_days = long_days or n.get('long_days')
    P = pd.concat(frames, ignore_index=True)
    g = P.groupby('key')
    def all_or_nan(s): return s.min() if s.notna().all() else np.nan      # a product is 'out' chain-wide only if every store was
    out = pd.DataFrame({'Dispensary': a.name, 'Product': g['product'].first(), 'Brand': g['brand'].first(),
                        'Category': g['category'].first(), 'Size': g['size'].first(),
                        'Units Sold': g['units'].sum(), 'Net Sales': g['sales'].sum(), 'Units On Hand': g['onhand'].sum(),
                        'Price': g['price'].median()})
    if P['cost'].notna().any(): out['Cost'] = g['cost'].median()
    if P['lost'].notna().any(): out['Lost Opportunity'] = g['lost'].sum()
    if P['oos_days'].notna().any(): out['Days Since OOS'] = g['oos_days'].agg(all_or_nan)
    if P['adu'].notna().any(): out['Avg Daily Units'] = g['adu'].sum()
    if 'first_sold' in P and P['first_sold'].notna().any(): out['First Sold'] = g['first_sold'].min()
    if long_days and P['units_long'].notna().any():
        out['Units Long'] = g['units_long'].sum()
        if P['sales_long'].notna().any(): out['Sales Long'] = g['sales_long'].sum()
    path = f"{a.out}/banner_input.csv"; out.to_csv(path, index=False)
    prep(_ap.Namespace(file=path, out=a.out, days=days, store=None, long_days=long_days))
    json.dump({'banner': a.name, 'stores': stores, 'days': days, 'long_days': long_days}, open(f"{a.out}/locations.json", 'w'), indent=1)
    print(f"banner folder ready: {len(stores)} stores -> {a.out}. Next: score, finalize, render on {a.out}.")

def location_flags(dirpath, d, L, days, rate, money):
    """Store table plus flags for lines (and categories) where one location is out of step with the rest of the chain:
    Driver (one store carries the line's chain sales), Lagging (the line works elsewhere but not at one store),
    Spike / Slide (recent vs longer window, mostly from one store), Split (chain says cut, one store says keep)."""
    loc = json.load(open(f"{dirpath}/locations.json"))
    long_days = loc.get('long_days'); weeks = (days or 28) / 7
    key2line = dict(zip(d.key, d.line_key)); key2cat = dict(zip(d.key, d['cat']))
    lname = dict(zip(L.line_key, L.line)); lverd = dict(zip(L.line_key, L.verdict)); lprice = dict(zip(L.line_key, L.price))
    lcat = dict(zip(L.line_key, L['cat'])); lsub = dict(zip(L.line_key, L.subform))
    V = []
    for s in loc['stores']:
        v = pd.read_csv(f"{s['dir']}/verdicts.csv", keep_default_na=False, na_values=[''])
        v['bline'] = v.key.map(key2line); v['bcat'] = v.key.map(key2cat); v['store'] = s['name']
        for c in ('per_week_long', 'sales_wk_long'):
            if c not in v: v[c] = np.nan
        V.append(v)
    V = pd.concat(V, ignore_index=True)
    V = V[V.bline.notna() & ~V.bcat.isin(['Accessories', 'Other'])]
    has_long = bool(long_days) and V.per_week_long.notna().any()
    short = lambda n: re.sub(r'^.*? - ', '', n) if ' - ' in n else n          # "Swade - Overland" -> "Overland"
    tot = V.groupby('store').sales.sum(); w = tot / tot.sum()
    # ---- store table
    store_rows = []
    for s in loc['stores']:
        x = V[V.store == s['name']]
        lv = x.drop_duplicates('line_key').line_verdict.value_counts()
        tr = None
        if has_long and x.sales_wk_long.sum() > 0: tr = round(float((x.sales.sum() / weeks) / x.sales_wk_long.sum() - 1), 3)
        store_rows.append({'store': short(s['name']), 'sales_wk': round(float(x.sales.sum() / weeks)), 'share': round(float(w.get(s['name'], 0)), 3),
                           'trend': tr, 'keep': int(lv.get('Keep', 0)), 'fix': int(lv.get('Fix', 0)), 'cut': int(lv.get('Cut', 0)), 'flags': 0})
    # ---- line level
    agg = dict(sales=('sales', 'sum'), pw=('per_week', 'sum'), pwl=('per_week_long', 'sum'),
               verdict=('line_verdict', lambda s: s.mode().iat[0] if len(s.mode()) else ''))
    M = V.groupby(['bline', 'store']).agg(**agg).reset_index()
    T = M.groupby('bline').agg(sales=('sales', 'sum'), pw=('pw', 'sum'), pwl=('pwl', 'sum'), n=('store', 'nunique'))
    material = T.sales >= T.sales[T.sales > 0].median()
    flags = []
    def per_store(bl, key='pw'):
        r = M[M.bline == bl].sort_values('pw', ascending=False)
        return [{'store': short(s), 'rate': rate(v_), 'share': round(float(sh), 3)} for s, v_, sh in
                zip(r.store, r[key], r.sales / max(T.at[bl, 'sales'], 1e-9))]
    for bl, t_ in T.iterrows():
        if t_.n < 2: continue
        rows = M[M.bline == bl]
        driver_here = False
        for _, r in rows.sort_values('pw', ascending=False).iterrows():
            others = rows[rows.store != r.store]
            pace = others.pw.values / w[others.store].values * w[r.store]   # each other store's rate, scaled to this store's size
            hi, lo = (pace.max(), pace.min()) if len(pace) else (0, 0)
            # Driver: well ahead of even the fastest other store. Lagging: well behind even the slowest one.
            # Using the extremes keeps one outlier from making every other store look out of line.
            share = r.sales / t_.sales if t_.sales > 0 else 0
            price = lprice.get(bl, 0) or 0
            st = short(r.store)
            if material[bl] and share >= 0.5 and r.pw >= 2 * max(hi, 0.5) and r.pw >= 3:
                driver_here = True
                flags.append({'kind': 'Driver', 'line': lname[bl], 'cat': lcat[bl], 'store': st, 'weight': (r.pw - hi) * price,
                    'text': f"{st} sells {share:.0%} of this line's chain sales but does only {w[r.store]:.0%} of the chain's total sales. "
                            f"The other stores sell {rate(others.pw.sum())} between them.",
                    'action': f"Order by store rather than chain-wide, and ask {st} what is working (placement, price, budtender push) to try at the others.",
                    'stores': per_store(bl)})
            elif lverd.get(bl) in ('Keep', 'Fix', 'Watch') and lo >= 2 and r.pw < 0.4 * lo and not (driver_here and t_.n == 2):
                # with two stores, 'the other one lags' just restates the Driver flag
                flags.append({'kind': 'Lagging', 'line': lname[bl], 'cat': lcat[bl], 'store': st, 'weight': (lo - r.pw) * price,
                    'text': (f"{st} sells {rate(r.pw)}." if r.pw >= 1 else f"{st} sold {r.pw * weeks:.0f} in {weeks:.0f} weeks.") + f" Even at the slowest other store's pace it would sell {rate(lo)}.",
                    'action': f"The line works elsewhere, so the fix is local: check stock, shelf spot and price at {st} before cutting it there.",
                    'stores': per_store(bl)})

        keepers = rows[rows.verdict == 'Keep'] if lverd.get(bl) == 'Cut' else rows.iloc[0:0]
        if len(keepers):
            names = ' and '.join(short(s) for s in keepers.store)
            rates_ = ', '.join(f"{short(s)} {rate(v_)}" for s, v_ in zip(keepers.store, keepers.pw))
            for s, v_ in zip(keepers.store, keepers.pw):
                flags.append({'kind': 'Split', 'line': lname[bl], 'cat': lcat[bl], 'store': short(s), 'weight': v_ * (lprice.get(bl, 0) or 0),
                    'text': f"Slow across the chain, but it still earns its space at {names} ({rates_}).",
                    'action': f"Stop reordering it for the other stores and keep it at {names}.", 'stores': per_store(bl)})
    # ---- spikes and slides: a store moving well off its own longer-window pace (chain totals can hide this)
    if has_long:
        for bl, t_ in T.iterrows():
            rows = M[M.bline == bl]; chg_all = t_.pw - t_.pwl; price = lprice.get(bl, 0) or 0
            for _, r in rows.iterrows():
                delta = r.pw - r.pwl
                up = delta > 0
                st = short(r.store); others = rows[rows.store != r.store]
                o_now, o_before = others.pw.sum(), others.pwl.sum()
                r_s = (delta / r.pwl) if r.pwl > 0 else None
                r_o = (o_now / o_before - 1) if o_before > 0 else None
                # at least 5 a week and 30% off its own pace, and out of step with the rest of the chain by 25 points or more
                big = abs(delta) >= 5 and (r_s is None or abs(r_s) >= 0.3) and (r_s is None or r_o is None or abs(r_s - r_o) >= 0.25)
                if not big: continue
                rest = (f"while the other stores moved {(o_now / o_before - 1):+.0%}" if o_before > 0 else "and no other store sells it")
                drive = (f" That is {min(delta / chg_all, 1):.0%} of the chain's change on this line." if chg_all and np.sign(chg_all) == np.sign(delta) and delta / chg_all >= 0.6 else '')
                pct = 'new' if r.pwl == 0 else f"{delta / r.pwl:+.0%}"
                flags.append({'kind': 'Spike' if up else 'Slide', 'line': lname[bl], 'cat': lcat[bl], 'store': st, 'weight': abs(delta) * price,
                    'text': f"At {st} this line went from {rate(r.pwl)} over the {window_label(long_days)} to {rate(r.pw)} in the {window_label(days)} ({pct}), {rest}.{drive}",
                    'action': (f"Confirm it is real demand at {st} (not a one-off deal or a restock catch-up) and raise {st}'s order. If it is a push that worked, try it at the other stores."
                               if up else f"Check {st} for a stock gap, a price change or a lost shelf spot before treating this as a slowdown."),
                    'stores': per_store(bl)})
    # ---- category level spikes and slides (dollars, so sizes compare)
    if has_long:
        C = V.groupby(['bcat', 'store']).agg(now=('sales', lambda s: s.sum() / weeks), before=('sales_wk_long', 'sum')).reset_index()
        for c_, g_ in C.groupby('bcat'):
            now, before = g_.now.sum(), g_.before.sum()
            if before <= 0 or len(g_) < 2: continue
            chg = now - before
            if abs(chg) / before >= 0.2 and abs(chg) >= 500:
                g_ = g_.assign(delta=g_.now - g_.before)
                top = g_.loc[(g_.delta * np.sign(chg)).idxmax()]; part = top.delta / chg
                if part >= 0.6:
                    st = short(top.store); up = chg > 0
                    flags.append({'kind': 'Spike' if up else 'Slide', 'line': f"All {c_.lower()}", 'cat': c_, 'store': st, 'weight': abs(top.delta) * 1.0,
                        'text': f"{c_} sales are {'up' if up else 'down'} {abs(chg) / before:.0%} chain-wide ({money(before)} to {money(now)} a week), "
                                f"and {st} accounts for {min(part, 1):.0%} of the {'rise' if up else 'drop'}.",
                        'action': (f"Find out what changed at {st} (new brand, deal, display) and whether it can travel to the other stores."
                                   if up else f"Look at {st} first: stock gaps, a dropped brand or a price change in {c_.lower()}."),
                        'stores': [{'store': short(s), 'rate': f"{money(n_)}/wk (was {money(b_)})", 'share': round(float(n_ / now), 3) if now else 0}
                                   for s, n_, b_ in zip(g_.store, g_.now, g_.before)]})
    # one card per line: merge every signal on it, strongest first
    order = {'Spike': 0, 'Slide': 1, 'Driver': 2, 'Lagging': 3, 'Split': 4}
    merged = {}
    for f in sorted(flags, key=lambda f: -f['weight']):
        m_ = merged.setdefault(f['line'], {'line': f['line'], 'cat': f['cat'], 'kinds': [], 'stores_flagged': [], 'text': [], 'action': [],
                                         'weight': 0, 'stores': f['stores']})
        m_['kinds'].append(f['kind']); m_['stores_flagged'].append(f['store'])
        if f['text'] not in m_['text']: m_['text'].append(f['text'])
        if f['action'] not in m_['action']: m_['action'].append(f['action'])
        m_['weight'] += f['weight']
    flags = sorted(merged.values(), key=lambda f: -f['weight'])[:12]
    for f in flags:
        f['kinds'] = sorted(set(f['kinds']), key=lambda k: order[k])
        for s_ in set(f['stores_flagged']):
            for r in store_rows:
                if r['store'] == s_: r['flags'] += 1
        f['weight'] = round(f['weight'])
    return {'banner': loc['banner'], 'stores': store_rows, 'flags': flags, 'has_long': has_long,
            'windows': [window_label(days), window_label(long_days)] if has_long else [window_label(days)]}

# ---------------------------------------------------------------- add-repl
def add_repl(a):
    """Append a marketIntelligence_pivotQuery result (rows productCompositeTitleV2; dollars, dispensaryCount,
    weightedAveragePrice) to replacements.csv under one slot (S# for a cut slot, L# for a rotate line).
    --json is the saved tool-result file, or '-' for stdin."""
    raw = sys.stdin.read() if a.json == '-' else open(a.json).read()
    def find(o):
        if isinstance(o, dict):
            if 'columns' in o and 'rows' in o: return o
            for v in o.values():
                f = find(v)
                if f: return f
    pay = find(json.loads(raw))
    ids = [c['id'].split(':')[-1].split('@')[0] for c in pay['columns']]
    ix = {k: ids.index(k) for k in ('productCompositeTitleV2', 'dollars', 'dispensaryCount', 'weightedAveragePrice')}
    rows = [{'slot': a.slot, 'title': r[ix['productCompositeTitleV2']], 'dollars': r[ix['dollars']],
             'stores': r[ix['dispensaryCount']], 'avg_price': r[ix['weightedAveragePrice']]}
            for r in pay['rows'] if r[ix['productCompositeTitleV2']] and (r[ix['dispensaryCount']] or 0) >= 3]
    import os
    path = f"{a.dir}/replacements.csv"
    pd.DataFrame(rows, columns=['slot', 'title', 'dollars', 'stores', 'avg_price']).to_csv(path, mode='a', header=not os.path.exists(path), index=False)
    print(f"{a.slot}: added {len(rows)} rows")

# ---------------------------------------------------------------- render
CSS = """
/* Hoodie Analytics brand: Nunito headings, Inter body, Hoodie Blue #1D3463 and Hoodie Green #50BB80, dark green to navy header band.
   Layout: header band; verdict tiles; shelf by category; reorders; fix, cut, rotate; favorites; gaps; full list; footer */
:root{--bg:#F5F5F5;--surface:#FFFFFF;--ink:#1A1A1A;--head:#1D3463;--muted:#555555;--line:#CCCCCC;--soft:#F5F5F5;
--accent:#50BB80;--accent-text:#215734;--bar:#1D3463;--track:#D6E4F7;--band1:#215734;--band2:#1A406D;
--keep:#215734;--keep-s:#50BB80;--keep-bg:#E3F4EA;--fix:#1A1A1A;--fix-s:#FFC000;--fix-bg:#FFF3CC;--cut:#A3261E;--cut-s:#A3261E;--cut-bg:#FBE5E3;
--watch:#555555;--watch-s:#8E99B1;--watch-bg:#EEF0F4;--rot:#1A406D;--rot-s:#1A406D;--rot-bg:#D6E4F7;
--f-display:'Nunito',Arial,sans-serif;--f-body:'Inter',Helvetica,Arial,sans-serif;--f-data:'Inter',Helvetica,Arial,sans-serif}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#13264A;--surface:#1D3463;--ink:#FFFFFF;--head:#FFFFFF;--muted:#D6E4F7;--line:#34507F;--soft:#1A406D;
--accent:#50BB80;--accent-text:#50BB80;--bar:#D6E4F7;--track:#34507F;
--keep:#50BB80;--keep-s:#50BB80;--keep-bg:rgba(80,187,128,.16);--fix:#FFC000;--fix-s:#FFC000;--fix-bg:rgba(255,192,0,.14);--cut:#F2948C;--cut-s:#F2948C;--cut-bg:rgba(242,148,140,.14);
--watch:#D6E4F7;--watch-s:#8E99B1;--watch-bg:rgba(142,153,177,.18);--rot:#D6E4F7;--rot-s:#D6E4F7;--rot-bg:rgba(214,228,247,.14);color-scheme:dark}}
:root[data-theme="dark"]{--bg:#13264A;--surface:#1D3463;--ink:#FFFFFF;--head:#FFFFFF;--muted:#D6E4F7;--line:#34507F;--soft:#1A406D;
--accent:#50BB80;--accent-text:#50BB80;--bar:#D6E4F7;--track:#34507F;
--keep:#50BB80;--keep-s:#50BB80;--keep-bg:rgba(80,187,128,.16);--fix:#FFC000;--fix-s:#FFC000;--fix-bg:rgba(255,192,0,.14);--cut:#F2948C;--cut-s:#F2948C;--cut-bg:rgba(242,148,140,.14);
--watch:#D6E4F7;--watch-s:#8E99B1;--watch-bg:rgba(142,153,177,.18);--rot:#D6E4F7;--rot-s:#D6E4F7;--rot-bg:rgba(214,228,247,.14);color-scheme:dark}
body{background:var(--bg);color:var(--ink);font-family:var(--f-body);font-size:15px;line-height:1.5;margin:0}
.wrap{max-width:1000px;margin:0 auto;padding-inline:16px;padding-block:20px 48px;display:flex;flex-direction:column;gap:32px}
h1,h2,h3{font-family:var(--f-display);text-wrap:balance;margin:0;color:var(--head)}
h1{font-size:2.3rem;line-height:1.1;font-weight:800}h2{font-size:1.5rem;font-weight:800}h3{font-size:1.05rem;font-weight:700}
.eyebrow{font:700 .72rem/1 var(--f-body);text-transform:uppercase;letter-spacing:.1em;color:var(--accent-text)}
.hero{background:linear-gradient(120deg,var(--band1) 0%,var(--band2) 100%);color:#FFFFFF;border-radius:12px;padding:24px clamp(18px,4vw,36px) 28px;display:flex;flex-direction:column;gap:12px;position:relative;overflow:hidden}
.hero::after{content:"";position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;border:28px solid rgba(80,187,128,.18)}
.hero .brandrow{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;position:relative;z-index:1}
.hero .logo{height:44px;width:auto;display:block}
.hero .logotext{font:800 1.5rem/1 var(--f-display);color:#FFFFFF;letter-spacing:.01em}.hero .logotext span{font:700 .7rem/1 var(--f-body);letter-spacing:.18em;margin-left:6px;color:#50BB80}
.hero .eyebrow{color:#FFFFFF;opacity:.85}
.hero h1{color:#FFFFFF;position:relative;z-index:1}
.hero .short{color:#FFFFFF;position:relative;z-index:1}
.hero .tag{color:#D6E4F7;position:relative;z-index:1}
.short{font-size:1.05rem;max-width:72ch;margin:0}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.tile{background:var(--surface);border:1px solid var(--line);border-top:5px solid var(--cs);border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:4px;min-width:0}
.tile .n{font:800 2.1rem/1 var(--f-display);color:var(--c)}.tile .l{font-weight:600;color:var(--head)}.tile .s{color:var(--muted);font-size:.85rem}
section{display:flex;flex-direction:column;gap:14px}
.sec-head{display:flex;flex-direction:column;gap:4px}.sec-head p{margin:0;color:var(--muted);max-width:70ch}
.tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:8px;background:var(--surface)}
table{border-collapse:collapse;width:100%;font-size:.88rem}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font:700 .7rem/1.2 var(--f-body);text-transform:uppercase;letter-spacing:.08em;color:var(--head);background:var(--soft);position:sticky;top:0}
td.num,th.num{text-align:right;font-family:var(--f-data);font-variant-numeric:tabular-nums;white-space:nowrap;font-weight:500}
tr:last-child td{border-bottom:0}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,440px),1fr));gap:12px}
.card{background:var(--surface);border:1px solid var(--line);border-left:5px solid var(--cs);border-radius:8px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;min-width:0}
.tag{display:inline-flex;gap:6px;align-items:center;font:400 .78rem/1.35 var(--f-body);color:var(--muted);flex-wrap:wrap}
.tag b{color:var(--ink);font-weight:600}
td .tag{display:flex;margin-top:2px}
.pill{display:inline-block;font:700 .68rem/1 var(--f-body);text-transform:uppercase;letter-spacing:.06em;padding:5px 8px;border-radius:999px;background:var(--cb);color:var(--c)}
.why{margin:0}
ol.plan{margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:3px}
.exit{margin:0;font-weight:600;color:var(--c)}
.repl{border-top:1px dashed var(--line);padding-top:8px;display:flex;flex-direction:column;gap:6px}
.repl ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
.repl li{display:flex;justify-content:space-between;gap:4px 12px;font-size:.9rem;flex-wrap:wrap}
.repl li>span:first-child{min-width:0;flex:1 1 220px}
.repl li span:last-child{font-family:var(--f-data);color:var(--muted);white-space:nowrap;font-size:.8rem}
.gaps{margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:6px;max-width:72ch}
.controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.controls input,.controls select{font:inherit;padding:7px 10px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink);min-width:0}
.controls input{flex:1 1 220px}
.chip{font:600 .78rem/1 var(--f-body);padding:7px 12px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer}
.chip[aria-pressed="true"]{background:var(--head);color:var(--surface);border-color:var(--head)}
button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.more{align-self:flex-start;font:600 .85rem var(--f-body);padding:8px 14px;border-radius:6px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer}
.k{--c:var(--keep);--cs:var(--keep-s);--cb:var(--keep-bg)}.f{--c:var(--fix);--cs:var(--fix-s);--cb:var(--fix-bg)}.x{--c:var(--cut);--cs:var(--cut-s);--cb:var(--cut-bg)}
.w{--c:var(--watch);--cs:var(--watch-s);--cb:var(--watch-bg)}.r{--c:var(--rot);--cs:var(--rot-s);--cb:var(--rot-bg)}
.strains{margin:0;font-size:.85rem;color:var(--muted)}
.strains b{color:var(--ink);font-weight:600}
td.cat{font-weight:700;white-space:nowrap;color:var(--head);font-family:var(--f-display)}
.share{font-family:var(--f-data);font-variant-numeric:tabular-nums;white-space:nowrap;font-weight:500}
.bar{display:block;height:7px;border-radius:4px;background:var(--track);margin-top:5px;position:relative;min-width:80px}
.bar i{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:var(--bar)}
.bar u{position:absolute;top:-4px;bottom:-4px;width:3px;border-radius:2px;background:var(--accent)}
footer{border-top:3px solid var(--accent);padding-top:16px;color:var(--muted);font-size:.85rem;display:flex;flex-direction:column;gap:10px}
footer strong{color:var(--head);font-family:var(--f-display)}
footer ul{margin:0;padding-left:1.1em;display:flex;flex-direction:column;gap:3px}
.brandline{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:.78rem;color:var(--muted);border-top:1px solid var(--line);padding-top:10px}
.brandline b{color:var(--head);font-family:var(--f-display);font-weight:800}
"""
JS = """
const DATA=JSON.parse(document.getElementById('data').textContent);
const CLS={Keep:'k',Fix:'f',Cut:'x',Watch:'w',Rotate:'r'};let shown=150,verdict='All';
const q=document.getElementById('q'),cat=document.getElementById('cat'),body=document.getElementById('rows'),more=document.getElementById('more'),cnt=document.getElementById('count');
[...new Set(DATA.map(r=>r.cat))].sort().forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;cat.appendChild(o)});
const money=v=>'$'+Math.round(v).toLocaleString();
const e=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function draw(){const t=q.value.trim().toLowerCase();const rows=DATA.filter(r=>(verdict==='All'||r.status===verdict)&&(!cat.value||r.cat===cat.value)&&(!t||(r.product+' '+r.line).toLowerCase().includes(t)));
cnt.textContent=rows.length.toLocaleString()+' products';
body.innerHTML=rows.slice(0,shown).map(r=>`<tr><td>${e(r.product)}<div class="tag">${e(r.line)}</div></td><td>${e(r.cat)}</td><td><span class="pill ${CLS[r.status]}">${r.status}</span></td><td class="num">${r.per_week}/wk</td><td class="num">${r.onhand}</td><td class="num">${r.days_left>=9999?'n/a':r.days_left}</td><td class="num">${money(r.shelf_dollars)}</td></tr>`).join('');
more.hidden=rows.length<=shown;}
document.querySelectorAll('.chip').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true');verdict=b.dataset.v;shown=150;draw();}));
q.addEventListener('input',()=>{shown=150;draw()});cat.addEventListener('change',()=>{shown=150;draw()});more.addEventListener('click',()=>{shown+=300;draw()});draw();
"""
def esc(s):
    import html; return html.escape(str(s), quote=True)

def logo_html(path):
    """Hoodie reversed (white) wordmark, trimmed to its artwork and shrunk, embedded as a data URI.
    Falls back to a text wordmark when the file or Pillow is missing; never redraw the logo."""
    import base64, io
    if path:
        try:
            from PIL import Image
            im = Image.open(path).convert('RGBA'); bb = im.getbbox()
            if bb: im = im.crop(bb)
            w = 360; im = im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)
            buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True)
            return f"<img class='logo' alt='Hoodie Analytics' src='data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}'>"
        except Exception as e:
            print('logo not embedded:', e)
    return "<span class='logotext'>hoodie<span>ANALYTICS</span></span>"

def render(a):
    R = json.load(open(f"{a.dir}/report.json"))
    X = json.load(open(a.extra)) if a.extra else {}
    c = R['counts']; n = R['notes']; sc = R.get('scope', 'county')
    def money(v): return f"${v:,.0f}"
    def pct(v): return 'n/a' if v is None else f"{v*100:.0f}%"
    tiles = [
        ('k', c['Keep'], 'Lines to keep', X.get('reorder_tile') or f"{R['reorder_now']:,} products need reordering now"),
        ('f', c['Fix'], 'Lines to fix', (f"about {money(R['fix_lost'])} in missed sales" if R.get('fix_lost') else 'selling below their potential')),
        ('x', c['Cut'], 'Lines to cut', f"{money(R['cut_shelf'])} sitting on the shelf"),
        ('r', R['rotate_strains'], 'Strains to rotate', f"inside {R['rotate_lines']} lines that are working"),
        ('w', c['Watch'], 'Lines to watch', 'new or middling; check next month'),
    ]
    h = [f"<title>{esc(X.get('page_title', R['title'] + ' Shelf Health'))}</title>",
         '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=Inter:wght@400;500;600;700&display=swap">',
         f"<style>{CSS}</style><div class='wrap'>",
         f"<header class='hero'><div class='brandrow'>{logo_html(a.logo)}<span class='eyebrow'>Shelf health · {esc(R['period'])}</span></div><h1>{esc(R['title'])}</h1>"]
    if X.get('short_version'): h.append(f"<p class='short'>{esc(X['short_version'])}</p>")
    n_st = len(R.get('locations', {}).get('stores', [])) if R.get('locations') else 0
    h.append(f"<span class='tag'>{R['products']:,} products in {R['lines']:,} product lines" + (f" across {n_st} stores" if n_st else '') + ". A line is one brand's product at one size and form, all strains together.</span></header><div class='tiles'>")
    for cl, num_, lab, sub in tiles:
        h.append(f"<div class='tile {cl}'><span class='n'>{num_:,}</span><span class='l'>{lab}</span><span class='s'>{esc(sub)}</span></div>")
    h.append("</div>")
    # layer 1: shelf by category
    if R['spaces']:
        has_cty = any(s['county_share'] is not None for s in R['spaces'])
        h.append("<section><div class='sec-head'><span class='eyebrow'>Step back</span><h2>Your shelf by category</h2><p>Each row is one kind of shelf space. "
                 f"It compares your share of the category's sales with the {sc}'s" + (" (the tick on the bar)" if has_cty else '') +
                 ", and how many product lines are splitting those sales.</p></div>")
        h.append("<div class='tablewrap'><table><thead><tr><th>Category</th><th>Space</th><th class='num'>Lines</th><th class='num'>Sells</th>"
                 "<th>Share of category" + (f" · you vs {sc}" if has_cty else '') + "</th><th>What to do</th></tr></thead><tbody>")
        last = None
        def adds_html(s):
            if not s.get('add_lines'): return ''
            return "<div class='tag' style='margin-top:4px;line-height:1.35'>Try: " + esc('; '.join(f"{x['line']} ({x['top']})" for x in s['add_lines'])) + "</div>"
        for s in R['spaces']:
            cl = {'Under-built': 'f', 'Over-built': 'x', 'Heavy': 'w', 'Crowded': 'x', 'Balanced': 'k'}[s['status']]
            mine = s['bucket_share'] if (s.get('shared_bucket') and s['county_share'] is not None) else s['store_share']
            w = min(100, mine * 100 / 0.6) if mine else 0
            tick = '' if s['county_share'] is None else f"<u style='left:{min(100, s['county_share']*100/0.6):.0f}%'></u>"
            share = (f"<span class='share'>{pct(mine)}" + ('' if s['county_share'] is None else f" vs {pct(s['county_share'])}") + "</span>"
                     + f"<span class='bar'><i style='width:{w:.0f}%'></i>{tick}</span>"
                     + (f"<span class='tag' style='display:flex;margin-top:4px'>Combined with similar spaces; this one alone is {pct(s['store_share'])}</span>" if s.get('shared_bucket') and s['county_share'] is not None else ''))
            catcell = esc(s['cat']) if s['cat'] != last else ''
            last = s['cat']
            act = "<div class='tag' style='margin-top:4px;line-height:1.35'>" + esc(s['action']) + "</div>" if s['action'] else ''
            h.append(f"<tr><td class='cat'>{catcell}</td><td>{esc(s['space'])}</td><td class='num'>{s['lines']}</td><td class='num'>{s['per_week']:,}/wk</td>"
                     f"<td>{share}</td><td><span class='pill {cl}'>{esc(s['status'])}</span>{act}{adds_html(s)}</td></tr>")
        h.append("</tbody></table></div></section>")
    LOCS = R.get('locations')
    if LOCS:
        trend_hdr = f"<th class='num'>Trend</th>" if LOCS.get('has_long') else ''
        h.append("<section><div class='sec-head'><span class='eyebrow'>By location</span><h2>Your stores</h2><p>How each store contributes to the chain. "
                 + (f"Trend compares the {esc(LOCS['windows'][0])} with the {esc(LOCS['windows'][1])}. " if LOCS.get('has_long') else '')
                 + "Line counts use each store's own calls.</p></div><div class='tablewrap'><table><thead><tr><th>Store</th><th class='num'>Sells a week</th>"
                 f"<th>Share of chain sales</th>{trend_hdr}<th class='num'>Keep</th><th class='num'>Fix</th><th class='num'>Cut</th><th class='num'>Flags</th></tr></thead><tbody>")
        for s in LOCS['stores']:
            tr = '' if not LOCS.get('has_long') else f"<td class='num'>{'n/a' if s['trend'] is None else format(s['trend'], '+.0%')}</td>"
            h.append(f"<tr><td class='cat'>{esc(s['store'])}</td><td class='num'>{money(s['sales_wk'])}</td>"
                     f"<td><span class='share'>{pct(s['share'])}</span><span class='bar'><i style='width:{min(100, s['share'] * 100):.0f}%'></i></span></td>{tr}"
                     f"<td class='num'>{s['keep']}</td><td class='num'>{s['fix']}</td><td class='num'>{s['cut']}</td><td class='num'>{s['flags']}</td></tr>")
        h.append("</tbody></table></div></section>")
        if LOCS['flags']:
            KCLS = {'Spike': 'k', 'Driver': 'r', 'Lagging': 'f', 'Slide': 'w', 'Split': 'w'}
            KTXT = {'Spike': 'Spike', 'Driver': 'One store drives it', 'Lagging': 'Lagging at one store', 'Slide': 'Slide', 'Split': 'Keep at one store only'}
            h.append("<section><div class='sec-head'><span class='eyebrow'>By location</span><h2>Location flags</h2><p>Lines where one store is out of step with the rest of the chain: "
                     "one store carries most of the sales, one store lags well behind the others, sales jumped or dropped mostly at one store, or a chain-wide cut "
                     "would remove a line that works at one store. Check these before ordering or cutting chain-wide.</p></div><div class='cards'>")
            for f in LOCS['flags']:
                pills = ' '.join(f"<span class='pill {KCLS[k]}'>{esc(KTXT[k])}</span>" for k in f['kinds'])
                who = ', '.join(dict.fromkeys(f['stores_flagged']))
                strip = ' · '.join(f"<b>{esc(x['store'])}</b> {esc(x['rate'])}" + (f" ({pct(x['share'])})" if x.get('share') is not None else '') for x in f['stores'])
                body = ''.join(f"<p class='why'>{esc(x)}</p>" for x in f['text'])
                acts = ''.join(f"<li>{esc(x)}</li>" for x in f['action'])
                h.append(f"<article class='card {KCLS[f['kinds'][0]]}'><div style='display:flex;gap:6px;flex-wrap:wrap'>{pills}</div><h3>{esc(f['line'])}</h3>"
                         f"<span class='tag'>{esc(f['cat'])} · flagged at <b>{esc(who)}</b></span>{body}<ol class='plan'>{acts}</ol>"
                         f"<p class='strains'>{strip}</p></article>")
            h.append("</div></section>")
    if R['reorder_top']:
        h.append(f"<section><div class='sec-head'><span class='eyebrow'>Keep</span><h2>Reorder these first</h2><p>Steady sellers that are out or will run out within two weeks. {R['reorder_now']:,} products in all; the full list is at the bottom.</p></div>"
                 "<div class='tablewrap'><table><thead><tr><th>Product</th><th class='num'>Sells</th><th class='num'>On hand</th><th>Status</th></tr></thead><tbody>")
        for k in R['reorder_top']:
            h.append(f"<tr><td>{esc(k['product'])}<div class='tag'>{esc(k['line'])}</div></td><td class='num'>{esc(k['per_week'])}</td><td class='num'>{k['on_hand']:,}</td><td>{esc(k['note'])}</td></tr>")
        h.append("</tbody></table></div></section>")
    def strain_line(x, n_=4):
        names = x['strain_names']; more_ = len(names) - n_
        return f"<p class='strains'><b>{x['strains']} strain{'s' if x['strains'] > 1 else ''}:</b> " + esc(', '.join(names[:n_])) + (f" and {more_} more" if more_ > 0 else '') + "</p>"
    if R['fix_top']:
        h.append(f"<section><div class='sec-head'><span class='eyebrow'>Fix</span><h2>Product lines to fix</h2><p>These lines should sell better than they do. Each has the likely cause and a 30-day plan. {c['Fix']:,} lines in all.</p></div><div class='cards'>")
        for f in R['fix_top']:
            steps = ''.join(f"<li>{esc(s)}</li>" for s in f['plan'])
            h.append(f"<article class='card f'><span class='pill'>{esc(f['reason'])}</span><h3>{esc(f['line'])}</h3><span class='tag'><b>{esc(f['per_week'])}</b> · {money(f['price'])} typical price</span>{strain_line(f)}<p class='why'>{esc(f['why'])}</p><ol class='plan'>{steps}</ol></article>")
        h.append("</div></section>")
    if R['cut_top']:
        h.append(f"<section><div class='sec-head'><span class='eyebrow'>Cut</span><h2>Product lines to cut, and what to replace them with</h2><p>Whole lines that are slow here and weak in your market. Replacements are product lines from brands you don't carry in that space, ranked by {sc} sales in Hoodie market data. {c['Cut']:,} lines in all, {money(R['cut_shelf'])} on the shelf.</p></div><div class='cards'>")
        for x in R['cut_top']:
            rp = ''
            if x['replacements']:
                lis = ''.join(f"<li><span>{esc(r['line'])}<span class='tag' style='display:flex;margin-top:2px'>Top strains: {esc(r['top'])}</span></span><span>{r['stores']} stores · ~{money(r['avg_price'])}</span></li>" for r in x['replacements'])
                rp = f"<div class='repl'><span class='eyebrow'>Replace with</span><ul>{lis}</ul></div>"
            h.append(f"<article class='card x'><h3>{esc(x['line'])}</h3><span class='tag'>{esc(x['category'])}</span>{strain_line(x)}<p class='why'>{esc(x['why'])}</p><p class='exit'>{esc(x['exit'])}</p>{rp}</article>")
        h.append("</div></section>")
    if R['rotate_top']:
        h.append(f"<section><div class='sec-head'><span class='eyebrow'>Rotate</span><h2>Strains to rotate inside good lines</h2><p>The line is earning its space; a few strains in it aren't. Swap them for strains of the same line that sell well in your {sc}. {R['rotate_strains']:,} strains in all.</p></div>"
                 "<div class='tablewrap'><table><thead><tr><th>Line</th><th>Slow strains</th><th>Try instead</th></tr></thead><tbody>")
        for r in R['rotate_top']:
            tr = esc(', '.join(r['try'])) if r['try'] else f"<span class='tag'>You already carry this line's {sc} best sellers. Ask the vendor what's new.</span>"
            h.append(f"<tr><td>{esc(r['line'])}<div class='tag'>{esc(r['line_rate'])}</div></td><td>{'<br>'.join(esc(s) for s in r['slow'][:4])}</td><td>{tr}</td></tr>")
        h.append("</tbody></table></div></section>")
    if R['edge_top']:
        h.append(f"<section><div class='sec-head'><span class='eyebrow'>Keep</span><h2>Store favorites</h2><p>Lines from small brands in your {sc} that sell strongly here. Keep them stocked; they're a reason to shop with you.</p></div>"
                 "<div class='tablewrap'><table><thead><tr><th>Line</th><th class='num'>Sells</th><th class='num'>Strains</th></tr></thead><tbody>")
        for k in R['edge_top']:
            h.append(f"<tr><td>{esc(k['line'])}<div class='tag'>{esc(k['category'])}</div></td><td class='num'>{esc(k['per_week'])}</td><td class='num'>{k['strains']}</td></tr>")
        h.append("</tbody></table></div></section>")
    if X.get('gaps'):
        h.append("<section><div class='sec-head'><span class='eyebrow'>Opportunities</span><h2>Gaps on your shelf</h2></div><ul class='gaps'>" + ''.join(f"<li>{esc(g)}</li>" for g in X['gaps']) + "</ul></section>")
    order = {'Cut': 0, 'Fix': 1, 'Rotate': 2, 'Keep': 3, 'Watch': 4}
    rows = sorted(R['all'], key=lambda r: (order[r['status']], -r['shelf_dollars']))
    data = json.dumps(rows).replace('</', '<\\/')
    static = getattr(a, 'static', False)
    chips = ''.join(f"<button class='chip' data-v='{v}' aria-pressed='{'true' if v == 'All' else 'false'}'>{v}</button>" for v in ('All', 'Keep', 'Fix', 'Cut', 'Rotate', 'Watch'))
    if static:   # email/PDF-safe: the full list is written out as plain rows, no controls and no script
        CLS = {'Keep': 'k', 'Fix': 'f', 'Cut': 'x', 'Watch': 'w', 'Rotate': 'r'}
        trs = ''.join(f"<tr><td>{esc(r['product'])}<div class='tag'>{esc(r['line'])}</div></td><td>{esc(r['cat'])}</td><td><span class='pill {CLS[r['status']]}'>{r['status']}</span></td>"
                      f"<td class='num'>{r['per_week']}/wk</td><td class='num'>{r['onhand']:,}</td><td class='num'>{'n/a' if r['days_left'] >= 9999 else r['days_left']}</td><td class='num'>{money(r['shelf_dollars'])}</td></tr>" for r in rows)
        h.append("<section><div class='sec-head'><span class='eyebrow'>Every product</span><h2>Full list</h2><p>Each product shows its line and what to do with it, cuts first. Products in a cut line are marked Cut.</p></div>"
                 "<div class='tablewrap'><table><thead><tr><th>Product</th><th>Category</th><th>Status</th><th class='num'>Sells</th><th class='num'>On hand</th><th class='num'>Days left</th><th class='num'>$ on shelf</th></tr></thead>"
                 f"<tbody>{trs}</tbody></table></div></section>")
    else:
        h.append("<section><div class='sec-head'><span class='eyebrow'>Every product</span><h2>Full list</h2><p>Each product shows its line and what to do with it. Products in a cut line are marked Cut.</p></div><div class='controls'>" + chips +
                 "<select id='cat' aria-label='Category'><option value=''>All categories</option></select>"
                 "<input id='q' type='search' placeholder='Search product or line' aria-label='Search'><span id='count' class='tag'></span></div>"
                 "<div class='tablewrap'><table><thead><tr><th>Product</th><th>Category</th><th>Status</th><th class='num'>Sells</th><th class='num'>On hand</th><th class='num'>Days left</th><th class='num'>$ on shelf</th></tr></thead><tbody id='rows'></tbody></table></div>"
                 "<button id='more' class='more' hidden>Show more</button></section>")
    rem = '; '.join(f"{v} {k}" for k, v in n.get('removed', {}).items() if v)
    foot = [f"{n.get('days') or 28} days of sales, {n.get('products', 0):,} products checked." + (f" Removed: {rem}." if rem else ''),
            "Products are grouped into lines by brand, series, form and size; strains are the products inside a line.",
            ("Shelf dollars use unit cost." if n.get('has_cost') else "No cost column, so shelf dollars use shelf price.")]
    if n.get('has_lost'): foot.append("Missed sales come from the export's lost-opportunity estimate.")
    if n.get('house_brands'): foot.append("House brands (" + ', '.join(b.title() for b in n['house_brands']) + ") are judged on this store's sales only.")
    if not n.get('first_sale_dates'): foot.append("The file has no first-sale dates. Products in stock for under about two weeks are treated as new, but check the cut list for anything that just arrived.")
    if n.get('thin_rate_rows'): foot.append(f"{n['thin_rate_rows']} products were out of stock for most of the period; their missed-sales estimate (about ${n.get('thin_rate_lost_dropped', 0):,}) is left out because it rests on only a few selling days.")
    if R.get('market_label'): foot.append(f"Market: {R['market_label']}. {sc.title()} figures are modelled estimates from Hoodie, used only to judge lines, compare category mix and pick replacements, never added to your sales.")
    if R.get('locations'):
        foot.append("Chain figures add the stores together. Reorder quantities are chain totals; split them using each store's own page or its share in the store table.")
        foot.append("Location flags compare each store with the other stores, scaled to store size: a store is flagged as driving a line when it sells at least twice the fastest other store's pace and over half the line's chain sales, and as lagging when it sells under 40% of the slowest other store's pace.")
    foot += X.get('notes', [])
    import datetime
    yr = datetime.date.today().year
    h.append("<footer><strong>How this was read</strong><ul>" + ''.join(f"<li>{esc(f)}</li>" for f in foot) + "</ul>"
             f"<div class='brandline'><span><b>Hoodie Analytics</b> · Hoodie integrates Retail POS, Wholesale, and storefront data from 12,000+ dispensaries.</span>"
             f"<span>Copyright ©{yr} Hoodie Analytics. Confidential and proprietary.</span></div></footer></div>")
    if static:
        # no script, no external links: Gmail and other mail scanners flag HTML attachments that carry JavaScript
        h = [x for x in h if 'fonts.googleapis.com' not in x and 'fonts.gstatic.com' not in x]
        h.insert(0, "<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>")
        h.append("<style>@media print{body{background:#fff}.wrap,section{display:block;max-width:none;padding:0}.wrap>*,section>*{margin-bottom:14px}.tablewrap{overflow:visible}.cards{display:block}.card{margin-bottom:10px}.card,.tile,tr,.hero,.sec-head{break-inside:avoid}h2{break-after:avoid}th{position:static}}</style></html>")
    else:
        h.append(f"<script type='application/json' id='data'>{data}</script><script>{JS}</script>")
    open(a.out, 'w').write('\n'.join(h))
    print('wrote', a.out, round(len(''.join(h)) / 1024), 'KB')

def to_pdf(a):
    """Print a --static page to a letter-size PDF (light theme), the safest format to attach to an email."""
    import os
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch(); p = b.new_page(color_scheme='light')
        p.goto('file://' + os.path.abspath(a.html)); p.wait_for_timeout(500)
        p.pdf(path=a.out, format='Letter', print_background=True, scale=0.8, margin={'top': '0.45in', 'bottom': '0.45in', 'left': '0.4in', 'right': '0.4in'})
        b.close()
    print('wrote', a.out, round(os.path.getsize(a.out) / 1024), 'KB')

if __name__ == '__main__':
    p = argparse.ArgumentParser(); sp = p.add_subparsers(dest='cmd', required=True)
    a1 = sp.add_parser('prep'); a1.add_argument('file'); a1.add_argument('--out', required=True); a1.add_argument('--days', type=int); a1.add_argument('--store'); a1.add_argument('--long-days', dest='long_days', type=int)
    a2 = sp.add_parser('score'); a2.add_argument('dir'); a2.add_argument('--market'); a2.add_argument('--market-space', dest='market_space'); a2.add_argument('--house')
    a3 = sp.add_parser('finalize'); a3.add_argument('dir'); a3.add_argument('--prices'); a3.add_argument('--repl')
    a3.add_argument('--title', required=True); a3.add_argument('--period', required=True); a3.add_argument('--market-label', dest='market_label', default=''); a3.add_argument('--scope', default='state', choices=['state', 'county'])
    a5 = sp.add_parser('add-repl'); a5.add_argument('dir'); a5.add_argument('--slot', required=True); a5.add_argument('--json', required=True)
    a6 = sp.add_parser('banner'); a6.add_argument('dirs', nargs='+'); a6.add_argument('--out', required=True); a6.add_argument('--name', required=True)
    a4 = sp.add_parser('render'); a4.add_argument('dir'); a4.add_argument('--extra'); a4.add_argument('--logo'); a4.add_argument('--out', required=True)
    a4.add_argument('--static', action='store_true', help='email-safe page: no JavaScript, no external links, full list as plain rows')
    a7 = sp.add_parser('pdf'); a7.add_argument('html'); a7.add_argument('--out', required=True)
    a = p.parse_args()
    {'prep': prep, 'score': score, 'finalize': finalize, 'render': render, 'add-repl': add_repl, 'banner': banner, 'pdf': to_pdf}[a.cmd](a)
```
<!-- ENGINE END -->