---
name: "weekly-brand-reorder"
description: "Build a weekly dispensary reorder grouped by brand from a POS or inventory export, rolling strain-specific items up to the product level, with a Hoodie-branded page and vendor CSV. Use for weekly reorders, POs by brand, or restock recommendations."
---

# Weekly Reorder by Brand

Turns a store-level inventory/sales export into three deliverables, each with one purchase order per brand and a separate line for each store:

1. **Excel workbook** with live formulas (Assumptions, Brand Summary, Item Rollup, Case Packs, Reorder Lines, Item Detail, plus one PO tab per brand).
2. **Hoodie-branded page** published as an artifact: order settings panel, totals (PO cost, weeks on hand, weekly retail sales and margin), PO cost by brand, filters, CSV download buttons, and three views: purchase orders by store, an item roll-up by brand (all stores combined) and a product type roll-up.
3. **Vendor CSV** ready to send to a brand: only Brand, Store, Product, Order Units and PO Cost ($), only lines with an order.

Strain-specific items are ordered at the product level (for example, "Flower - Premium Eighth 3.5g"), with a suggested strain split. Items that were out of stock for part of the sales time frame get their lost sales added back (what would have sold on the days they were out), so the order covers real demand and the stock-out doesn't repeat. Keep a line for each store; do not consolidate stores unless the user asks.

## Inputs (confirm at the start of every run)

Ask about weeks on hand, lead time and the velocity time frame before building anything. Case packs are never asked about in chat: every run uses 12 units for all brands, and the user sets case packs by brand on the published page's Order settings panel.

| Input | Default | Script flag |
|---|---|---|
| Target stock level (weeks of stock to keep on hand after delivery) | 3 weeks | `--weeks` |
| Lead time (days from placing the order to on the shelf) | 4 days | `--lead-days` |
| Sales time frame for velocity (which unit sales column to use) | Last 4 weeks | `--sales-weeks` (or `--sales-days` for day-based columns such as last 30 days) |
| Case pack | 12 units for every brand (not asked; set on the page) | `--case 12` |
| Subtract units already on order | Yes | `--no-on-order` to turn off |
| Add lost sales from stock-outs to velocity | Yes (not asked; toggle on the page) | `--no-lost-sales` to turn off |

