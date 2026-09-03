# hoodie-plugins

A [Claude Code plugin marketplace](https://docs.claude.com/en/docs/claude-code/plugins) for Hoodie Analytics. Currently ships one plugin, **hoodie**, which connects Claude Code to the Hoodie Analytics MCP server.

## Installing

```
/plugin marketplace add Unifyd-Insights/hoodie-plugins
/plugin install hoodie@hoodie-plugins
```

## Plugins

### hoodie

Connects to the Hoodie Analytics MCP server (`https://mcp.hoodieanalytics.com/mcp`), giving Claude access to cannabis retail and wholesale market intelligence tools. Skills will be added here over time — the `skills/` folder is currently empty.

## Hoodie MCP Server tools

The Hoodie MCP gateway exposes the following tools to customer agents:

| Tool | Description |
| --- | --- |
| List owned (and distributed) brands | Returns the brands the user's account owns and the brands it distributes, as separate lists. |
| List owned dispensaries | Returns a list of dispensaries owned by the user's account. |
| ACV Volume Driver Analysis | Compares two months and returns monthly retail distribution metrics (ACV %, sales per $MM of ACV, dollars, units, SKU count, store count, weighted average price, days-in-stock %, out-of-stock SKU %) grouped by a single dimension (Brand, Category, Segment, State, Dispensary, etc.), each with the change vs. the comparison month. Scoped to the account's data entitlement. |
| Pivot Market Intelligence data | Aggregates modelled retail sales across the Market Intelligence data set (last 13 months). Choose row/column dimensions (brand, category, segment, state, dispensary, time, etc.) and measures (dollars, units, price, share, month-over-month change) to build a pivot table. |
| Pivot the latest cannabis menu snapshot | Aggregates current dispensary menu listings (assortment, pricing, availability) into a pivot table across chosen row/column dimensions — a live snapshot of what's on menus right now, rather than historical sales. |
| Pivot Retail POS data | Aggregates actual point-of-sale data for stores the account owns, or stores sharing data with the account's brands via Hoodie Connect. Choose row/column dimensions and rolling-window measures (7/14/28/60/90-day, and 12-month: sales, units, margin, stock-out days, lost revenue, velocity). A current snapshot, not a historical time series. |
