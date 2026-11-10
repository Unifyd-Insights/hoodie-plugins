# Hoodie Analytics

Connects Claude to the Hoodie Analytics MCP server, so you can ask about cannabis retail and wholesale market data in plain language. It also adds three skills that turn that data, or your own point-of-sale (POS) exports, into reports you can share.

You need a Hoodie Analytics account. The data you can query depends on your subscription: for example, the market intelligence tools need the Market Intelligence Member role.

## What it adds

- **hoodie-analytics connector**: the Hoodie MCP server at `https://mcp.hoodieanalytics.com/mcp`. Its tools cover your account, market intelligence (modelled monthly retail sales and ACV), POS data for stores your account owns or that share data with your brands, current dispensary menus, and your own wholesale records.
- **acv-decomposition-dashboard**: a two-month ACV decomposition dashboard for one or more brands in a state: won and lost stores, a dollar bridge, whitespace, a county map and market movers.
- **shelf-check**: a shelf health report for a dispensary from a POS export plus Hoodie market data: keep, fix or cut verdicts per product line, replacements and a 30-day plan.
- **weekly-brand-reorder**: a weekly reorder grouped by brand from a POS or inventory export: purchase orders per brand and store, a report page and a vendor CSV.

## Set up

1. Install the plugin.
   - **claude.ai, the Claude desktop app and Cowork**: open **Customize > Plugins**, select **Add > Add marketplace**, enter `Unifyd-Insights/hoodie-plugins`, then add **hoodie-analytics**.
   - **Claude Code**:

     ```
     /plugin marketplace add Unifyd-Insights/hoodie-plugins
     /plugin install hoodie-analytics@hoodie-plugins
     ```

2. Connect your Hoodie account. Installing the plugin doesn't sign you in. Open the plugin's **Connectors** tab, connect **hoodie-analytics** and sign in with your Hoodie Analytics account. On Team and Enterprise plans, if the connector shows **Not added**, ask an Owner of your organization to add it first. In Claude Code, run `/mcp` and authenticate **hoodie-analytics**.

If Claude says the hoodie-analytics sign-in expired, disconnect the connector under **Customize > Connectors** and connect it again.

## Example prompts

- "Which brands gained the most share in Illinois flower last month?" (the connector's market intelligence tools)
- "Build an ACV decomposition dashboard for [your brand] in Michigan, comparing last month with the month before." (acv-decomposition-dashboard)
- Upload your POS sales export, then: "Run a shelf check on this store. What should we keep, fix or cut?" (shelf-check)
- Upload your POS or inventory export, then: "Build this week's reorder by brand." (weekly-brand-reorder)

## What the skills need

The skills run Python where Claude runs them: on your computer in Claude Code, or in the session in Cowork.

- **acv-decomposition-dashboard**: Python 3.
- **shelf-check**: Python 3 with pandas, numpy and openpyxl (for Excel exports). The email-safe PDF also needs Playwright with Chromium.
- **weekly-brand-reorder**: Python 3 with pandas and openpyxl, and LibreOffice to recalculate the workbook before the page is built (through the `xlsx` skill's `recalc.py`).

## Data and network use

- **Hoodie connector**: requests go to `https://mcp.hoodieanalytics.com/mcp`, run by Hoodie Analytics, and return only data your account can see.
- **Skills**: shelf-check and acv-decomposition-dashboard call the connector's tools for market data. Only query values, such as a state, a category or brand names, go to Hoodie. The files you upload are read where Claude runs the skill and aren't sent anywhere else. weekly-brand-reorder calls no Hoodie tools and works only from the file you give it.
- **Fonts**: the report pages that shelf-check and weekly-brand-reorder build load fonts from Google Fonts (`fonts.googleapis.com` and `fonts.gstatic.com`) when they're opened or rendered to PDF.

The plugin has no hooks or agents, and it sends nothing to any other service.

## Support

- Contact: https://www.hoodieanalytics.com/contact/
- Privacy policy: https://www.hoodieanalytics.com/privacy-policy/

## License

MIT