- **Velocity time frame (always ask, before building):** the script finds every unit sales column with a time frame in its name (for example "Last 1 Week Unit Sales", "Last 4 Weeks Unit Sales", "Units Sold (8 Wks)", "L12W Units", "Last 30 Days Unit Sales"); dollar columns are ignored. Weekly velocity = units sold in the chosen column / its length in weeks. Before asking, check which time frames the export has. Ask this question on every run, even when the export has only one time frame. List the time frames in the export first (the 4-week one, or the longest if there's no 4-week column, marked "(Recommended)"). If the export has fewer than three, fill the remaining options with common time frames it doesn't have (for example last 8 or 12 weeks), labeled "(not in this export)". If the user picks a time frame the export doesn't have, don't build: tell them to add that unit sales column to the export and send it again. Never estimate a missing time frame. The time frame is fixed for the run: the page has no time frame selector, so a different time frame means rerunning the skill.
- **Case packs: don't ask.** Never put a case pack question in the prompt. Run with `--case 12` and no `--brand-case`, unless the user's own message explicitly gives brand case packs. The page's "Case pack by brand" grid is where the user sets them, and every order, total, strain split and CSV on the page updates when they do.
- **Lost sales: don't ask.** Always on unless the user says otherwise (then pass `--no-lost-sales`). The page's "Add lost sales from stock-outs" toggle switches it off and on for the viewer.
- If the user's message already gives weeks on hand, lead time or the velocity time frame, use those values and don't ask about them.
- Otherwise ask with AskUserQuestion in one call, before running any script: weeks on hand, lead time, and velocity time frame. For weeks on hand and lead time, put the default first marked "(Recommended)" plus one or two common alternatives (for example 2 or 4 weeks; 3 or 7 days). The user can type any other value.
- If the session is unattended (scheduled run, or nobody answers), use the defaults and say so at the top of the reply.
- State the settings used in the reply, and point the user to the page's Order settings panel for case packs by brand (and for trying other weeks on hand or lead times without rerunning; see "Page and vendor CSV").

## Defaults (use unless the user says otherwise)

- **Weeks of stock to keep on hand:** 3
- **Lead time:** 4 days (0.57 weeks)
- **Coverage window:** lead time + weeks on hand = 3.57 weeks
- **Sales time frame:** last 4 weeks (or the longest time frame in the export if it has no 4-week column)
- **Case pack:** 12 units for every brand in the run; changed by brand on the page
- **Units already on order:** subtracted from net needed, so open POs are not double-ordered. If the user wants on-order ignored, pass `--no-on-order`.
- **Lost sales from stock-outs:** added to velocity (see "Lost sales" below). If the user wants velocity from units sold only, pass `--no-lost-sales`.

## Purchasing logic

Per reorder line (brand + store + product):

1. Weekly velocity = (units sold in the chosen sales time frame + estimated lost units) / its length in weeks. Lost units are estimated per item (see "Lost sales" below) and summed to the line; with `--no-lost-sales` (or the page toggle off) velocity is units sold only.
2. Target stock = coverage weeks x weekly velocity, rounded up to a whole unit
3. Net needed = target stock - current stock - units on order
4. If net needed <= 0, order 0. Otherwise round net needed UP to the next multiple of that brand's case pack.
5. Current weeks on hand = current stock / weekly velocity. Future weeks on hand = (current stock + units on order when deducted + order units) / weekly velocity: the cover the store has once this order lands (before lead-time sales). Both are blank for lines with no sales; brand and page totals use only lines with sales.
6. Weekly retail sales = retail sales $ in the sales time frame / its length in weeks. Weekly margin $ = (retail sales $ - cost of goods $) / weeks. Margin % = margin $ / retail sales $. All three are sums across items, so a roll-up's margin % is weighted by sales.

## Lost sales (out-of-stock adjustment)

An item that was out of stock for part of the sales time frame could not sell on those days, so its units sold understate demand and a plain velocity would reorder too little and stock out again. The script estimates what would have sold and adds it to velocity.

- **Days out of stock**, per item, from the first source available:
  1. A days-out-of-stock column in the export (names containing "days out of stock", "days OOS", "OOS days", "out of stock days", "stockout days" or "days stocked out"). If its name carries a time frame (for example "Days Out of Stock (28 days)") and that differs from the velocity time frame, it is scaled as a share of that time frame. Without a time frame in the name it is taken to cover the velocity time frame.
  2. Otherwise, inferred for items out of stock now (on hand 0) that sold in the time frame: the longest shorter sales window in the export with zero sales is taken as time out of stock (for example 0 sold in the last 2 weeks of a 4-week window = 14 days out). Items in stock now, or exports with no shorter window, get 0.
- **Strain-mix lines:** strains on one product line rotate and substitute for each other (a buyer swaps one 3.5g strain for the next), so a line only loses sales on days every strain was out. For a strain-mix line, lost units are worked out once for the whole line from its lowest days out of stock across its strains, then spread back over the strains in proportion to each strain's own estimate. Without this, fast-rotating house strains (deli-style flower, for example) show huge false lost sales.
- **In-stock days** = window days minus days out of stock, floored at the larger of 7 days and 25% of the window, so a short selling spell can't inflate demand (at most 4x units sold).
- **Lost units** = units sold x (window days / in-stock days - 1). Items with no sales in the window get 0: there is no rate to project, so they surface through the Out of stock flag instead.
- **Demand velocity** = (units sold + lost units) / window weeks, which is units sold / in-stock weeks. It drives the target, net needed, order, strain split (strains that were out get their share), weeks on hand, flags and product type gaps. Weekly retail sales, margin and margin % stay actual sales.
- The script prints which source it used and how many lost units it found; say so in the reply, with how much the add-back adds to PO cost (the page toggle off gives the no-lost-sales total). Hoodie retail data gives a `daysOutOfStock` measure (trailing 28 days, per SKU at a store), so a Hoodie pull always uses source 1.
- Workbook: Assumptions B11 switch (1 = add lost sales; velocity in column I of Reorder Lines references it), "Days Out of Stock" (AB) and "Lost Units" (AC) on Reorder Lines, "Lost Units (est.)" on Brand Summary (M) and two columns on Item Detail.
- Page: an "Add lost sales from stock-outs" toggle in Order settings (prefilled from the run), a header chip, and "Includes N lost units from about D days out of stock" under each affected PO line (and "Includes N lost units from stock-outs" in the item roll-up). Turning the toggle off gives exactly the orders a no-lost-sales run would.

## Strain rule

An item is strain-specific when it is in Flower, Pre-Rolls, Vapes or Concentrates and its name starts with a strain name before the format words (for example, "Sour Diesel 3.5g" or "Runtz Live Resin Cart 1g").

- Items named "Format - Strain" (for example "Live Resin Cart - Strawnana" or "Shatter - OG Kush") are read the same way: the text after the last " - " is the strain and the text before it is the format.
- Multipacks named without a format word (for example "Mini Dogs 10pk") stay at the item level. When an item name has no size, the size comes from the Unit Size column.
- Strain-specific items roll up to one line per **brand + store + category + segment + size**. Units on hand, units on order and sales are summed across strains before running the logic above.
- Generic items stay at the item level. These include "Distillate Cartridge 1g", "Pre-Roll 1g", "Hybrid Flower 14g" and "Wax 1g".
- Edible flavors (Mango Gummies, Peach Gummies) are not strains and stay at the item level.
- **Suggested Strain Split** divides each product order across the strains that are short of target, in proportion to each strain's gap. It always adds up to the suggested order. This column is computed when the script runs; if the user changes assumptions in the workbook, rerun the script to refresh the split.
- **Strains Empty Before Delivery** lists strains with less stock than lead-time demand. A product-level roll-up can hide these, so always surface them.

## Product type gap flag

Flags an item that is out of stock or runs out before delivery when more than 50% of the active SKUs in its product type at that store are out or running out too, so the shopper finds that whole type missing. Product type = category + segment + unit size + price band (10-dollar shelf price bands) + concentrate type, across all brands, per store. Active = sold in the sales time frame or has stock (dead listings don't count). A store line is flagged when any of its items is; the text names the worst type, for example "5 of 7 Flower · Indica · 3.5g · [30 to 39.99 dollar band] SKUs out or running out".
- Workbook: "Product Type Gap" column (AA) on Reorder Lines, fixed at the run's lead time.
- Page: red "Product type gap" pill and note on PO lines; "N product type gaps" pill per item in the item roll-up (hover for stores); "Stores with type gap" column in the product type roll-up (and its CSV); an "Only product type gaps" filter. It recalculates when the lead time changes.
- Buyer callouts: list the product types with gaps (and how many stores) when there are any.

## Steps

1. Find the uploaded file (CSV or XLSX). Check that it has these columns or close aliases: Store Location, Item Name, Brand, Category, Units on Hand, and at least one unit sales column with a time frame (for example Last 4 Weeks Unit Sales). Segment, Units on Order, Wholesale Cost, Unit Size, Price (shelf price), Concentrate Type, and retail sales and cost of goods dollars for the velocity time frame (for example "Last 4 Weeks Retail Sales ($)" and "Last 4 Weeks COGS ($)") are optional but recommended. Without the dollar columns the script estimates retail sales as units sold x shelf price and cost of goods as units sold x wholesale cost (it prints which it used); say so in the reply. Without Unit Size it reads the size from the item name. If a required column is missing, tell the user which one and stop. A days-out-of-stock column is optional and feeds the lost sales estimate (see "Lost sales"). When the data comes from the Hoodie retail MCP instead of a file, pull per store and SKU: units on hand, unit sales and average unit cost; sales and cost dollars for the same windows; `daysOutOfStock` (write it as a "Days Out of Stock (28 days)" column); and unit of measure, concentrate type and average shelf price; then build this export from them. Skip SKUs with no SKU id (Hoodie groups samples there) and items named "- SAMPLE", and drop rows with no stock and no sales in the window. Pull in passes of at most 5 row groups: (1) dispensary, sku, brand, category, segment with on hand, units for each window, sales, cost, average unit cost and average price; (2) dispensary, sku, productPresentation, concentrateType, strain; (3) dispensary, sku with `daysOutOfStock`; join them on store + SKU id. Clean Hoodie product names for the strain rule: drop the brand prefix before the size and move the size to the end ("SINSE CANNABIS 1G LEMON CANE LIVE RESIN CART" becomes "Lemon Cane Live Resin Cart 1g"), title-case names and brands, strip "SWADE Dispensary - "-style banner prefixes from store names, blank segments ending in "(Unspecified)", and for Flower, Pre-Rolls, Vapes and Concentrates add the pack count to the segment ("Multipack 5pk") so 2pk, 5pk and 10pk stay separate products. Convert unit of measure to sizes like "3.5g" or "100mg" (blank for "each"). Large chains return over a megabyte per page: page with `pageSize` 1000 and parse the saved result files with Python rather than reading them into the conversation, and pace calls (about six per minute) to stay under the rate limit. Pages can be fetched in parallel by building a cursor that starts at each store: the cursor is base64url JSON with `after` (one key per row group), `indices` and `shape` copied from a real cursor of the same query; set `after` to the previous SKU (or an empty SKU for a store's start), then check every store's SKUs were covered and refetch any gaps.
2. Settle the inputs (see "Inputs" above): one AskUserQuestion call covering weeks on hand, lead time and velocity time frame. No case pack question.
3. Save the two scripts below to the scratchpad as `brand_reorder.py` and `build_page.py`.
4. Build the workbook:
   `python3 -I brand_reorder.py "<input>" <scratchpad>/Weekly_Reorder_by_Brand_<YYYY-MM-DD>.xlsx --weeks <weeks> --lead-days <days> --sales-weeks <weeks> --case 12 [--no-on-order] [--no-lost-sales]`
   It prints the sales time frames it found and the lost sales source and total; check that the velocity time frame matches what the user picked.
5. Recalculate it with the xlsx skill's `scripts/recalc.py` in the scratchpad (the outputs folder is a slow network mount where LibreOffice can time out) and confirm `total_errors` is 0, then copy it to `/mnt/user-data/outputs/`. The page script reads the recalculated values, so this must happen first.
6. Read the printed list of "non-strain items in strain categories". If any are actually strain names (or a strain was missed), add the format word to `FORMAT` or the generic word to `GENERIC` and rerun steps 4 and 5.
7. Build the page and vendor CSV:
   `python3 -I build_page.py <workbook.xlsx> <scratchpad>/weekly-reorder.html /mnt/user-data/outputs/Vendor_Order_<YYYY-MM-DD>.csv --client "<store group name>" --src "<input file name>" --week <YYYY-MM-DD>`
   It pulls `brand_background.png` and `logo_wordmark_white.png` from the `jesse-hoodie-brand-kit` skill's assets folder (falls back to a plain gradient and text wordmark if it can't find them) and refuses to write a page containing an em dash.
8. Publish the page with the Artifact tool and declare `capabilities: {"downloads": true}` so the CSV buttons work. Use icon `cart` on first publish. If the user already has a reorder page for this store group, update that artifact (same file path in this session, or its `url`) instead of creating a new one.
9. Send the vendor CSV with SendUserFile (`display: "attach"`).
10. Verify: every suggested order is a multiple of its brand's case pack, each strain split adds up to its order, the vendor CSV totals match the Brand Summary total, and the brand PO tabs' totals add up to the Brand Summary total. If Playwright is available, open a standalone copy of the page (wrapped in a doctype/html/body) and confirm a brand card's CSV button downloads that brand's order lines, that switching "Add lost sales from stock-outs" off and back on changes the PO cost tile (off must equal the order a `--no-lost-sales` run would give, when lost units were found) and that typing a new Order units value updates that line's cost, cases and future weeks on hand, the brand totals, the KPI tiles (including weeks on hand) and the downloaded CSV. Switch to the item roll-up and product type roll-up tabs: totals must match the PO view (same order units and PO cost), the edit must carry through, and both roll-up CSV buttons must download. In the item roll-up, type a new order units total for an item and confirm its store lines in the PO view add up to it and the item CSV has only Item, Order Units and PO Cost ($).
11. Reply with:
   - one sentence on the page, and that the vendor CSV is attached
   - a brand summary table (Brand, Units, PO Cost, Current Weeks on Hand, Future Weeks on Hand, Weekly Retail Sales, Margin %), sorted by PO cost
   - 2-3 buyer callouts: lines out of stock or running out before delivery (with the lost units added back and how much they add to PO cost, and the lines with the most lost units), open POs to review (on hand already at or above target with more on order), and overstock (more than 2x the coverage window on hand)
   - the assumptions used, in one line (including the lost sales source: a days-out-of-stock column or inferred from the sales windows), and that case packs by brand are set on the page's Order settings panel (all 12 in the workbook and attached CSV)
   - a reminder that the page is private until shared from its Share menu

## Page and vendor CSV

- **Brand:** Hoodie brand kit. Nunito for headings, Inter for body, Hoodie Blue `#1D3463`, Hoodie Green `#50BB80` (one highlight per chart: the top brand or the selected brand), brand background with the white reversed wordmark in the header, light and dark themes. No em dashes and no "menu" wording in any copy.
- **Layout:** header with the rules used as chips; KPI tiles (PO cost, weeks on hand, average weekly retail sales, "Average weekly margin dollars" and "Average weekly margin %", each subtitled with the sales time frame they come from, such as "last 4 weeks" and "last 4 weeks sales"; the weeks on hand tile shows current weeks on hand across lines with sales, with "N weeks after this order" underneath; units, stock-out risk and open POs are not tiles, they live in the PO cards, flags and buyer callouts); sticky filters (store, brand, category, search, "Only lines with an order", "Only product type gaps"); PO cost by brand bars (click a bar to filter to that brand); one PO card per brand with its own "Download [Brand] CSV" button in the card header, store-level lines with weekly retail sales, weekly margin, margin %, Current wks on hand, an editable Order units box and Future wks on hand (red when below the weeks of cover), strain split and "empty before delivery" notes under each product, and flag pills.
- **Views (tabs above the PO cards, remembered in the viewer's browser):** "Purchase orders by store" (the PO cards), "Item roll-up by brand (all stores)" and "Product type roll-up". All three follow the store, brand, category and search filters, the order settings and every Order units edit. Each item's share of a line's order comes from the strain split (or velocity, for lines without one), so roll-up totals always equal the PO view.
- **Item roll-up by brand:** one card per brand with one row per item (brand + category + product) combining every store's need: stores ordering, on hand, on order, weekly velocity, weekly retail sales, weekly margin, margin %, current weeks on hand, target, order units, future weeks on hand, cases, PO cost and the number of store lines at risk. Under each item: the store breakdown ("North Kansas City 120 · Kansas City 96 ...") and the combined strain split. "Only lines with an order" hides items nobody is ordering. **Order units are editable here too:** typing a new all-store total spreads it across that item's store lines (in proportion to each line's current order, or velocity when nothing is ordered; whole units, not forced to full cases), so it flows into the PO view, the KPI tiles, bars and every CSV, and is remembered with the other order edits. Edited items show "Suggested N" with a reset link. "Download item roll-up CSV" (filter bar of the tab) and "Download [Brand] CSV" (each brand card) save only lines with an order, with just three columns: Item, Order Units, PO Cost ($).
- **Product type roll-up:** SKUs grouped by any mix of Category, Segment, Brand, Unit size, Price (10-dollar shelf price bands) and Concentrate type ("-" where it doesn't apply), chosen with "Group by" checkboxes (all on by default). Columns: SKUs, stores, average shelf price, on hand, weekly velocity, weekly retail sales, weekly margin, margin %, current weeks on hand, order units, future weeks on hand, PO cost. Sorted by PO cost; the table shows the top 500 and "Download roll-up CSV" has every row.
- **Order settings panel:** inputs for weeks on hand, lead time (days), "Subtract units on order", "Add lost sales from stock-outs", and a **Case pack by brand** grid (one input per brand, plus "Set every brand to" with an "Apply to all brands" button). Brands whose case pack differs from the run are highlighted, and each PO line shows its case size next to the case count. All inputs are prefilled with the run's settings. There is no sales time frame control: velocity always uses the time frame chosen in the initial prompt, shown in the header chip and the panel note. Any change recalculates every order line, total, strain split, flag, chart and CSV on the page from the item-level data, shows a "Changed from this week's run" tag, and offers a reset button. The viewer's last settings are remembered in their browser for that week's page. The workbook and the attached vendor CSV keep the run's settings, so if the user wants new settings made official, rerun the skill with them.
- **Editable order units:** every PO line's Order units is an input box prefilled with the suggested order. Typing a new number (whole units, 0 or more; it does not have to be a full case) overrides the suggestion, and the line's PO cost (units x unit cost), future weeks on hand, cases (shown with decimals and amber when it isn't a full case), strain split, brand totals, KPI tiles, PO cost bars and every CSV recalculate. Edited lines are highlighted, show "Suggested N" with a reset link, and stay visible under "Only lines with an order" even at 0. Edits are remembered in the viewer's browser for that week's page and survive changes to the Order settings; "Clear order edits (n)" removes them and "Reset to this week's run" clears settings and edits. The workbook and attached vendor CSV keep the suggested orders.
- **Download CSV** (filter bar) saves the vendor CSV for the current filter, named `vendor-order-<date>-<brand>-<store>.csv`. **Download [Brand] CSV** in each PO card saves that brand's PO (respecting the store, category and search filters, so filtering to one store gives that store's PO for the brand); it is disabled for brands with nothing to order. **CSV of all brands** saves every order line. All of them only include lines with an order and only the vendor columns: Brand, Store, Product, Order Units, PO Cost ($).
- **Downloads work outside Claude too.** Inside Claude the page saves through the `downloads` capability; when that isn't available (for example a copy of the page saved and opened as an HTML file), it falls back to a normal browser download. Never disable the download buttons just because the capability is missing.
- If the user asks for different vendor columns, change `COLS` in the template's script (the page) and the `v = l[l.u > 0][...]` line (the attached CSV) so both stay identical.

## Workbook layout

- **Assumptions:** yellow input cells for lead time, weeks on hand, default case pack, the on-order switch and the lost sales switch (B11), plus the sales time frame used (fixed by the run, since the sheet only carries that sales column; rerun to change it). All order math references these cells.
- **Case Packs:** one row per brand with a yellow case pack cell (12 from the run). Reorder Lines looks each brand up here (column T), so editing a cell re-rounds that brand's orders. The page's case pack grid is the main place to set them.
- **Brand Summary:** one row per brand: lines to order, units, cases, PO cost, at-risk lines, open POs to review, current weeks on hand and future weeks on hand (both across the brand's lines with sales; the Total row is the same ratio across all brands), weekly retail sales, weekly margin, margin % and lost units.
- **Item Rollup:** one row per brand + category + product with every store's need combined (SUMIFS on Reorder Lines): stores ordering, on hand, on order, weekly velocity, target, order units, cases, PO cost, current and future weeks on hand, weekly retail sales, weekly margin, margin %.
- **Reorder Lines:** one row per brand + store + product, sorted by brand, with filters. The sales column is labeled with its time frame, column P is Current Weeks on Hand, column T is the brand's case pack, column U is Future Weeks on Hand (after the suggested order), V and W are retail sales and cost of goods dollars for the sales time frame (data), X to Z are weekly retail sales, weekly margin and margin % (formulas), AA is the product type gap, and AB and AC are days out of stock (sales-weighted average across the line's items) and lost units (data). Weekly Velocity (I) = (units sold + lost units when B11 = 1) / weeks. Blue text = data from the export; black = formulas. Flags are color-coded.
- **Brand PO tabs (one per brand, after Item Detail):** titled "Purchase order: [Brand]", with the brand's order lines (suggested order above 0 at run time): Store, Category, Product, Order Units, Case Pack, Cases, Unit Cost, PO Cost, Suggested Strain Split and Flag, plus a Total row. Every value links to Reorder Lines by formula, so a case pack edit on the Case Packs tab flows through; rerun the skill to add lines that only start ordering after an edit. Brands with nothing to order show "No order lines this week." Each brand name on Brand Summary links to its tab, and the tabs print landscape, one page wide. The tab totals add up to the Brand Summary total.
- **Item Detail:** one row per original item (brand, store, category, product, strain, item name, on hand, on order, wholesale cost, units sold for every sales time frame in the export, then segment, unit size, shelf price, concentrate type, retail sales $ and cost of goods $ for the run's time frame, days out of stock and lost units). The page reads this sheet, plus Case Packs, so it can recalculate orders when settings change.

## Script 1: brand_reorder.py

```python
"""Weekly reorder by brand.
Usage: python brand_reorder.py INPUT.csv|xlsx OUTPUT.xlsx [--weeks 3] [--lead-days 4] [--case 12]
       [--brand-case "Brand A=6;Brand B=24"] [--brand-case-file packs.csv] [--sales-weeks 4 | --sales-days 30] [--no-on-order] [--no-lost-sales]"""
import argparse, re, math
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.utils import get_column_letter as L

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--weeks', type=float, default=3)
ap.add_argument('--lead-days', type=float, default=4)
ap.add_argument('--case', type=int, default=12, help='default case pack for brands without their own')
ap.add_argument('--brand-case', default='', help='per-brand case packs: "Brand A=6;Brand B=24"')
ap.add_argument('--brand-case-file', default='', help='CSV with Brand and Case Pack columns')
ap.add_argument('--sales-weeks', type=float, default=None, help='sales window for velocity, in weeks (must exist in the export)')
ap.add_argument('--sales-days', type=float, default=None, help='sales window in days, for exports with day-based columns (e.g. 30)')
ap.add_argument('--no-on-order', action='store_true')
ap.add_argument('--no-lost-sales', action='store_true', help='do not add estimated lost sales from stock-outs to velocity')
a = ap.parse_args()

df = pd.read_excel(a.src) if a.src.lower().endswith(('xlsx', 'xls')) else pd.read_csv(a.src)
df.columns = [c.strip() for c in df.columns]
ALIASES = {'Store Location': ['Store', 'Location', 'Store Name'], 'Item Name': ['Product', 'Product Name', 'Item'],
           'Units on Hand': ['On Hand', 'Current Inventory', 'Qty On Hand'], 'Units on Order': ['On Order', 'Open PO Units'],
           'Wholesale Cost': ['Unit Cost', 'Cost'], 'Unit Size': ['Size', 'Unit of Measure', 'Product Size'],
           'Price': ['Shelf Price', 'Retail Price', 'Avg Price', 'Unit Price'], 'Concentrate Type': ['Extraction Type', 'Extract Type']}
OOS_NAMES = ['days out of stock', 'days oos', 'oos days', 'out of stock days', 'stockout days', 'stock-out days', 'days stocked out']
for std, alts in ALIASES.items():
    if std not in df.columns:
        for alt in alts:
            if alt in df.columns: df = df.rename(columns={alt: std}); break
need = ['Store Location', 'Item Name', 'Brand', 'Category', 'Units on Hand']
miss = [c for c in need if c not in df.columns]
if miss: raise SystemExit(f'Missing required columns: {miss}')

# ---- sales windows: every unit-sales column with a time frame in its name ----
def window_weeks(col):
    c = col.lower()
    if 'unit' not in c or any(x in c for x in ['$', 'dollar', 'revenue', 'margin', 'hand', 'order', 'stock', 'oos']): return None
    m = re.search(r'(\d+(?:\.\d+)?)\s*-?\s*(?:weeks?|wks?|w)\b', c) or re.search(r'\bl(\d+)w\b', c)
    if m: return float(m.group(1))
    m = re.search(r'(\d+)\s*-?\s*(?:days?|d)\b', c)
    return float(m.group(1)) / 7 if m else None
WINDOWS = {}
for col in df.columns:
    w = window_weeks(col)
    if w and w not in WINDOWS: WINDOWS[w] = col
if not WINDOWS: raise SystemExit('No unit sales column with a time frame found (for example "Last 4 Weeks Unit Sales").')
WINDOWS = dict(sorted(WINDOWS.items()))
wlabel = lambda w: f'{round(w*7)} days' if abs(w - round(w)) > 1e-9 else (f'{w:g} wk' if w == 1 else f'{w:g} wks')
SW = a.sales_days / 7 if a.sales_days else a.sales_weeks if a.sales_weeks is not None else (4.0 if 4.0 in WINDOWS else max(WINDOWS))
SW = next((w for w in WINDOWS if abs(w - SW) < 1e-3), SW)
if SW not in WINDOWS:
    raise SystemExit(f'No {SW:g}-week sales column in this export. Available: ' + ', '.join(f'{wlabel(w)} ({c})' for w, c in WINDOWS.items()))
SALES = WINDOWS[SW]
for c in WINDOWS.values(): df[c] = pd.to_numeric(df[c], errors='coerce').fillna(0)

# ---- retail sales and cost-of-goods dollars for the same time frame (optional; estimated when missing) ----
def frame(c):
    m = re.search(r'(\d+(?:\.\d+)?)\s*-?\s*(?:weeks?|wks?|w)\b', c) or re.search(r'\bl(\d+)w\b', c)
    if m: return float(m.group(1))
    m = re.search(r'(\d+)\s*-?\s*(?:days?|d)\b', c)
    return float(m.group(1)) / 7 if m else None
def money_col(kind):
    for col in df.columns:
        c = col.lower(); w = frame(c)
        if w is None or abs(w - SW) > 1e-3 or 'unit' in c: continue
        if kind == 'sales' and ('sales' in c or 'revenue' in c) and any(x in c for x in ['$', 'dollar', 'revenue', 'net', 'retail', 'gross']): return col
        if kind == 'cogs' and ('cogs' in c or 'cost of goods' in c or ('cost' in c and 'wholesale' not in c)): return col
    return None
RCOL, CCOL = money_col('sales'), money_col('cogs')
df['Retail $'] = pd.to_numeric(df[RCOL], errors='coerce').fillna(0) if RCOL else None
df['COGS $'] = pd.to_numeric(df[CCOL], errors='coerce').fillna(0) if CCOL else None

# ---- case packs: default plus per-brand overrides ----
BRAND_CASE = {}
if a.brand_case_file:
    cp = pd.read_csv(a.brand_case_file); cp.columns = [c.strip().lower() for c in cp.columns]
    for r in cp.itertuples(index=False): BRAND_CASE[str(r[0]).strip()] = int(r[1])
for part in [p for p in re.split(r'[;\n]', a.brand_case) if p.strip()]:
    name, _, val = part.rpartition('=')
    BRAND_CASE[name.strip()] = int(val)
unknown = sorted(set(BRAND_CASE) - set(df['Brand'].astype(str)))
if unknown: print('Case packs given for brands not in this export (ignored):', unknown)
case_for = lambda brand: BRAND_CASE.get(str(brand), a.case)
if 'Segment' not in df.columns: df['Segment'] = ''
if 'Units on Order' not in df.columns: df['Units on Order'] = 0
if 'Wholesale Cost' not in df.columns: df['Wholesale Cost'] = 0
df[['Segment']] = df[['Segment']].fillna('')
for c in ['Units on Hand', 'Units on Order', 'Wholesale Cost']:
    df[c] = pd.to_numeric(df[c], errors='coerce').fillna(0)

# ---- strain detection -------------------------------------------------------
STRAIN_CATS = {'flower', 'pre-rolls', 'pre-roll', 'prerolls', 'vapes', 'vape', 'concentrates', 'concentrate', 'cartridges'}
SIZE = re.compile(r'\b(\d+(?:\.\d+)?\s?(?:g|mg|ml|oz))\b', re.I)
# format words that describe the product, not the strain (longest first)
FORMAT = ['rosinfused prerolls', 'rosinfused preroll', 'smokos prerolls', 'swade smokes', 'pins prerolls', 'prerolls', 'pre rolls', 'pre-rolls', 'blunts', 'blunt', 'mini hash hole', 'hash hole', 'smokos', 'terp sugar', 'live sugar', 'live resin cartridge', 'live resin cart', 'distillate cartridge', 'distillate cart', 'rosin disposable',
          'disposable live rosin', 'live rosin', 'live resin', 'infused pre-roll', 'pre-roll', 'preroll', '5-pack', 'multi-pack',
          'multipack', 'cartridge', 'cart', 'disposable', 'badder', 'budder', 'shatter', 'wax', 'rosin', 'diamonds',
          'infused', 'value', 'smalls', 'shake', 'flower', 'vape', 'pod', 'distillate', 'ratio', 'pins']
GENERIC = {'', 'hybrid', 'indica', 'sativa', 'classic', 'house', 'blend', 'mixed', 'assorted', 'cbd:thc', 'cbd', 'thc', 'premium', 'moonrock', 'hash hole'}

def split_item(name, cat):
    """Return (strain or None, product descriptor)."""
    if str(cat).strip().lower() not in STRAIN_CATS: return None, name
    size = SIZE.search(name); size = size.group(1) if size else ''
    rest = SIZE.sub('', name).strip()
    low = rest.lower(); cut = len(low)
    for fw in FORMAT:  # strain = text before the first format word
        m = re.search(r'(?<![\w-])' + re.escape(fw) + r'(?![\w-])', low)
        if m: cut = min(cut, m.start())
    strain = rest[:cut].strip(' -')
    descriptor = (rest[cut:].strip() + ' ' + size).strip()
    if ' - ' in rest:  # "Format - Strain" naming (e.g. "Live Resin Cart - Strawnana")
        fmt_, strain = [x.strip() for x in rest.rsplit(' - ', 1)]
        descriptor = (fmt_ + ' ' + size).strip()
    if cut == len(low) and ' - ' not in rest and re.search(r'\b\d+\s?(?:pk|pack|ct)\b', low): return None, name  # multipack named without a format word (e.g. "Mini Dogs 10pk")
    if strain.lower() in GENERIC: return None, name
    return strain, descriptor

parts = df.apply(lambda r: split_item(r['Item Name'], r['Category']), axis=1)
df['Strain'] = [p[0] for p in parts]
df['Descriptor'] = [p[1] for p in parts]
df['Is Strain'] = df['Strain'].notna()

def product_name(r):
    if not r['Is Strain']:  # generic items in strain categories get their size from Unit Size when the name has none
        if str(r['Category']).strip().lower() in STRAIN_CATS and not SIZE.search(r['Item Name']) and 'Unit Size' in r and SIZE.search(str(r['Unit Size'])):
            return f"{r['Item Name']} {str(r['Unit Size']).strip()}"
        return r['Item Name']
    m = SIZE.search(r['Item Name']); size = m.group(1) if m else ''
    if not size and 'Unit Size' in r and SIZE.search(str(r['Unit Size'])): size = str(r['Unit Size']).strip()  # size from the Unit Size column when the name has none
    seg = r['Segment'] or r['Descriptor']
    if size and size.lower() in seg.lower(): size = ''
    if seg.lower().startswith(str(r['Category']).lower().rstrip('s')): return f"{seg} {size}".strip() + ' (strain mix)'
    return (f"{r['Category']} - {seg} {size}".strip() + ' (strain mix)')
df['Product'] = df.apply(product_name, axis=1)

# product-type attributes for the page's roll-up views (optional in the export)
if 'Unit Size' not in df.columns: df['Unit Size'] = [m.group(1).replace(' ', '').lower() if (m := SIZE.search(str(n))) else '' for n in df['Item Name']]
if 'Price' not in df.columns: df['Price'] = 0
if 'Concentrate Type' not in df.columns: df['Concentrate Type'] = ''
df['Price'] = pd.to_numeric(df['Price'], errors='coerce').fillna(0)
if not RCOL: df['Retail $'] = df[SALES] * df['Price']            # estimate: units sold x shelf price
if not CCOL: df['COGS $'] = df[SALES] * df['Wholesale Cost']     # estimate: units sold x wholesale cost
for c in ['Segment', 'Unit Size', 'Concentrate Type']: df[c] = df[c].fillna('').astype(str)

cov = a.lead_days / 7 + a.weeks
# ---- lost sales from stock-outs: what would have sold on the days an item was out of stock ----
# demand velocity = (units sold + lost units) / window weeks = units sold / in-stock weeks.
# Days out of stock come from a "Days Out of Stock" column (scaled to the velocity window when the column names another one);
# without that column they are inferred for items out of stock now: the longest shorter sales window with zero sales is taken as
# time spent out of stock. In-stock time is floored at max(7 days, 25% of the window) so a short selling spell can't explode demand.
OCOL = next((c for c in df.columns if any(k in c.lower() for k in OOS_NAMES)), None)
win_days = SW * 7
if OCOL:
    od = pd.to_numeric(df[OCOL], errors='coerce').fillna(0).clip(lower=0)
    ow = frame(OCOL.lower()); ow_days = ow * 7 if ow else win_days
    df['OOS Days'] = (od / ow_days).clip(upper=1) * win_days
    OOS_METHOD = f'from the "{OCOL}" column' + ('' if abs(ow_days - win_days) < 1e-6 else f' (scaled from {ow_days:g} to {win_days:g} days)')
else:
    shorter = [w for w in WINDOWS if w < SW - 1e-9]
    def infer(r):
        if r['Units on Hand'] > 0 or r[SALES] <= 0: return 0.0
        z = [w for w in shorter if r[WINDOWS[w]] <= 0]
        return max(z) * 7 if z else 0.0
    df['OOS Days'] = df.apply(infer, axis=1) if shorter else 0.0
    OOS_METHOD = ('inferred for items out of stock now from zero sales in the shorter sales windows (' + ', '.join(wlabel(w) for w in shorter) + ')') if shorter else 'not available (no days-out-of-stock column and no shorter sales window to infer from)'
min_in = max(7.0, 0.25 * win_days)
in_stock = (win_days - df['OOS Days']).clip(lower=min_in, upper=win_days)
df['Lost Units'] = (df[SALES] * (win_days / in_stock - 1)).where(df[SALES] > 0, 0).round(2)
# strain-mix lines: rotating strains substitute for each other, so a line only loses sales on days every strain was out.
# Line lost units use the line's minimum days out of stock across its strains, spread back over the strains in proportion to their own estimate.
gk = ['Brand', 'Store Location', 'Category', 'Product']
grp = df[df['Is Strain']].groupby(gk)
mult = grp.apply(lambda g: 1.0 if len(g) < 2 or g['Lost Units'].sum() <= 0 else
                 float((g[SALES].sum() * (win_days / min(max(win_days - g['OOS Days'].min(), min_in), win_days) - 1)) / g['Lost Units'].sum()), include_groups=False)
if len(mult):
    m = df[gk].merge(mult.rename('m').reset_index(), on=gk, how='left')['m'].fillna(1.0).values
    df['Lost Units'] = (df['Lost Units'] * m).round(2)
LS = 0 if a.no_lost_sales else 1
df['vel'] = (df[SALES] + LS * df['Lost Units']) / SW
df['lt_demand'] = df['vel'] * a.lead_days / 7
# product type gap: per store, the share of active SKUs in each product type (category + segment + unit size + price band + concentrate type,
# across brands) that are out of stock or run out before delivery; an at-risk item in a type over 50% is flagged
band = lambda pr: 'No price' if not pr > 0 else '$100+' if pr >= 100 else f'${int(pr // 10 * 10)} to ${int(pr // 10 * 10) + 9}.99'
active = (df['vel'] > 0) | (df['Units on Hand'] > 0)
df['tg_risk'] = active & ((df['Units on Hand'] <= 0) | (df['Units on Hand'] < df['lt_demand']))
dash = lambda c: df[c].where(df[c] != '', '-')
df['tg_key'] = list(zip(df['Store Location'], df['Category'], dash('Segment'), dash('Unit Size'), df['Price'].map(band), dash('Concentrate Type')))
tgc = df[active].groupby('tg_key')['tg_risk'].agg(['sum', 'count'])
df['tg_r'] = df['tg_key'].map(tgc['sum']).fillna(0).astype(int); df['tg_n'] = df['tg_key'].map(tgc['count']).fillna(0).astype(int)
df['tg_gap'] = df['tg_risk'] & (df['tg_n'] > 0) & (df['tg_r'] > df['tg_n'] * 0.5)

def agg(g, brand):
    case = case_for(brand)
    oo = 0 if a.no_on_order else g['Units on Order']
    gap = (g['vel'] * cov - g['Units on Hand'] - oo).clip(lower=0)
    low = g.assign(gap=gap)[g['Is Strain'] & (gap > 0)].sort_values('gap', ascending=False)
    # same math the sheet uses, so the split adds up to the suggested order
    net = math.ceil(g['vel'].sum() * cov - 1e-6) - g['Units on Hand'].sum() - (0 if a.no_on_order else g['Units on Order'].sum())
    order = 0 if net <= 0 else math.ceil(net / case) * case
    mix = ''
    if len(low) and order > 0:
        raw = low['gap'] / low['gap'].sum() * order
        alloc = raw.astype(int); rem = order - alloc.sum()
        for idx in (raw - alloc).sort_values(ascending=False).index[:rem]: alloc[idx] += 1
        mix = ', '.join(f"{s} {int(u)}" for s, u in zip(low['Strain'], alloc) if u > 0)
    elif len(low):
        mix = 'No order; rebalance or reorder only: ' + ', '.join(low['Strain'])
    oos = ', '.join(g.loc[g['Is Strain'] & (g['Units on Hand'] < g['lt_demand']), 'Strain'])
    gp = g[g['tg_gap']]
    if len(gp):
        top = gp.loc[(gp['tg_r'] / gp['tg_n']).idxmax()]
        tgap = f"{top['tg_r']} of {top['tg_n']} {' · '.join(v for v in top['tg_key'][1:] if v != '-')} SKUs out or running out"
    else: tgap = ''
    w = g[SALES].sum()
    cost = (g['Wholesale Cost'] * g[SALES]).sum() / w if w else g['Wholesale Cost'].mean()
    return pd.Series({'Strains': int(g['Is Strain'].sum()) if g['Is Strain'].any() else 0,
                      'On Hand': g['Units on Hand'].sum(), 'On Order': g['Units on Order'].sum(),
                      'Sales Units': g[SALES].sum(), 'Unit Cost': round(cost, 2),
                      'Suggested Strain Split (units)': mix, 'Strains Empty Before Delivery': oos,
                      'Retail $': g['Retail $'].sum(), 'COGS $': g['COGS $'].sum(), 'Type Gap': tgap,
                      'OOS Days': round((g['OOS Days'] * g[SALES]).sum() / w, 1) if w else round(g['OOS Days'].mean(), 1),
                      'Lost Units': round(g['Lost Units'].sum(), 2), 'Order': order})
lines = (df.groupby(['Brand', 'Store Location', 'Category', 'Product'], sort=True).apply(lambda g: agg(g, g.name[0]), include_groups=False).reset_index())

# ---- workbook ---------------------------------------------------------------
F = 'Arial'; f = Font(name=F, size=10); fb = Font(name=F, size=10, bold=True); fh = Font(name=F, size=10, bold=True, color='FFFFFF')
blue = Font(name=F, size=10, color='0000FF'); hdr = PatternFill('solid', fgColor='1F3A5F'); yel = PatternFill('solid', fgColor='FFFF00')
wb = Workbook(); s = wb.active; s.title = 'Assumptions'
rows = [('Weekly Reorder by Brand: Assumptions', None), (None, None), ('Input', 'Value'),
        ('Lead time (days)', a.lead_days), ('Lead time (weeks)', '=B4/7'), ('Weeks of stock to keep on hand', a.weeks),
        ('Default case pack (brands not set on the Case Packs tab)', a.case), ('Deduct units already on order? (1 = yes, 0 = no)', 0 if a.no_on_order else 1),
        ('Coverage window (weeks)', '=B5+B6'), (f'Sales window for velocity (weeks): {SALES}. Set by the run; rerun to change.', SW),
        ('Add lost sales from stock-outs to velocity? (1 = yes, 0 = no)', LS),
        (f'Lost sales: days out of stock {OOS_METHOD}. Lost units = units sold x (window days / in-stock days - 1), in-stock days floored at {min_in:g}. Velocity = (units sold + lost units) / window weeks when switched on.', None),
        ('Logic: Velocity = units sold in the sales window / its weeks. Target = ROUNDUP(coverage weeks x weekly velocity). Net = Target - On Hand - On Order. Order = 0 if Net <= 0, else Net rounded UP to that brand\'s case pack.', None),
        ('Strain-specific items (Flower, Pre-Rolls, Vapes, Concentrates named for a strain) are rolled up to one product line per brand + store + segment + size. "Suggested Strain Split" divides the order across the strains that are short of target, in proportion to each gap.', None),
        (f'Source: {a.src.split("/")[-1]}', None)]
for r in rows: s.append(r)
for row in s.iter_rows():
    for c in row: c.font = f
s['A1'].font = Font(name=F, size=14, bold=True)
for c in s[3]: c.font = fh; c.fill = hdr
for r in (4, 6, 7, 8, 11): s[f'B{r}'].font = blue; s[f'B{r}'].fill = yel
s['B5'].number_format = s['B9'].number_format = s['B10'].number_format = '0.00'
s.column_dimensions['A'].width = 55; s.column_dimensions['B'].width = 10
D = '$'  # absolute-reference marker; kept out of literals so skill arguments can't rewrite cell refs
CW, OO, LT, SWC, LSC = (f'Assumptions!{D}B{D}{r}' for r in (9, 8, 5, 10, 11))

# per-brand case packs (yellow inputs); Reorder Lines looks each brand up here
cps = wb.create_sheet('Case Packs')
cps.append(['Brand', 'Case Pack (units)'])
for c in cps[1]: c.font = fh; c.fill = hdr
brand_list = sorted(df['Brand'].astype(str).unique())
for br in brand_list: cps.append([br, case_for(br)])
for row in cps.iter_rows(min_row=2):
    row[0].font = f; row[1].font = blue; row[1].fill = yel
cps.column_dimensions['A'].width = 28; cps.column_dimensions['B'].width = 16
cps[f'A{len(brand_list)+3}'] = 'Edit a yellow cell to change that brand\'s case pack. Brands missing here use the default case pack on the Assumptions tab.'
cps[f'A{len(brand_list)+3}'].font = Font(name=F, size=9, italic=True)
CPR = f"'Case Packs'!{D}A{D}2:{D}A{D}{len(brand_list)+1}"; CPV = f"'Case Packs'!{D}B{D}2:{D}B{D}{len(brand_list)+1}"

p = wb.create_sheet('Reorder Lines')
H = ['Brand', 'Store', 'Category', 'Product', 'Strains', 'Current Stock', 'On Order', f'Units Sold ({wlabel(SW)})', 'Weekly Velocity', 'Target Stock',
     'Net Needed', 'Suggested Order (Units)', 'Suggested Order (Cases)', 'Unit Cost ($)', 'PO Cost ($)', 'Current Weeks on Hand', 'Flag',
     'Suggested Strain Split (units)', 'Strains Empty Before Delivery', 'Case Pack', 'Future Weeks on Hand',
     f'Retail Sales ($, {wlabel(SW)})', f'COGS ($, {wlabel(SW)})', 'Weekly Retail Sales ($)', 'Weekly Margin ($)', 'Margin %', 'Product Type Gap',
     f'Days Out of Stock ({wlabel(SW)}, est.)', f'Lost Units ({wlabel(SW)}, est.)']
p.append(H)
for c in p[1]: c.font = fh; c.fill = hdr; c.alignment = Alignment(wrap_text=True, vertical='center')
p.row_dimensions[1].height = 30
for i, r in enumerate(lines.itertuples(index=False), start=2):
    p.append([r.Brand, r[1], r.Category, r.Product, r.Strains or '', r[5], r[6], r[7], f'=(H{i}+IF({LSC}=1,AC{i},0))/{SWC}',
              f'=IF(I{i}=0,0,ROUNDUP({CW}*I{i}-0.000001,0))', f'=J{i}-F{i}-IF({OO}=1,G{i},0)',
              f'=IF(K{i}<=0,0,CEILING(K{i},T{i}))', f'=L{i}/T{i}', r[8], f'=L{i}*N{i}', f'=IF(I{i}=0,"",F{i}/I{i})',
              f'=IF(F{i}=0,"Out of stock now",IF(F{i}<I{i}*{LT},"Runs out before delivery",IF(AND(G{i}>0,F{i}>=J{i}),"Review open PO",IF(I{i}=0,"",IF(F{i}/I{i}>{CW}*2,"Overstock","")))))',
              r[9], r[10], f'=IFERROR(INDEX({CPV},MATCH(A{i},{CPR},0)),Assumptions!{D}B{D}7)',
              f'=IF(I{i}=0,"",(F{i}+IF({OO}=1,G{i},0)+L{i})/I{i})', round(r[11], 2), round(r[12], 2),
              f'=V{i}/{SWC}', f'=(V{i}-W{i})/{SWC}', f'=IF(V{i}=0,"",(V{i}-W{i})/V{i})', r[13], r[14] or None, r[15] or None])
    for c in p[i]: c.font = f
    for col in 'ABCDEFGHNVW': p[f'{col}{i}'].font = blue
    for col in ('AB', 'AC'): p[f'{col}{i}'].font = blue; p[f'{col}{i}'].number_format = '0.0;-0.0;-'
    for col in 'VWXY': p[f'{col}{i}'].number_format = '$#,##0;($#,##0);-'
    p[f'Z{i}'].number_format = '0.0%'
    p[f'I{i}'].number_format = '0.0'; p[f'N{i}'].number_format = '$#,##0.00'; p[f'O{i}'].number_format = '$#,##0;($#,##0);-'; p[f'P{i}'].number_format = p[f'U{i}'].number_format = '0.0'
    for col in 'FGHJKLM': p[f'{col}{i}'].number_format = '#,##0;(#,##0);-'
n = len(lines) + 1
for j, w in enumerate([18, 22, 12, 40, 7, 8, 8, 9, 8, 8, 8, 10, 10, 9, 10, 8, 22, 45, 30, 8, 9, 11, 11, 11, 11, 8, 48, 11, 11], 1): p.column_dimensions[L(j)].width = w
p.freeze_panes = 'E2'; p.auto_filter.ref = f'A1:AC{n}'
# product type gap is fixed at the run's lead time (rerun to refresh); the page recalculates it live
p.conditional_formatting.add(f'AA2:AA{n}', FormulaRule(formula=['LEN(AA2)>0'], fill=PatternFill('solid', fgColor='F8D7DA')))
p.conditional_formatting.add(f'Q2:Q{n}', FormulaRule(formula=['OR(Q2="Out of stock now",Q2="Runs out before delivery")'], fill=PatternFill('solid', fgColor='F8D7DA')))
p.conditional_formatting.add(f'Q2:Q{n}', FormulaRule(formula=['OR(Q2="Review open PO",Q2="Overstock")'], fill=PatternFill('solid', fgColor='FFE8CC')))
p.conditional_formatting.add(f'L2:M{n}', FormulaRule(formula=['$L2>0'], fill=PatternFill('solid', fgColor='D4EDDA'), font=Font(name=F, bold=True)))

b = wb.create_sheet('Brand Summary', 1)
b.append(['Brand', 'Lines to Order', 'Units', 'Cases', 'PO Cost ($)', 'Out of Stock / At Risk Lines', 'Open POs to Review', 'Current Weeks on Hand', 'Future Weeks on Hand',
          'Weekly Retail Sales ($)', 'Weekly Margin ($)', 'Margin %', 'Lost Units (est.)'])
for c in b[1]: c.font = fh; c.fill = hdr; c.alignment = Alignment(wrap_text=True)
R = "'Reorder Lines'!"
brands = sorted(lines['Brand'].unique())
for k, br in enumerate(brands, 2):
    rng = lambda col: f'{R}{D}{col}{D}2:{D}{col}{D}{n}'
    b.append([br, f'=COUNTIFS({rng("A")},A{k},{rng("L")},">0")', f'=SUMIFS({rng("L")},{rng("A")},A{k})', f'=SUMIFS({rng("M")},{rng("A")},A{k})',
              f'=SUMIFS({rng("O")},{rng("A")},A{k})',
              f'=COUNTIFS({rng("A")},A{k},{rng("Q")},"Out of stock now")+COUNTIFS({rng("A")},A{k},{rng("Q")},"Runs out before delivery")',
              f'=COUNTIFS({rng("A")},A{k},{rng("Q")},"Review open PO")',
              # weeks of cover across the brand's selling lines: now, and after this order (plus on order when deducted)
              f'=IFERROR(SUMIFS({rng("F")},{rng("A")},A{k},{rng("I")},">0")/SUMIFS({rng("I")},{rng("A")},A{k}),"")',
              f'=IFERROR((SUMIFS({rng("F")},{rng("A")},A{k},{rng("I")},">0")+{OO}*SUMIFS({rng("G")},{rng("A")},A{k},{rng("I")},">0")+SUMIFS({rng("L")},{rng("A")},A{k},{rng("I")},">0"))/SUMIFS({rng("I")},{rng("A")},A{k}),"")',
              f'=SUMIFS({rng("X")},{rng("A")},A{k})', f'=SUMIFS({rng("Y")},{rng("A")},A{k})', f'=IFERROR(K{k}/J{k},"")', f'=SUMIFS({rng("AC")},{rng("A")},A{k})'])
t = len(brands) + 2
b.append(['Total'] + [f'=SUM({L(j)}2:{L(j)}{t-1})' for j in range(2, 8)])
RL = lambda col: f'{R}{D}{col}{D}2:{D}{col}{D}{n}'
b[f'H{t}'] = f'=IFERROR(SUMIFS({RL("F")},{RL("I")},">0")/SUM({RL("I")}),"")'
b[f'I{t}'] = f'=IFERROR((SUMIFS({RL("F")},{RL("I")},">0")+{OO}*SUMIFS({RL("G")},{RL("I")},">0")+SUMIFS({RL("L")},{RL("I")},">0"))/SUM({RL("I")}),"")'
b[f'J{t}'] = f'=SUM(J2:J{t-1})'; b[f'K{t}'] = f'=SUM(K2:K{t-1})'; b[f'L{t}'] = f'=IFERROR(K{t}/J{t},"")'; b[f'M{t}'] = f'=SUM(M2:M{t-1})'
for row in b.iter_rows(min_row=2):
    for c in row: c.font = f; c.number_format = '#,##0'
    row[4].number_format = row[9].number_format = row[10].number_format = '$#,##0'; row[7].number_format = row[8].number_format = '0.0'; row[11].number_format = '0.0%'
for c in b[t]: c.font = fb; c.border = Border(top=Side(style='thin'))
for j, w in enumerate([24, 10, 10, 10, 12, 14, 12, 11, 11, 12, 12, 9, 11], 1): b.column_dimensions[L(j)].width = w
# item roll-up: every store's need for the same brand + product on one row
ir = wb.create_sheet('Item Rollup', 2)
ir.append(['Brand', 'Category', 'Product', 'Stores Ordering', 'On Hand', 'On Order', 'Weekly Velocity', 'Target Stock', 'Order Units', 'Cases',
           'PO Cost ($)', 'Current Weeks on Hand', 'Future Weeks on Hand', 'Weekly Retail Sales ($)', 'Weekly Margin ($)', 'Margin %'])
for c in ir[1]: c.font = fh; c.fill = hdr; c.alignment = Alignment(wrap_text=True, vertical='center')
keys = lines[['Brand', 'Category', 'Product']].drop_duplicates().values.tolist()
for k, (br, cat, prod) in enumerate(keys, 2):
    crit = f'{RL("A")},A{k},{RL("C")},B{k},{RL("D")},C{k}'
    ir.append([br, cat, prod, f'=COUNTIFS({crit},{RL("L")},">0")', f'=SUMIFS({RL("F")},{crit})', f'=SUMIFS({RL("G")},{crit})',
               f'=SUMIFS({RL("I")},{crit})', f'=SUMIFS({RL("J")},{crit})', f'=SUMIFS({RL("L")},{crit})', f'=SUMIFS({RL("M")},{crit})',
               f'=SUMIFS({RL("O")},{crit})', f'=IFERROR(SUMIFS({RL("F")},{crit},{RL("I")},">0")/G{k},"")',
               f'=IFERROR((SUMIFS({RL("F")},{crit},{RL("I")},">0")+{OO}*SUMIFS({RL("G")},{crit},{RL("I")},">0")+I{k})/G{k},"")',
               f'=SUMIFS({RL("X")},{crit})', f'=SUMIFS({RL("Y")},{crit})', f'=IFERROR(O{k}/N{k},"")'])
for row in ir.iter_rows(min_row=2):
    for c in row: c.font = f
    for c in row[3:10]: c.number_format = '#,##0;(#,##0);-'
    row[6].number_format = '0.0'; row[10].number_format = row[13].number_format = row[14].number_format = '$#,##0;($#,##0);-'; row[11].number_format = row[12].number_format = '0.0'; row[15].number_format = '0.0%'
for j, w in enumerate([22, 12, 40, 9, 9, 9, 9, 9, 9, 9, 11, 10, 10, 11, 11, 8], 1): ir.column_dimensions[L(j)].width = w
ir.freeze_panes = 'D2'; ir.auto_filter.ref = f'A1:P{len(keys)+1}'
# item-level detail: feeds the page's live recalculation and lets buyers see every strain
d = wb.create_sheet('Item Detail')
DH = ['Brand', 'Store', 'Category', 'Product', 'Strain', 'Item Name', 'Units on Hand', 'Units on Order', 'Wholesale Cost ($)'] + [f'Units Sold (last {wlabel(w)})' for w in WINDOWS] + ['Segment', 'Unit Size', 'Shelf Price ($)', 'Concentrate Type', 'Retail Sales ($)', 'COGS ($)', 'Days Out of Stock (est.)', 'Lost Units (est.)']
d.append(DH)
for c in d[1]: c.font = fh; c.fill = hdr; c.alignment = Alignment(wrap_text=True, vertical='center')
det = df.sort_values(['Brand', 'Store Location', 'Category', 'Product'], kind='stable')
for r in det.itertuples(index=False):
    row = [getattr(r, 'Brand'), r[df.columns.get_loc('Store Location')], r.Category, r.Product, r.Strain or '', r[df.columns.get_loc('Item Name')],
           r[df.columns.get_loc('Units on Hand')], r[df.columns.get_loc('Units on Order')], r[df.columns.get_loc('Wholesale Cost')]] + [r[df.columns.get_loc(c)] for c in WINDOWS.values()] + [r[df.columns.get_loc(c)] for c in ('Segment', 'Unit Size', 'Price', 'Concentrate Type')] + [round(r[df.columns.get_loc('Retail $')], 2), round(r[df.columns.get_loc('COGS $')], 2), round(r[df.columns.get_loc('OOS Days')], 1), r[df.columns.get_loc('Lost Units')]]
    d.append(row)
for row in d.iter_rows(min_row=2):
    for c in row: c.font = blue
    row[8].number_format = row[11 + len(WINDOWS)].number_format = row[13 + len(WINDOWS)].number_format = row[14 + len(WINDOWS)].number_format = '$#,##0.00'
for j, w in enumerate([18, 22, 12, 40, 18, 34, 9, 9, 10] + [11] * len(WINDOWS) + [16, 9, 9, 16, 11, 11, 10, 10], 1): d.column_dimensions[L(j)].width = w
d.freeze_panes = 'A2'; d.auto_filter.ref = f'A1:{L(len(DH))}{len(det)+1}'
# one PO tab per brand: that brand's order lines (suggested order > 0 at run time), linked to Reorder Lines so case pack edits flow through
used = set(wb.sheetnames); tab_of = {}
for br in brands:
    nm = re.sub(r'[\[\]:*?/\\]', '', str(br))[:28].strip() or 'Brand'
    base, k2 = nm, 2
    while nm in used: nm = f'{base[:26]} {k2}'; k2 += 1
    used.add(nm); tab_of[br] = nm
    ws = wb.create_sheet(nm)
    ws['A1'] = f'Purchase order: {br}'; ws['A1'].font = Font(name=F, size=14, bold=True)
    ws['A2'] = (f'Week of {pd.Timestamp.today():%b %d, %Y}. Order covers {a.weeks:g} weeks on hand + {a.lead_days:g}-day lead time; '
                f'velocity from {wlabel(SW)} of sales. Quantities link to Reorder Lines, so case pack edits on the Case Packs tab flow through.')
    ws['A2'].font = Font(name=F, size=9, italic=True)
    ws.append([]); ws.append(['Store', 'Category', 'Product', 'Order Units', 'Case Pack', 'Cases', 'Unit Cost ($)', 'PO Cost ($)', 'Suggested Strain Split (units)', 'Flag'])
    for c in ws[4]: c.font = fh; c.fill = hdr; c.alignment = Alignment(wrap_text=True, vertical='center')
    rows_ = [i for i, r in enumerate(lines.itertuples(index=False), start=2) if r.Brand == br and r.Order > 0]
    k = 5
    for i in rows_:
        ws.append([f'={R}B{i}', f'={R}C{i}', f'={R}D{i}', f'={R}L{i}', f'={R}T{i}', f'={R}M{i}', f'={R}N{i}', f'={R}O{i}',
                   f'=IF({R}R{i}="","",{R}R{i})', f'=IF({R}Q{i}="","",{R}Q{i})'])
        for c in ws[k]: c.font = Font(name=F, size=10, color='008000')
        ws[f'G{k}'].number_format = '$#,##0.00'; ws[f'H{k}'].number_format = '$#,##0.00'; ws[f'F{k}'].number_format = '0.##'
        k += 1
    if not rows_:
        ws.append(['No order lines this week.']); ws[f'A{k}'].font = Font(name=F, size=10, italic=True); k += 1
    ws.append(['Total', None, None, f'=SUM(D5:D{k-1})', None, f'=SUM(F5:F{k-1})', None, f'=SUM(H5:H{k-1})'])
    for c in ws[k]: c.font = fb; c.border = Border(top=Side(style='thin'))
    ws[f'H{k}'].number_format = '$#,##0.00'; ws[f'F{k}'].number_format = '0.##'
    for j, w in enumerate([22, 12, 42, 10, 9, 8, 10, 12, 45, 22], 1): ws.column_dimensions[L(j)].width = w
    ws.freeze_panes = 'A5'
    ws.page_setup.orientation = 'landscape'; ws.sheet_properties.pageSetUpPr.fitToPage = True; ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0
# Brand Summary: each brand name links to its PO tab
for k, br in enumerate(brands, 2):
    c = b[f'A{k}']; c.hyperlink = f"#'{tab_of[br]}'!A1"; c.font = Font(name=F, size=10, color='0563C1', underline='single')
wb.save(a.out)
print(f'{len(df)} item rows -> {len(lines)} reorder lines across {len(brands)} brands; strain-specific items: {int(df["Is Strain"].sum())}')
print(f'Velocity from "{SALES}" ({wlabel(SW)}). Sales windows in this export: ' + ', '.join(wlabel(w) for w in WINDOWS))
print(f'Retail sales $: {RCOL or "estimated as units x shelf price"}; cost of goods $: {CCOL or "estimated as units x wholesale cost"}')
print(f'Lost sales: {"added to velocity" if LS else "not added (--no-lost-sales)"}; days out of stock {OOS_METHOD}. '
      f'{int((df["Lost Units"] > 0).sum())} items with lost sales, {df["Lost Units"].sum():,.0f} lost units in the window.')
print('Case packs:', {b: case_for(b) for b in brand_list if case_for(b) != a.case} or f'all brands {a.case}', f'(default {a.case})')
print('Non-strain items in strain categories (check these):', sorted(set(df.loc[~df['Is Strain'] & df['Category'].str.lower().isin(STRAIN_CATS), 'Item Name'])))
```

## Script 2: build_page.py

```python
"""Hoodie-branded reorder page + vendor CSV from a recalculated reorder workbook.
Usage: python build_page.py REORDER.xlsx PAGE.html VENDOR.csv --client "Denver Dispensary" --src "Denver Dispensary.csv" --week 2026-10-14"""
import argparse, base64, glob, io, json, math, re, datetime as dt
import pandas as pd
from openpyxl import load_workbook

TEMPLATE = r'''<title>__TITLE__</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Nunito:wght@700;800;900&display=swap">
<style>
/* Layout: brand hero band, KPI strip, sticky filter bar, brand spend bars, then one PO card per brand with store-level lines */
:root{
  --navy:#1D3463; --green:#50BB80; --dkgreen:#215734; --dknavy:#1A406D;
  --bg:#F5F6F8; --surface:#FFFFFF; --fg:#1A1A1A; --muted:#555555; --line:#DCE1E8; --soft:#D6E4F7; --head:#1D3463;
  --bar:#1D3463; --bartrack:#E8EDF4;
  --crit-bg:#FBE3E4; --crit-fg:#9B1C24; --warn-bg:#FFF1CC; --warn-fg:#7A5300; --ok-bg:#DFF3E8; --ok-fg:#1E6B43;
  --display:"Nunito",Arial,sans-serif; --body:"Inter",Helvetica,Arial,sans-serif;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#0F1B33; --surface:#16264A; --fg:#EEF2F8; --muted:#A9B5CB; --line:#2A3D66; --soft:#22365F; --head:#FFFFFF;
  --bar:#8FA6D6; --bartrack:#22365F;
  --crit-bg:#4A1D24; --crit-fg:#FFB3B8; --warn-bg:#4A3A12; --warn-fg:#FFD77A; --ok-bg:#163F2C; --ok-fg:#8EE0B5; color-scheme:dark}}
:root[data-theme="dark"]{
  --bg:#0F1B33; --surface:#16264A; --fg:#EEF2F8; --muted:#A9B5CB; --line:#2A3D66; --soft:#22365F; --head:#FFFFFF;
  --bar:#8FA6D6; --bartrack:#22365F;
  --crit-bg:#4A1D24; --crit-fg:#FFB3B8; --warn-bg:#4A3A12; --warn-fg:#FFD77A; --ok-bg:#163F2C; --ok-fg:#8EE0B5; color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--fg);font-family:var(--body);font-size:14px;line-height:1.5}
.wrap{max-width:1180px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.hero{background:linear-gradient(120deg,rgba(33,87,52,.88),rgba(26,64,109,.9)),url(data:image/jpeg;base64,__BG__) center 30%/cover no-repeat,var(--dknavy);color:#fff}
.hero .wrap{padding-block:28px 32px;display:grid;gap:14px}
.hero img{width:180px;height:auto}
.eyebrow{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#CFEFDD}
h1{font-family:var(--display);font-weight:900;font-size:clamp(28px,4.4vw,44px);line-height:1.1;margin:0;text-wrap:balance}
.lede{max-width:66ch;margin:0;color:#E6ECF5;font-size:15px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:4px 12px;font-size:12.5px;color:#fff;background:rgba(255,255,255,.08)}
.kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-top:-22px;position:relative}
.kpi{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px 16px;min-width:0}
.kpi .k{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600}
.kpi .v{font-family:var(--display);font-weight:800;font-size:28px;color:var(--head);font-variant-numeric:tabular-nums;line-height:1.2}
.kpi .s{font-size:12px;color:var(--muted)}
.kpi.alert .v{color:var(--crit-fg)}
.bar-sticky{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--bg);border-bottom:1px solid var(--line);margin-top:18px}
.controls{display:flex;flex-wrap:wrap;gap:10px;align-items:end;padding-block:12px}
.controls label{display:grid;gap:3px;font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
select,input[type=search]{font:inherit;font-size:14px;text-transform:none;letter-spacing:0;color:var(--fg);background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:7px 10px;min-width:0}
input[type=search]{width:200px}
.toggle{display:flex!important;grid-auto-flow:column;align-items:center;gap:8px;text-transform:none!important;letter-spacing:0!important;font-size:14px!important;font-weight:500!important;color:var(--fg)!important;padding-bottom:7px}
.toggle input{accent-color:var(--green);width:16px;height:16px}
.spacer{flex:1}
.btn{font:inherit;font-weight:700;font-family:var(--display);font-size:14px;border-radius:8px;padding:8px 16px;cursor:pointer;border:1px solid var(--navy);background:var(--navy);color:#fff}
.btn.ghost{background:transparent;color:var(--head);border-color:var(--line)}
.btn:focus-visible,select:focus-visible,input:focus-visible,.brow:focus-visible{outline:2px solid var(--green);outline-offset:2px}
.btn[disabled]{opacity:.5;cursor:default}
.note{font-size:12.5px;color:var(--muted)}
h2{font-family:var(--display);font-weight:800;font-size:22px;color:var(--head);margin:0}
section{margin-top:28px}
.sec-head{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:baseline;justify-content:space-between;margin-bottom:10px}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:16px}
.brows{display:grid;gap:4px}
.brow{display:grid;grid-template-columns:170px minmax(0,1fr) 92px 70px;gap:12px;align-items:center;padding:5px 6px;border-radius:6px;cursor:pointer;background:none;border:0;font:inherit;color:inherit;text-align:left;width:100%}
.brow:hover{background:var(--bartrack)}
.brow.sel{background:var(--soft)}
.brow .nm{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.track{height:14px;background:var(--bartrack);border-radius:3px;overflow:hidden}
.track,.fill{display:block}
.fill{height:100%;background:var(--bar);border-radius:3px}
.brow.top .fill,.brow.sel .fill{background:var(--green)}
.num{text-align:right;font-variant-numeric:tabular-nums}
.brow .u{color:var(--muted);font-size:12.5px}
.po{background:var(--surface);border:1px solid var(--line);border-radius:10px;margin-top:16px;overflow:hidden}
.po-head{display:flex;flex-wrap:wrap;gap:6px 20px;align-items:baseline;padding:14px 16px;border-bottom:1px solid var(--line)}
.po-head h3{font-family:var(--display);font-weight:800;font-size:19px;margin:0;color:var(--head)}
.po-head .t{font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}
.po-head .t b{color:var(--fg);font-weight:600}
.po-head .po-dl{margin-left:auto;padding:5px 12px;font-size:13px}
.tbl{overflow-x:auto}
table{border-collapse:collapse;width:100%;min-width:1040px;font-size:13px}
th{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:600;text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);white-space:nowrap;background:var(--surface)}
td{padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
tr:last-child td{border-bottom:0}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
tr.store-first td{border-top:2px solid var(--line)}
td.store{font-weight:600;white-space:nowrap}
td.prod{min-width:300px;max-width:420px}
.dl{display:flex;gap:8px;flex-wrap:nowrap}
tr.zero td{color:var(--muted)}
td.ord{font-weight:700;color:var(--head)}
.ou{width:80px;font:inherit;font-weight:700;color:var(--head);text-align:right;background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:3px 6px;font-variant-numeric:tabular-nums}
.ou:focus-visible{outline:2px solid var(--green);outline-offset:1px}
.ou.edited{border-color:var(--green);background:var(--ok-bg)}
.sug{display:block;font-size:11px;color:var(--muted);font-weight:500;white-space:nowrap;margin-top:2px}
.sug button{font:inherit;color:var(--head);background:none;border:0;padding:0;text-decoration:underline;cursor:pointer}
td.part{color:var(--warn-fg)}
td.fw{font-weight:600;color:var(--head)}
td.fw.low{color:var(--crit-fg)}
.tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;border-bottom:1px solid var(--line)}
.tab{font:inherit;font-family:var(--display);font-weight:700;font-size:14px;color:var(--muted);background:none;border:0;border-bottom:3px solid transparent;padding:8px 12px;cursor:pointer}
.tab[aria-selected="true"]{color:var(--head);border-bottom-color:var(--green)}
.tab:focus-visible{outline:2px solid var(--green);outline-offset:2px}
.dims{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;margin-bottom:10px}
#types table{min-width:1100px}
#types td{white-space:nowrap}
.pname{font-weight:500}
.mix{font-size:12px;color:var(--muted);margin-top:2px}
.mix.tgap{color:var(--crit-fg);font-weight:600}
.pill{display:inline-block;font-size:11.5px;font-weight:600;border-radius:999px;padding:2px 9px;white-space:nowrap}
.p-crit{background:var(--crit-bg);color:var(--crit-fg)}
.p-warn{background:var(--warn-bg);color:var(--warn-fg)}
.tag{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ok-fg);background:var(--ok-bg);border-radius:4px;padding:1px 6px;margin-left:6px;vertical-align:1px}
.empty{padding:24px;text-align:center;color:var(--muted)}
.settings{margin-top:18px;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px 16px;display:flex;flex-wrap:wrap;gap:12px 18px;align-items:end}
.settings h2{font-size:17px;flex-basis:100%}
.settings label{display:grid;gap:3px;font-size:11.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.settings input[type=number]{font:inherit;font-size:15px;font-weight:600;color:var(--fg);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:7px 10px;width:110px;font-variant-numeric:tabular-nums}
.settings input[type=number]:focus-visible{outline:2px solid var(--green);outline-offset:2px}
.settings .cov{font-size:13px;color:var(--muted);padding-bottom:9px}
.settings .cov b{color:var(--head);font-family:var(--display);font-size:16px}
.settings .changed{color:var(--warn-fg);background:var(--warn-bg);border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600}
.settings .hint{flex-basis:100%;font-size:12.5px;color:var(--muted);margin:0}
.cases{flex-basis:100%;border-top:1px solid var(--line);padding-top:12px;display:grid;gap:10px}
.cases-head{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:end}
.cases-head h3{font-family:var(--display);font-weight:800;font-size:15px;color:var(--head);margin:0;flex-basis:100%}
.cases-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px 14px}
.cases-grid label{display:flex!important;align-items:center;justify-content:space-between;gap:10px;text-transform:none!important;letter-spacing:0!important;font-size:13.5px!important;font-weight:500!important;color:var(--fg)!important;padding:3px 0;border-bottom:1px dashed var(--line)}
.cases-grid label span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cases-grid input[type=number]{width:76px!important;padding:4px 8px!important;font-size:14px!important}
.cases-grid label.diff span{color:var(--head);font-weight:700}
footer{margin-top:36px;border-top:1px solid var(--line)}
footer .wrap{padding-block:18px 32px;font-size:12px;color:var(--muted);display:grid;gap:6px}
.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom,0px));background:var(--navy);color:#fff;padding:9px 16px;border-radius:8px;font-size:13px}
@media (max-width:900px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.kpi:first-child{grid-column:1/-1}}
@media (max-width:600px){.brow{grid-template-columns:110px minmax(0,1fr) 78px}.brow .u{display:none}input[type=search]{width:100%}.controls label{flex:1 1 140px}}
@media (prefers-reduced-motion:no-preference){.fill{transition:width .25s ease}}
</style>

<header class="hero">
  <div class="wrap">
    <img src="data:image/png;base64,__LOGO__" alt="Hoodie Analytics">
    <div class="eyebrow">Weekly reorder · __CLIENT__ · __NSTORES__ stores · Week of __WEEK__</div>
    <h1>Weekly reorder by brand</h1>
    <p class="lede">One purchase order per brand, with a line for each store. Strain items are ordered at the product level, with a suggested strain split for the brand rep.</p>
    <div class="chips">
      <span class="chip" id="chipCov"></span>
      <span class="chip" id="chipCase"></span>
      <span class="chip" id="chipOO"></span>
      <span class="chip" id="chipVel"></span>
      <span class="chip" id="chipLS"></span>
    </div>
  </div>
</header>

<main>
  <div class="wrap">
    <div class="kpis" id="kpis"></div>
    <form class="settings" id="settings" autocomplete="off">
      <h2>Order settings</h2>
      <label for="sWeeks">Weeks on hand<input id="sWeeks" type="number" min="0" max="26" step="0.5" inputmode="decimal"></label>
      <label for="sLead">Lead time (days)<input id="sLead" type="number" min="0" max="60" step="1" inputmode="numeric"></label>
      <label class="toggle" for="sOO"><input id="sOO" type="checkbox"> Subtract units on order</label>
      <label class="toggle" for="sLS"><input id="sLS" type="checkbox"> Add lost sales from stock-outs</label>
      <span class="cov" id="covNote"></span>
      <span class="changed" id="changed" hidden>Changed from this week's run</span>
      <button class="btn ghost" id="sReset" type="button">Reset to this week's run</button>
      <button class="btn ghost" id="eReset" type="button" hidden>Clear order edits</button>
      <div class="cases">
        <div class="cases-head">
          <h3>Case pack by brand</h3>
          <label for="sAll">Set every brand to<input id="sAll" type="number" min="1" max="500" step="1" inputmode="numeric" value="__CASE__"></label>
          <button class="btn ghost" id="sAllBtn" type="button">Apply to all brands</button>
        </div>
        <div class="cases-grid" id="casesGrid"></div>
      </div>
      <p class="hint">Changes recalculate every order, total, strain split, flag and CSV on this page. Velocity uses the last __SWLABEL__ of sales, set when the reorder was run. Order units can be typed over in any PO line; PO cost, cases, strain split, totals and CSVs follow the edit, and edits stay in place when you change these settings. The Excel workbook keeps the run settings and suggested orders.</p>
    </form>
  </div>

  <div class="bar-sticky">
    <div class="wrap controls">
      <label for="fStore">Store<select id="fStore"></select></label>
      <label for="fBrand">Brand<select id="fBrand"></select></label>
      <label for="fCat">Category<select id="fCat"></select></label>
      <label for="fQ">Search<input id="fQ" type="search" placeholder="Product or strain"></label>
      <label class="toggle" for="fOrd"><input id="fOrd" type="checkbox" checked> Only lines with an order</label>
      <label class="toggle" for="fTg"><input id="fTg" type="checkbox"> Only product type gaps</label>
      <span class="spacer"></span>
      <div class="dl"><button class="btn" id="dlView" type="button">Download CSV</button>
      <button class="btn ghost" id="dlAll" type="button">CSV of all brands</button></div>
    </div>
  </div>

  <div class="wrap">
    <section>
      <div class="sec-head"><h2>PO cost by brand</h2><span class="note">Click a brand to see its purchase order. Wholesale cost.</span></div>
      <div class="panel"><div class="brows" id="brows"></div></div>
    </section>
    <section>
      <div class="tabs" role="tablist" aria-label="View">
        <button type="button" role="tab" class="tab" data-v="po">Purchase orders by store</button>
        <button type="button" role="tab" class="tab" data-v="items">Item roll-up by brand (all stores)</button>
        <button type="button" role="tab" class="tab" data-v="types">Product type roll-up</button>
      </div>
      <div id="vPO">
        <div class="sec-head"><h2>Purchase orders</h2><span class="note" id="viewNote"></span></div>
        <div id="pos"></div>
      </div>
      <div id="vItems" hidden>
        <div class="sec-head"><h2>Item roll-up by brand</h2><span class="note" id="itemsNote"></span><button class="btn ghost" id="dlItems" type="button">Download item roll-up CSV</button></div>
        <div id="items"></div>
      </div>
      <div id="vTypes" hidden>
        <div class="sec-head"><h2>Product type roll-up</h2><span class="note" id="typesNote"></span><button class="btn ghost" id="dlTypes" type="button">Download roll-up CSV</button></div>
        <div class="dims" id="dims"></div>
        <div class="po"><div class="tbl" id="types"></div></div>
      </div>
    </section>
  </div>
</main>

<footer><div class="wrap">
  <div>Source: __SRC__ POS export (unit sales, units on hand and units on order), __NSTORES__ stores, __NITEMS__ items. <span id="footRule"></span></div>
  <div>Current weeks on hand = on hand ÷ weekly velocity. Future weeks on hand = on hand plus units on order (when deducted) plus order units, ÷ weekly velocity; it follows every order edit and setting, and shows red when it is below the weeks of cover. The weeks on hand tile uses lines with sales. Weekly retail sales and margin are averages over the run's sales time frame; margin = retail sales minus cost of goods sold.</div>
  <div>Lost sales: on days an item was out of stock it could not sell, so its sales understate demand. Lost units = units sold × (days in the sales time frame ÷ days in stock − 1), with days in stock floored so a short selling spell can't inflate demand. With "Add lost sales from stock-outs" on, weekly velocity = (units sold + lost units) ÷ weeks, so the target, order, weeks on hand, strain split and flags all use demand rather than what happened to sell. Weekly retail sales and margin stay actual sales.</div>
  <div>Strain split: the order is divided across the strains below target, in proportion to each gap. Flags: Out of stock now; Runs out before delivery (less than the lead time of stock); Review open PO (on hand already at target with more on order); Overstock (more than twice the weeks of cover on hand); Product type gap (an item that is out of stock or runs out before delivery when more than half of the active SKUs (sold in the sales time frame or in stock) in its product type at that store are too; product type = category + segment + unit size + price band + concentrate type, across all brands; it follows the lead time setting).</div>
  <div>Copyright ©__YEAR__ Hoodie Analytics. Confidential and proprietary.</div>
</div></footer>
<div class="toast" id="toast" hidden></div>

<script>
const ITEMS = __DATA__; // [brand, store, category, product, strain, onHand, onOrder, unitCost, [units sold per sales window], segment, unitSize, shelfPrice, concentrateType, retailSales$, cogs$ (both over the run's sales time frame), daysOutOfStock, lostUnits (est., run's sales time frame)]
const WINDOWS = __WINDOWS__; // weeks covered by each sales column, same order as the per-item sales array
const DEF = {weeks:__WEEKS__, lead:__LEAD__, sw:__SW__, oo:__OO__, ls:__LS__, cases:__CASES__};
const OOS_NOTE = __OOSNOTE__;
const $ = id => document.getElementById(id);
let S = JSON.parse(JSON.stringify(DEF));
try{ const v=JSON.parse(localStorage.getItem('reorderSettings')||'null'); if(v && v.base===JSON.stringify(DEF)) S={...S,...v.s}; }catch(e){}
// manual order-unit edits, keyed by brand|store|category|product; they override the suggested order
let OV = {};
try{ const v=JSON.parse(localStorage.getItem('reorderEdits')||'null'); if(v && v.base===JSON.stringify(DEF)) OV=v.ov||{}; }catch(e){}
const saveOV = () => { try{ localStorage.setItem('reorderEdits', JSON.stringify({base:JSON.stringify(DEF), ov:OV})); }catch(e){} };
const BRANDS = Object.keys(DEF.cases).sort((a,b)=>a.localeCompare(b));
const caseFor = b => S.cases[b] || __CASE__;
const sameAsRun = () => S.weeks===DEF.weeks && S.lead===DEF.lead && S.sw===DEF.sw && S.oo===DEF.oo && S.ls===DEF.ls && BRANDS.every(b=>caseFor(b)===DEF.cases[b]);
const wLabel = w => Math.abs(w-Math.round(w))>1e-9 ? `${Math.round(w*7)} days` : `${w} week${w===1?'':'s'}`;
let DATA = [];
const band = pr => !(pr>0) ? 'No price' : pr>=100 ? '$100+' : `$${Math.floor(pr/10)*10} to $${Math.floor(pr/10)*10+9}.99`;
function compute(){
  const cov = S.lead/7 + S.weeks, lt = S.lead/7, groups = new Map(), wi = Math.max(0, WINDOWS.indexOf(S.sw));
  for(const it of ITEMS){ const k = it.slice(0,4).join('|'); if(!groups.has(k)) groups.set(k, []); groups.get(k).push(it); }
  DATA = [...groups.values()].map((g,i)=>{
    const [b,s,c,p] = g[0];
    const cse = caseFor(b);
    const it = g.map(([,,,,strain,oh,oo,uc,sales,seg,size,price,ct,rd,cg,od,lu],k)=>({k,strain,oh,oo,uc,l4:sales[wi],od:od||0,lost:S.ls?(lu||0):0,v:(sales[wi]+(S.ls?(lu||0):0))/S.sw,seg,size,price,ct,ou:0,rs:(rd||0)/S.sw,mg:((rd||0)-(cg||0))/S.sw}));
    const v = it.reduce((a,x)=>a+x.v,0), oh = it.reduce((a,x)=>a+x.oh,0), oo = it.reduce((a,x)=>a+x.oo,0), l4 = it.reduce((a,x)=>a+x.l4,0);
    const rs = it.reduce((a,x)=>a+x.rs,0), mg = it.reduce((a,x)=>a+x.mg,0); // weekly retail sales and margin
    const lost = it.reduce((a,x)=>a+x.lost,0), od = l4 ? it.reduce((a,x)=>a+x.od*x.l4,0)/l4 : 0; // lost units and sales-weighted days out of stock
    const t = v===0 ? 0 : Math.ceil(cov*v - 1e-6);
    const net = t - oh - (S.oo ? oo : 0);
    const sug = net<=0 ? 0 : Math.ceil(net/cse)*cse, key = [b,s,c,p].join('|');
    const edited = Object.prototype.hasOwnProperty.call(OV,key) && OV[key]!==sug, u = edited ? OV[key] : sug;
    const ucRaw = l4 ? it.reduce((a,x)=>a+x.uc*x.l4,0)/l4 : it.reduce((a,x)=>a+x.uc,0)/it.length;
    const uc = Math.round(ucRaw*100)/100;
    const strains = it.filter(x=>x.strain);
    let split = '';
    const low = strains.map(x=>({...x, gap: Math.max(0, x.v*cov - x.oh - (S.oo ? x.oo : 0))})).filter(x=>x.gap>0).sort((x,y)=>y.gap-x.gap);
    if(low.length && u>0){
      const tot = low.reduce((a,x)=>a+x.gap,0);
      low.forEach(x=>{ x.raw = x.gap/tot*u; x.al = Math.floor(x.raw); });
      let rem = u - low.reduce((a,x)=>a+x.al,0);
      [...low].sort((x,y)=>(y.raw-y.al)-(x.raw-x.al)).slice(0,rem).forEach(x=>x.al++);
      split = low.filter(x=>x.al>0).map(x=>`${x.strain} ${x.al}`).join(', ');
    } else if(low.length){ split = 'No order; rebalance or reorder only: ' + low.map(x=>x.strain).join(', '); }
    // order units per item (the strain split where there is one, otherwise by velocity), so the roll-ups add up to the line order
    if(u>0){
      if(low.length) low.forEach(x=>{ it[x.k].ou = x.al||0; });
      else { const wsum = it.reduce((a,x)=>a+x.v,0), wt = x => wsum ? x.v/wsum : 1/it.length;
        it.forEach(x=>{ x.raw = wt(x)*u; x.ou = Math.floor(x.raw); }); const rem = u - it.reduce((a,x)=>a+x.ou,0);
        [...it].sort((x,y)=>(y.raw-y.ou)-(x.raw-x.ou)).slice(0,rem).forEach(x=>x.ou++); }
    }
    const empty = strains.filter(x=>x.oh < x.v*lt).map(x=>x.strain).join(', ');
    let f = '';
    if(oh===0) f='Out of stock now'; else if(oh < v*lt) f='Runs out before delivery';
    else if(oo>0 && oh>=t) f='Review open PO'; else if(v>0 && oh/v > cov*2) f='Overstock';
    return {i,key,sug,edited,lost,od,b,s,c,p,n:strains.length,oh,oo,l4,v,t,net,u,cs:u/cse,cse,uc,cost:Math.round(u*uc*100)/100,woh:v?oh/v:null,fwoh:v?(oh+(S.oo?oo:0)+u)/v:null,cov,f,split,empty,items:it,rs,mg,tg:''};
  });
  // product type gap: per store, share of active SKUs in each product type (category, segment, unit size, price band, concentrate type; all brands) out or running out
  const TG = new Map(), tk = (r,x) => [r.s, r.c, x.seg||'-', x.size||'-', band(x.price), x.ct||'-'].join('|');
  for(const r of DATA) for(const x of r.items){ if(!(x.v>0 || x.oh>0)) continue; x.rk = x.oh<=0 || x.oh < x.v*lt; x.tk = tk(r,x);
    const t = TG.get(x.tk) || {n:0, r:0}; t.n++; if(x.rk) t.r++; TG.set(x.tk, t); }
  for(const r of DATA){ let best = null;
    for(const x of r.items){ if(!x.rk) continue; const t = TG.get(x.tk); x.gap = t.r > t.n*0.5; if(x.gap && (!best || t.r/t.n > best.r/best.n)) best = {...t, k:x.tk}; }
    r.tg = best ? `${best.r} of ${best.n} ${best.k.split('|').slice(1).filter(v=>v!=='-').join(' · ')} SKUs out or running out` : ''; }
}
const fmtW = n => (Math.round(n*100)/100).toString();
function settingsUI(){
  const cov = S.lead/7 + S.weeks;
  $('sWeeks').value = S.weeks; $('sLead').value = S.lead; $('sOO').checked = !!S.oo; $('sLS').checked = !!S.ls;
  BRANDS.forEach((b,i)=>{ const el=$('cp'+i); if(document.activeElement!==el) el.value = caseFor(b); el.parentElement.classList.toggle('diff', caseFor(b)!==DEF.cases[b]); });
  const packs = BRANDS.map(caseFor), lo = Math.min(...packs), hi = Math.max(...packs);
  $('covNote').innerHTML = `Weeks of cover: <b>${cov.toFixed(2)}</b>`;
  const ne = DATA.filter(r=>r.edited).length;
  $('changed').hidden = sameAsRun() && !ne;
  $('eReset').hidden = !ne; $('eReset').textContent = `Clear order edits (${ne})`;
  $('chipCov').textContent = `${fmtW(S.weeks)} weeks on hand + ${fmtW(S.lead)}-day lead time = ${cov.toFixed(2)} weeks of cover`;
  $('chipCase').textContent = lo===hi ? `Cases of ${lo}` : `Case packs by brand (${lo} to ${hi})`;
  $('chipVel').textContent = `Velocity = last ${wLabel(S.sw)} of sales ÷ ${+(S.sw.toFixed(2))}`;
  $('chipOO').textContent = S.oo ? 'Units on order already deducted' : 'Units on order not deducted';
  $('chipLS').textContent = S.ls ? 'Lost sales from stock-outs added to velocity' : 'Lost sales not added';
  $('footRule').textContent = `Target = ${cov.toFixed(2)} weeks × weekly velocity, rounded up. Order = target minus on hand${S.oo?' minus on order':''}, rounded up to each brand's case pack (${lo===hi?lo:lo+' to '+hi} units). Velocity from the last ${wLabel(S.sw)} of sales${S.ls?', plus estimated lost sales on days out of stock':''}. ${OOS_NOTE}`;
}
function readSettings(){
  const w = parseFloat($('sWeeks').value), l = parseFloat($('sLead').value), sw = DEF.sw;
  if(!(w>=0) || !(l>=0) || !WINDOWS.includes(sw)) return false;
  const cases = {};
  for(const [i,b] of BRANDS.entries()){ const c = parseInt($('cp'+i).value,10); if(!(c>=1)) return false; cases[b]=c; }
  S = {weeks:w, lead:l, sw, oo:$('sOO').checked ? 1 : 0, ls:$('sLS').checked ? 1 : 0, cases};
  try{ localStorage.setItem('reorderSettings', JSON.stringify({base:JSON.stringify(DEF), s:S})); }catch(e){}
  return true;
}
const fmt$ = n => '$' + Math.round(n).toLocaleString('en-US');
const fmtN = n => Math.round(n).toLocaleString('en-US');
const fmtWk = n => n==null ? '-' : (Math.round(n*10)/10).toFixed(1);
const fmtP = n => n==null ? '-' : (n*100).toFixed(1)+'%';
const fmtC = n => Number.isInteger(n) ? fmtN(n) : (Math.round(n*100)/100).toLocaleString('en-US');
const RISK = new Set(['Out of stock now','Runs out before delivery']);
const WARN = new Set(['Review open PO','Overstock']);
const uniq = k => [...new Set(DATA.map(r => r[k]))].sort();
function fillSel(el, label, vals){ el.innerHTML = `<option value="">All ${label}</option>` + vals.map(v => `<option>${esc(v)}</option>`).join(''); }
function esc(s){ return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
$('casesGrid').innerHTML = BRANDS.map((b,i)=>`<label for="cp${i}"><span title="${esc(b)}">${esc(b)}</span><input id="cp${i}" type="number" min="1" max="500" step="1" inputmode="numeric"></label>`).join('');
compute();
fillSel($('fStore'),'stores',uniq('s')); fillSel($('fBrand'),'brands',uniq('b')); fillSel($('fCat'),'categories',uniq('c'));

function filtered({ignoreBrand=false, ignoreOrd=false}={}){
  const st=$('fStore').value, br=$('fBrand').value, ca=$('fCat').value, q=$('fQ').value.trim().toLowerCase(), ord=$('fOrd').checked, tgo=$('fTg').checked;
  return DATA.filter(r => (!st||r.s===st) && (ignoreBrand||!br||r.b===br) && (!ca||r.c===ca) && (!tgo||r.tg)
    && (!q || (r.p+' '+r.split+' '+r.empty).toLowerCase().includes(q)) && (ignoreOrd||!ord||r.u>0||r.edited));
}
function kpis(){
  const rows = filtered({ignoreOrd:true});
  const ord = rows.filter(r=>r.u>0);
  const cost = ord.reduce((a,r)=>a+r.cost,0), u = ord.reduce((a,r)=>a+r.u,0), cs = ord.reduce((a,r)=>a+r.cs,0);
  const risk = rows.filter(r=>RISK.has(r.f)).length, rev = rows.filter(r=>r.f==='Review open PO');
  const revCost = rev.reduce((a,r)=>a+r.oo*r.uc,0);
  // weeks on hand across the lines that sell: now, and once this order (plus on order when deducted) lands
  const sell = rows.filter(r=>r.v>0), sv = sell.reduce((a,r)=>a+r.v,0);
  const cw = sv ? sell.reduce((a,r)=>a+r.oh,0)/sv : null, fw = sv ? sell.reduce((a,r)=>a+r.oh+(S.oo?r.oo:0)+r.u,0)/sv : null;
  const rs = rows.reduce((a,r)=>a+r.rs,0), mg = rows.reduce((a,r)=>a+r.mg,0);
  $('kpis').innerHTML = [
    ['PO cost', fmt$(cost), `${new Set(ord.map(r=>r.b)).size} brands`],
    ['Weeks on hand', fmtWk(cw), fw==null ? 'no sales in this view' : `${fmtWk(fw)} weeks after this order`],
    ['Avg weekly retail sales', fmt$(rs), `last ${wLabel(S.sw)}, per week`],
    ['Average weekly margin dollars', fmt$(mg), `last ${wLabel(S.sw)}`],
    ['Average weekly margin %', fmtP(rs ? mg/rs : null), `last ${wLabel(S.sw)} sales`]
  ].map(([k,v,s,c])=>`<div class="kpi ${c||''}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`).join('');
}
function bars(){
  const rows = filtered({ignoreBrand:true, ignoreOrd:true}).filter(r=>r.u>0);
  const by = {}; rows.forEach(r=>{ (by[r.b] ??= {cost:0,u:0}); by[r.b].cost+=r.cost; by[r.b].u+=r.u; });
  const list = Object.entries(by).sort((a,b)=>b[1].cost-a[1].cost);
  const max = list.length ? list[0][1].cost : 1, sel = $('fBrand').value;
  $('brows').innerHTML = list.length ? list.map(([b,v],i)=>`<button type="button" class="brow ${i===0?'top':''} ${b===sel?'sel':''}" data-b="${esc(b)}" aria-pressed="${b===sel}">
    <span class="nm">${esc(b)}</span><span class="track"><span class="fill" style="width:${(v.cost/max*100).toFixed(1)}%"></span></span>
    <span class="num">${fmt$(v.cost)}</span><span class="num u">${fmtN(v.u)} u</span></button>`).join('') : '<div class="empty">No orders match these filters.</div>';
  document.querySelectorAll('.brow').forEach(el=>el.onclick=()=>{ const b=el.dataset.b; $('fBrand').value = $('fBrand').value===b ? '' : b; render(); if($('fBrand').value) document.getElementById('pos').scrollIntoView({behavior:'smooth',block:'start'}); });
}
function flagPill(f){ if(!f) return ''; return `<span class="pill ${RISK.has(f)?'p-crit':'p-warn'}">${esc(f)}</span>`; }
function pos(){
  const rows = filtered();
  const brands = {}; rows.forEach(r => (brands[r.b] ??= []).push(r));
  const order = Object.keys(brands).sort((a,b)=> brands[b].reduce((s,r)=>s+r.cost,0) - brands[a].reduce((s,r)=>s+r.cost,0));
  $('viewNote').textContent = `${fmtN(rows.length)} lines across ${order.length} brand${order.length===1?'':'s'}`;
  if(!rows.length){ $('pos').innerHTML = '<div class="po empty">No lines match these filters. Clear the search or turn off "Only lines with an order".</div>'; return; }
  $('pos').innerHTML = order.map(b=>{
    const rs = brands[b].sort((x,y)=> x.s.localeCompare(y.s) || x.c.localeCompare(y.c) || x.p.localeCompare(y.p));
    const t = rs.reduce((a,r)=>({u:a.u+r.u,cs:a.cs+r.cs,cost:a.cost+r.cost}),{u:0,cs:0,cost:0});
    const stores = new Set(rs.filter(r=>r.u>0).map(r=>r.s)).size;
    let prev='';
    const body = rs.map(r=>{ const first = r.s!==prev; prev=r.s;
      const strain = r.n>0 ? `<span class="tag">${r.n} strains</span>` : '';
      const mix = r.split ? `<div class="mix">Split: ${esc(r.split)}</div>` : '';
      const lostN = r.lost>=0.5 ? `<div class="mix">Includes ${fmtN(r.lost)} lost units from about ${fmtN(r.od)} days out of stock</div>` : '';
      const emp = lostN + (r.empty ? `<div class="mix">Empty before delivery: ${esc(r.empty)}</div>` : '') + (r.tg ? `<div class="mix tgap">Product type gap: ${esc(r.tg)}</div>` : '');
      return `<tr class="${first?'store-first':''} ${r.u>0?'':'zero'}">
        <td class="store">${first?esc(r.s):''}</td>
        <td class="prod"><span class="pname">${esc(r.p.replace(' (strain mix)',''))}</span>${strain}${mix}${emp}</td>
        <td class="n">${fmtN(r.oh)}</td><td class="n">${fmtN(r.oo)}</td><td class="n">${r.v.toFixed(1)}</td><td class="n">${fmt$(r.rs)}</td><td class="n">${fmt$(r.mg)}</td><td class="n">${fmtP(r.rs ? r.mg/r.rs : null)}</td><td class="n">${fmtWk(r.woh)}</td><td class="n">${fmtN(r.t)}</td>
        <td class="n">${fmtN(r.net)}</td><td class="n ord"><input class="ou${r.edited?' edited':''}" type="number" min="0" step="${r.cse}" inputmode="numeric" value="${r.u}" data-i="${r.i}" aria-label="Order units, ${esc(r.s)}, ${esc(r.p)}">${r.edited?`<span class="sug">Suggested ${fmtN(r.sug)} · <button type="button" class="undo" data-i="${r.i}">reset</button></span>`:''}</td><td class="n fw${r.fwoh!=null&&r.fwoh<r.cov-1e-9?' low':''}">${fmtWk(r.fwoh)}</td><td class="n${r.cs%1?' part':''}" title="${r.cs%1?'Not a full case. ':''}Case of ${r.cse}">${fmtC(r.cs)} <span class="mix" style="display:inline">× ${r.cse}</span></td>
        <td class="n">${r.cost?fmt$(r.cost):'-'}</td><td>${flagPill(r.f)}${r.tg?`<span class="pill p-crit" title="${esc(r.tg)}">Product type gap</span>`:''}</td></tr>`; }).join('');
    return `<article class="po"><div class="po-head"><h3>${esc(b)}</h3>
      <span class="t"><b>${fmt$(t.cost)}</b> PO cost</span><span class="t"><b>${fmtN(t.u)}</b> units</span><span class="t"><b>${fmtC(t.cs)}</b> cases</span><span class="t"><b>${stores}</b> store${stores===1?'':'s'}</span><button type="button" class="btn ghost po-dl" data-b="${esc(b)}"${t.u>0?'':' disabled'} aria-label="Download ${esc(b)} CSV">Download ${esc(b)} CSV</button></div>
      <div class="tbl"><table><thead><tr><th>Store</th><th>Product</th><th class="n">On hand</th><th class="n">On order</th><th class="n">Wkly velocity</th><th class="n">Wkly retail sales</th><th class="n">Wkly margin</th><th class="n">Margin %</th><th class="n" title="On hand ÷ weekly velocity">Current wks on hand</th><th class="n">Target</th><th class="n">Net needed</th><th class="n">Order units</th><th class="n" title="(On hand + on order when deducted + order units) ÷ weekly velocity">Future wks on hand</th><th class="n">Cases</th><th class="n">PO cost</th><th>Flag</th></tr></thead><tbody>${body}</tbody></table></div></article>`;
  }).join('');
  document.querySelectorAll('.po-dl').forEach(el=>el.onclick=()=>{ const b=el.dataset.b, st=$('fStore').value;
    save(filtered({ignoreBrand:true}).filter(r=>r.b===b), `vendor-order-__DATE__-${[b,st].filter(Boolean).map(slug).join('-')}.csv`); });
  // editable order units: a change re-derives cost, cases, strain split, totals and CSVs (deferred so Tab focus lands first)
  document.querySelectorAll('.ou').forEach(el=>{
    el.addEventListener('keydown',e=>{ if(e.key==='Enter') el.blur(); });
    el.addEventListener('change',()=>{ const r=DATA[+el.dataset.i], v=Number(el.value);
      if(!(v>=0) || !Number.isInteger(v)){ el.value=r.u; toast('Order units must be a whole number, 0 or more.'); return; }
      if(v===r.sug) delete OV[r.key]; else OV[r.key]=v; saveOV(); setTimeout(recalc,0); });
  });
  document.querySelectorAll('.undo').forEach(el=>el.onclick=()=>{ delete OV[DATA[+el.dataset.i].key]; saveOV(); recalc(); });
}
// ---- roll-up views: item roll-up by brand (all stores) and product type roll-up ----
const DIMS = [['c','Category'],['seg','Segment'],['b','Brand'],['size','Unit size'],['band','Price'],['ct','Concentrate type']];
let VIEW = 'po', DSEL = DIMS.map(d=>d[0]), ITEMROWS = [], ITEMGROUPS = new Map(), TYPEROWS = [], TYPEHEAD = [];
try{ VIEW = localStorage.getItem('reorderView') || 'po'; const ds = JSON.parse(localStorage.getItem('reorderDims')||'null'); if(Array.isArray(ds)) DSEL = DIMS.map(d=>d[0]).filter(k=>ds.includes(k)); }catch(e){}
if(!['po','items','types'].includes(VIEW)) VIEW = 'po';
function applyView(){ document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected', String(t.dataset.v===VIEW))); $('vPO').hidden = VIEW!=='po'; $('vItems').hidden = VIEW!=='items'; $('vTypes').hidden = VIEW!=='types'; }
function setView(v){ VIEW = v; try{ localStorage.setItem('reorderView', v); }catch(e){} applyView(); render(); }
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>setView(t.dataset.v));
function dimsUI(){
  $('dims').innerHTML = '<span class="note">Group by</span>' + DIMS.map(([k,l])=>`<label class="toggle"><input type="checkbox" data-d="${k}"${DSEL.includes(k)?' checked':''}> ${l}</label>`).join('');
  document.querySelectorAll('#dims input').forEach(el=>el.onchange=()=>{ DSEL = DIMS.map(d=>d[0]).filter(k=>document.querySelector(`#dims input[data-d="${k}"]`).checked); try{ localStorage.setItem('reorderDims', JSON.stringify(DSEL)); }catch(e){} typesView(); });
}
function itemsView(){
  // every store's need for the same brand + product on one row; store filter still narrows it
  const ordOnly = $('fOrd').checked, cov = S.lead/7 + S.weeks, by = new Map();
  for(const r of filtered({ignoreOrd:true})){
    const k = r.b+'|'+r.c+'|'+r.p; let g = by.get(k);
    if(!g){ g = {k,b:r.b,c:r.c,p:r.p,n:0,oh:0,oo:0,v:0,t:0,u:0,sug:0,cs:0,cost:0,stores:[],strain:{},risk:0,tgap:0,ed:false,rs:0,mg:0,rows:[]}; by.set(k,g); }
    g.rows.push(r); g.lost=(g.lost||0)+r.lost; g.sug+=r.sug; g.rs+=r.rs; g.mg+=r.mg; g.oh+=r.oh; g.oo+=r.oo; g.v+=r.v; g.t+=r.t; g.u+=r.u; g.cs+=r.cs; g.cost+=r.cost; g.n=Math.max(g.n,r.n); g.ed = g.ed || r.edited;
    if(r.u>0) g.stores.push([r.s,r.u]);
    if(RISK.has(r.f)) g.risk++;
    if(r.tg){ g.tgap++; (g.tgs ??= []).push(`${r.s}: ${r.tg}`); }
    for(const x of r.items) if(x.strain && x.ou>0) g.strain[x.strain] = (g.strain[x.strain]||0) + x.ou;
  }
  const list = [...by.values()].filter(g=>!ordOnly || g.u>0 || g.ed);
  ITEMGROUPS = new Map(list.map(g=>[g.k,g]));
  ITEMROWS = list.filter(g=>g.u>0).map(g=>({b:g.b, row:[g.p.replace(' (strain mix)',''), g.u, Math.round(g.cost*100)/100]}));
  const brands = {}; list.forEach(g => (brands[g.b] ??= []).push(g));
  const order = Object.keys(brands).sort((a,b)=> brands[b].reduce((s,r)=>s+r.cost,0) - brands[a].reduce((s,r)=>s+r.cost,0));
  $('itemsNote').textContent = `${fmtN(list.length)} items across ${order.length} brand${order.length===1?'':'s'}, every store's need combined`;
  if(!list.length){ $('items').innerHTML = '<div class="po empty">No items match these filters.</div>'; return; }
  $('items').innerHTML = order.map(b=>{
    const rs = brands[b].sort((x,y)=> y.cost-x.cost || x.p.localeCompare(y.p));
    const t = rs.reduce((a,r)=>({u:a.u+r.u,cs:a.cs+r.cs,cost:a.cost+r.cost}),{u:0,cs:0,cost:0});
    const body = rs.map(g=>{
      const cw = g.v ? g.oh/g.v : null, fw = g.v ? (g.oh+(S.oo?g.oo:0)+g.u)/g.v : null;
      const sp = Object.entries(g.strain).sort((a,b)=>b[1]-a[1]).map(([s,u])=>`${s} ${u}`).join(', ');
      const st = g.stores.sort((a,b)=>b[1]-a[1]).map(([s,u])=>`${s} ${fmtN(u)}`).join(' · ');
      return `<tr class="${g.u>0?'':'zero'}"><td class="prod"><span class="pname">${esc(g.p.replace(' (strain mix)',''))}</span>${g.n>0?`<span class="tag">${g.n} strains</span>`:''}${st?`<div class="mix">Stores: ${esc(st)}</div>`:''}${sp?`<div class="mix">Split: ${esc(sp)}</div>`:''}${g.lost>=0.5?`<div class="mix">Includes ${fmtN(g.lost)} lost units from stock-outs</div>`:''}</td>
        <td class="n">${g.stores.length}</td><td class="n">${fmtN(g.oh)}</td><td class="n">${fmtN(g.oo)}</td><td class="n">${g.v.toFixed(1)}</td><td class="n">${fmt$(g.rs)}</td><td class="n">${fmt$(g.mg)}</td><td class="n">${fmtP(g.rs ? g.mg/g.rs : null)}</td><td class="n">${fmtWk(cw)}</td><td class="n">${fmtN(g.t)}</td>
        <td class="n ord"><input class="ou iou${g.ed?' edited':''}" type="number" min="0" step="1" inputmode="numeric" value="${g.u}" data-g="${esc(g.k)}" aria-label="Order units, all stores, ${esc(g.p)}">${g.ed?`<span class="sug">Suggested ${fmtN(g.sug)} · <button type="button" class="iundo" data-g="${esc(g.k)}">reset</button></span>`:''}</td><td class="n fw${fw!=null&&fw<cov-1e-9?' low':''}">${fmtWk(fw)}</td><td class="n${g.cs%1?' part':''}">${fmtC(g.cs)}</td><td class="n">${g.cost?fmt$(g.cost):'-'}</td><td>${g.risk?`<span class="pill p-crit">${g.risk} at risk</span>`:''}${g.tgap?`<span class="pill p-crit" title="${esc(g.tgs.join('\n'))}">${g.tgap} product type gap${g.tgap===1?'':'s'}</span>`:''}</td></tr>`; }).join('');
    return `<article class="po"><div class="po-head"><h3>${esc(b)}</h3><span class="t"><b>${fmt$(t.cost)}</b> PO cost</span><span class="t"><b>${fmtN(t.u)}</b> units</span><span class="t"><b>${fmtC(t.cs)}</b> cases</span><span class="t"><b>${rs.length}</b> item${rs.length===1?'':'s'}</span><button type="button" class="btn ghost it-dl" data-b="${esc(b)}"${t.u>0?'':' disabled'} aria-label="Download ${esc(b)} item CSV">Download ${esc(b)} CSV</button></div>
      <div class="tbl"><table><thead><tr><th>Item</th><th class="n">Stores ordering</th><th class="n">On hand</th><th class="n">On order</th><th class="n">Wkly velocity</th><th class="n">Wkly retail sales</th><th class="n">Wkly margin</th><th class="n">Margin %</th><th class="n">Current wks on hand</th><th class="n">Target</th><th class="n">Order units</th><th class="n">Future wks on hand</th><th class="n">Cases</th><th class="n">PO cost</th><th>Store lines flagged</th></tr></thead><tbody>${body}</tbody></table></div></article>`;
  }).join('');
  // an item-level edit is spread across its store lines (in proportion to their current order, else velocity), so the PO view, totals and CSVs stay in step
  document.querySelectorAll('.iou').forEach(el=>{
    el.addEventListener('keydown',e=>{ if(e.key==='Enter') el.blur(); });
    el.addEventListener('change',()=>{ const g=ITEMGROUPS.get(el.dataset.g), v=Number(el.value);
      if(!g) return;
      if(!(v>=0) || !Number.isInteger(v)){ el.value=g.u; toast('Order units must be a whole number, 0 or more.'); return; }
      if(v===g.sug){ g.rows.forEach(r=>delete OV[r.key]); saveOV(); setTimeout(recalc,0); return; }
      const cur = g.rows.reduce((a,r)=>a+r.u,0), vel = g.rows.reduce((a,r)=>a+r.v,0);
      const wt = r => cur ? r.u/cur : vel ? r.v/vel : 1/g.rows.length;
      const al = g.rows.map(r=>({r, raw:wt(r)*v})); al.forEach(x=>x.n=Math.floor(x.raw));
      let rem = v - al.reduce((a,x)=>a+x.n,0); [...al].sort((x,y)=>(y.raw-y.n)-(x.raw-x.n)).slice(0,rem).forEach(x=>x.n++);
      al.forEach(({r,n})=>{ if(n===r.sug) delete OV[r.key]; else OV[r.key]=n; });
      saveOV(); setTimeout(recalc,0); });
  });
  document.querySelectorAll('.iundo').forEach(el=>el.onclick=()=>{ const g=ITEMGROUPS.get(el.dataset.g); if(g){ g.rows.forEach(r=>delete OV[r.key]); saveOV(); recalc(); } });
  document.querySelectorAll('.it-dl').forEach(el=>el.onclick=()=>{ const b=el.dataset.b, st=$('fStore').value;
    saveItems(ITEMROWS.filter(x=>x.b===b), `item-order-__DATE__-${[b,st].filter(Boolean).map(slug).join('-')}.csv`); });
}
function typesView(){
  // SKUs grouped by the chosen product-type attributes; store, brand, category and search filters apply
  const cov = S.lead/7 + S.weeks, by = new Map(); let n = 0;
  for(const r of filtered({ignoreOrd:true})) for(const x of r.items){
    n++;
    const vals = {c:r.c, b:r.b, seg:x.seg||'-', size:x.size||'-', band:band(x.price), ct:x.ct||'-'};
    const k = DSEL.map(d=>vals[d]).join('|'); let g = by.get(k);
    if(!g){ g = {vals, skus:new Set(), stores:new Set(), gaps:new Set(), oh:0, oo:0, v:0, soh:0, soo:0, ou:0, cost:0, pr:0, pn:0, rs:0, mg:0}; by.set(k,g); }
    g.skus.add(r.b+'|'+r.p+'|'+x.strain); g.stores.add(r.s); g.oh+=x.oh; g.oo+=x.oo; g.v+=x.v; g.ou+=x.ou; g.cost+=x.ou*x.uc; g.rs+=x.rs; g.mg+=x.mg;
    if(x.v>0){ g.soh+=x.oh; g.soo+=x.oo; }
    if(x.gap) g.gaps.add(r.s);
    if(x.price>0){ g.pr+=x.price; g.pn++; }
  }
  const list = [...by.values()].sort((a,b)=> b.cost-a.cost || b.oh-a.oh);
  const head = DSEL.map(k=>DIMS.find(d=>d[0]===k)[1]);
  TYPEHEAD = [...head, 'SKUs', 'Stores', 'Avg Shelf Price ($)', 'On Hand', 'Weekly Velocity', 'Weekly Retail Sales ($)', 'Weekly Margin ($)', 'Margin %', 'Current Weeks on Hand', 'Order Units', 'Future Weeks on Hand', 'PO Cost ($)', 'Stores with Product Type Gap'];
  const calc = g => ({cw: g.v ? g.soh/g.v : null, fw: g.v ? (g.soh+(S.oo?g.soo:0)+g.ou)/g.v : null, ap: g.pn ? g.pr/g.pn : null});
  TYPEROWS = list.map(g=>{ const c = calc(g); return [...DSEL.map(d=>g.vals[d]), g.skus.size, g.stores.size, c.ap==null?'':Math.round(c.ap*100)/100, g.oh, Math.round(g.v*10)/10, Math.round(g.rs*100)/100, Math.round(g.mg*100)/100, g.rs ? Math.round(g.mg/g.rs*1000)/10 : '',
    c.cw==null?'':Math.round(c.cw*10)/10, g.ou, c.fw==null?'':Math.round(c.fw*10)/10, Math.round(g.cost*100)/100, g.gaps.size]; });
  const MAX = 500;
  $('typesNote').textContent = `${fmtN(list.length)} product type${list.length===1?'':'s'} from ${fmtN(n)} store SKUs${list.length>MAX?`; showing the top ${MAX} by PO cost (the CSV has all)`:''}`;
  if(!list.length){ $('types').innerHTML = '<div class="empty">No SKUs match these filters.</div>'; return; }
  $('types').innerHTML = `<table><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}<th class="n">SKUs</th><th class="n">Stores</th><th class="n">Avg shelf price</th><th class="n">On hand</th><th class="n">Wkly velocity</th><th class="n">Wkly retail sales</th><th class="n">Wkly margin</th><th class="n">Margin %</th><th class="n">Current wks on hand</th><th class="n">Order units</th><th class="n">Future wks on hand</th><th class="n">PO cost</th><th class="n" title="Stores where an item in this group is out or running out and more than half of its product type's SKUs are too">Stores with type gap</th></tr></thead><tbody>${
    list.slice(0,MAX).map(g=>{ const c = calc(g); return `<tr class="${g.ou>0?'':'zero'}">${DSEL.map(d=>`<td>${esc(g.vals[d])}</td>`).join('')}<td class="n">${fmtN(g.skus.size)}</td><td class="n">${g.stores.size}</td><td class="n">${c.ap==null?'-':'$'+c.ap.toFixed(2)}</td><td class="n">${fmtN(g.oh)}</td><td class="n">${g.v.toFixed(1)}</td><td class="n">${fmt$(g.rs)}</td><td class="n">${fmt$(g.mg)}</td><td class="n">${fmtP(g.rs ? g.mg/g.rs : null)}</td><td class="n">${fmtWk(c.cw)}</td><td class="n ord">${fmtN(g.ou)}</td><td class="n fw${c.fw!=null&&c.fw<cov-1e-9?' low':''}">${fmtWk(c.fw)}</td><td class="n">${g.cost?fmt$(g.cost):'-'}</td><td class="n">${g.gaps.size?`<span class="pill p-crit">${g.gaps.size}</span>`:'-'}</td></tr>`; }).join('')}</tbody></table>`;
}
function recalc(){ compute(); settingsUI(); render(); }
function render(){ const ae=document.activeElement, isOu=ae&&ae.classList&&ae.classList.contains('ou'), fi=isOu?ae.dataset.i:null, fg=isOu?ae.dataset.g:null; kpis(); bars(); if(VIEW==='items') itemsView(); else if(VIEW==='types') typesView(); else pos(); const nx = fi!=null ? document.querySelector(`.ou[data-i="${fi}"]`) : fg!=null ? document.querySelector(`.iou[data-g="${CSS.escape(fg)}"]`) : null; if(nx){ nx.focus(); nx.select(); } try{ localStorage.setItem('reorderFilters', JSON.stringify({s:$('fStore').value,b:$('fBrand').value,c:$('fCat').value,o:$('fOrd').checked})); }catch(e){} }
['fStore','fBrand','fCat','fOrd','fTg'].forEach(id=>$(id).addEventListener('change',render));
$('fQ').addEventListener('input',render);
['sWeeks','sLead'].concat(BRANDS.map((b,i)=>'cp'+i)).forEach(id=>$(id).addEventListener('input',()=>{ if(readSettings()) recalc(); }));
$('sAllBtn').onclick = () => { const c=parseInt($('sAll').value,10); if(!(c>=1)) return; BRANDS.forEach((b,i)=>$('cp'+i).value=c); if(readSettings()) recalc(); };
['sOO','sLS'].forEach(id=>$(id).addEventListener('change',()=>{ if(readSettings()) recalc(); }));
$('settings').addEventListener('submit',e=>e.preventDefault());
$('sReset').onclick = () => { S = JSON.parse(JSON.stringify(DEF)); OV = {}; try{ localStorage.removeItem('reorderSettings'); localStorage.removeItem('reorderEdits'); }catch(e){} recalc(); };
$('eReset').onclick = () => { OV = {}; saveOV(); recalc(); };
try{ const f=JSON.parse(localStorage.getItem('reorderFilters')||'null'); if(f){ $('fStore').value=f.s||''; $('fBrand').value=f.b||''; $('fCat').value=f.c||''; $('fOrd').checked=f.o!==false; } }catch(e){}
applyView(); dimsUI();
recalc();

// CSV download
const COLS = [['Brand','b'],['Store','s'],['Product','p'],['Order Units','u'],['PO Cost ($)','cost']];
const cell = v => { const s = v==null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
const toCSV = rows => [COLS.map(c=>c[0]).join(','), ...rows.filter(r=>r.u>0).map(r=>COLS.map(([,k])=>cell(r[k])).join(','))].join('\r\n');
function toast(msg){ const t=$('toast'); t.textContent=msg; t.hidden=false; clearTimeout(toast.h); toast.h=setTimeout(()=>t.hidden=true,2600); }
// Inside Claude the downloads capability saves the file; a standalone copy of this page (opened from a saved HTML file) falls back to a normal browser download.
const dlReady = (async()=>{ try{ return (await window.claude?.use?.('downloads')) || null; }catch(e){ return null; } })();
function browserSave(name, data){
  const url = URL.createObjectURL(new Blob([data], {type:'text/csv;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = name; a.style.display = 'none';
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 1500);
}
const csvOf = (head, rows) => [head.map(cell).join(','), ...rows.map(r=>r.map(cell).join(','))].join('\r\n');
async function save(rows, name){
  if(!rows.some(r=>r.u>0)){ toast('No order lines in this view.'); return; }
  saveText(name, toCSV(rows));
}
async function saveText(name, data){
  const dl = await dlReady;
  if(dl){
    try{ await dl.save({filename:name, data}); toast(`Saved ${name}`); return; }
    catch(e){ if(e?.code==='declined') return; if(e?.code==='rate_limited'){ toast('A download prompt is already open.'); return; } }
  }
  try{ browserSave(name, data); toast(`Saved ${name}`); }
  catch(e){ toast('Download is not available here. Use the CSV attached in the chat.'); }
}
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
$('dlView').onclick = () => { const parts=[$('fBrand').value,$('fStore').value].filter(Boolean).map(slug); save(filtered(), `vendor-order-__DATE__${parts.length?'-'+parts.join('-'):''}.csv`); };
$('dlAll').onclick = () => save(DATA, 'vendor-order-__DATE__-all-brands.csv');
// item roll-up CSV: just Item, Order Units and PO Cost ($), every store combined
function saveItems(rows, name){ if(!rows.length){ toast('No order lines in this view.'); return; } saveText(name, csvOf(['Item','Order Units','PO Cost ($)'], rows.map(x=>x.row))); }
$('dlItems').onclick = () => { const parts=[$('fBrand').value,$('fStore').value].filter(Boolean).map(slug); saveItems(ITEMROWS, `item-order-__DATE__${parts.length?'-'+parts.join('-'):''}.csv`); };
$('dlTypes').onclick = () => { if(!TYPEROWS.length){ toast('Nothing to download in this view.'); return; } saveText('product-type-rollup-__DATE__.csv', csvOf(TYPEHEAD, TYPEROWS)); };
</script>
'''

ap = argparse.ArgumentParser()
ap.add_argument('xlsx'); ap.add_argument('html'); ap.add_argument('csv')
ap.add_argument('--client', required=True); ap.add_argument('--src', required=True)
ap.add_argument('--week', default=dt.date.today().isoformat())
a = ap.parse_args()

# assumptions straight from the workbook (recalculated values)
ws = load_workbook(a.xlsx, data_only=True)['Assumptions']
lead, weeks, case, oo, sw = ws['B4'].value, ws['B6'].value, ws['B7'].value, ws['B8'].value, ws['B10'].value
ls = ws['B11'].value if isinstance(ws['B11'].value, (int, float)) else 0
oos_note = next((str(c.value) for c in ws['A'] if str(c.value or '').startswith('Lost sales:')), '')
oos_note = re.sub(r'^Lost sales: days out of stock ', 'Days out of stock ', oos_note).split('. Lost units')[0] + '.' if oos_note else ''
if ws['B9'].value is None: raise SystemExit('Workbook not recalculated: run recalc.py first')
cov = lead / 7 + weeks
num = lambda x: (f'{x:g}')

cols = {'Brand':'b','Store':'s','Category':'c','Product':'p','Strains':'n','Current Stock':'oh','On Order':'oo','Case Pack':'cp',
        'Weekly Velocity':'v','Target Stock':'t','Net Needed':'net','Suggested Order (Units)':'u','Suggested Order (Cases)':'cs',
        'Unit Cost ($)':'uc','PO Cost ($)':'cost','Current Weeks on Hand':'woh','Future Weeks on Hand':'fwoh','Flag':'f','Suggested Strain Split (units)':'split',
        'Strains Empty Before Delivery':'empty'}
l = pd.read_excel(a.xlsx, sheet_name='Reorder Lines')
l = l.rename(columns={c: 'l4' for c in l.columns if str(c).startswith('Units Sold')}).rename(columns=cols)
l = l[l['b'].notna()].copy()
for c in ['f','split','empty']: l[c] = l[c].fillna('').astype(str)
for c in ['oh','oo','l4','t','net','u','cs','n']: l[c] = pd.to_numeric(l[c], errors='coerce').fillna(0).astype(int)
for c in ['v','uc','cost']: l[c] = pd.to_numeric(l[c], errors='coerce').fillna(0).round(2)
l['woh'] = pd.to_numeric(l['woh'], errors='coerce').round(1)
# item-level rows: the page recalculates every order from these when the viewer changes settings
d = pd.read_excel(a.xlsx, sheet_name='Item Detail')
d['Strain'] = d['Strain'].fillna('').astype(str)
wcols = [c for c in d.columns if str(c).startswith('Units Sold (last ')]
def _wk(c):
    m = re.search(r'last ([\d.]+) (wks?|days)', c)
    return float(m.group(1)) / (7 if m.group(2) == 'days' else 1)
windows = [_wk(c) for c in wcols]
for c in ['Segment', 'Unit Size', 'Concentrate Type']: d[c] = d[c].fillna('').astype(str) if c in d.columns else ''
d['Shelf Price ($)'] = pd.to_numeric(d['Shelf Price ($)'], errors='coerce').fillna(0) if 'Shelf Price ($)' in d.columns else 0
for c in ['Retail Sales ($)', 'COGS ($)', 'Days Out of Stock (est.)', 'Lost Units (est.)']: d[c] = pd.to_numeric(d[c], errors='coerce').fillna(0) if c in d.columns else 0
xc = [d.columns.get_loc(c) for c in ['Segment', 'Unit Size', 'Shelf Price ($)', 'Concentrate Type', 'Retail Sales ($)', 'COGS ($)', 'Days Out of Stock (est.)', 'Lost Units (est.)']]
items = [[r.Brand, r.Store, r.Category, r.Product, r.Strain, int(r[6]), int(r[7]), round(float(r[8]), 2),
          [int(r[d.columns.get_loc(c)]) for c in wcols], r[xc[0]], r[xc[1]], round(float(r[xc[2]]), 2), r[xc[3]], round(float(r[xc[4]]), 2), round(float(r[xc[5]]), 2), round(float(r[xc[6]]), 1), round(float(r[xc[7]]), 2)]
         for r in d.itertuples(index=False)]
n_items = len(items)
cpk = pd.read_excel(a.xlsx, sheet_name='Case Packs').dropna(subset=['Case Pack (units)'])
cases = {str(r[0]): int(r[1]) for r in cpk.itertuples(index=False)}
if not any(abs(w - sw) < 1e-6 for w in windows): raise SystemExit('Run sales window missing from Item Detail')

# vendor CSV: only lines with an order, vendor-facing columns only
v = l[l.u > 0][['b','s','p','u','cost']]; v.columns = ['Brand','Store','Product','Order Units','PO Cost ($)']
v.to_csv(a.csv, index=False)

# brand assets from the Hoodie brand kit skill (fallback: gradient + text wordmark)
def asset(name):
    hits = glob.glob(f'/root/.claude/skills/**/jesse-hoodie-brand-kit/assets/{name}', recursive=True) + glob.glob(f'/mnt/skills/**/jesse-hoodie-brand-kit/assets/{name}', recursive=True)
    return hits[0] if hits else None
bg64 = logo64 = None
try:
    from PIL import Image
    if (p := asset('brand_background.png')):
        im = Image.open(p).convert('RGB'); im.thumbnail((1600, 1600)); b = io.BytesIO(); im.save(b, 'JPEG', quality=72); bg64 = base64.b64encode(b.getvalue()).decode()
    if (p := asset('logo_wordmark_white.png')):
        im = Image.open(p); im.thumbnail((440, 440)); b = io.BytesIO(); im.save(b, 'PNG', optimize=True); logo64 = base64.b64encode(b.getvalue()).decode()
except Exception as e:
    print('Brand asset load failed, using fallback:', e)

wk = dt.date.fromisoformat(a.week)
page = TEMPLATE
if bg64: page = page.replace('__BG__', bg64)
else: page = page.replace('url(data:image/jpeg;base64,__BG__) center 30%/cover no-repeat,', '')
if logo64: page = page.replace('__LOGO__', logo64)
else: page = page.replace('<img src="data:image/png;base64,__LOGO__" alt="Hoodie Analytics">', '<div style="font-family:var(--display);font-weight:900;font-size:30px">hoodie <span style="font-size:13px;letter-spacing:.2em;color:#50BB80">ANALYTICS</span></div>')
subs = {'__TITLE__': f"{a.client.split()[0]} Weekly Reorder", '__CLIENT__': a.client, '__NSTORES__': str(l.s.nunique()),
        '__WEEK__': wk.strftime('%b %-d, %Y'), '__WEEKS__': num(weeks), '__LEAD__': num(lead), '__COV__': f'{cov:.2f}', '__CASE__': str(case),
        '__OO__': str(int(oo)), '__LS__': str(int(ls)), '__OOSNOTE__': json.dumps(oos_note), '__SW__': json.dumps(next(w for w in windows if abs(w - sw) < 1e-6)), '__WINDOWS__': json.dumps(windows),
        '__CASES__': json.dumps(cases), '__SRC__': a.src, '__NITEMS__': str(n_items), '__YEAR__': str(wk.year), '__DATE__': a.week,
        '__SWLABEL__': (f'{round(sw*7)} days' if abs(sw - round(sw)) > 1e-9 else ('week' if sw == 1 else f'{sw:g} weeks'))}
for k, val in subs.items(): page = page.replace(k, val)
page = page.replace('__DATA__', json.dumps(items, separators=(',', ':')))
left = sorted(set(re.findall(r'__[A-Z]+__', page)))
if left: raise SystemExit(f'Unfilled placeholders: {left}')
if '—' in page: raise SystemExit('Em dash found in page copy (Hoodie brand rule)')
open(a.html, 'w').write(page)
print(f'Page: {len(page)//1024} KB, {len(l)} lines from {n_items} items. Vendor CSV: {len(v)} order lines, {int(v["Order Units"].sum())} units, ${v["PO Cost ($)"].sum():,.2f}')
```