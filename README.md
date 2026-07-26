# Point of Sale

A browser-based POS application built with SAPUI5 and plain HTML/JS, backed by a
lightweight Node.js server for file persistence.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Configuration Files](#configuration-files)
   - [catalog.json — Products & Categories](#catalogjson--products--categories)
   - [sources.json — Transaction Sources](#sourcesjson--transaction-sources)
4. [Transaction Files](#transaction-files)
   - [Folder Layout](#folder-layout)
   - [File Format](#file-format)
   - [Fallback (no server)](#fallback-no-server)
5. [Analytics Pages](#analytics-pages)
6. [Themes](#themes)
7. [Test Data Generators](#test-data-generators)
8. [Server Routes](#server-routes)

---

## Quick Start

Node.js is the only prerequisite — no `npm install` needed.

```bash
node server.js
```

Then open **http://localhost:3000** in your browser.

---

## Project Structure

```
pointofsale/
├── configuration/
│   ├── catalog.json              ← products, categories & tax rates
│   └── sources.json              ← which transaction folders are read
├── css/
│   ├── theme-switcher.js         ← shared theme selector widget
│   ├── theme-default.css         ← ☀ Default (clean light)
│   ├── theme-dark.css            ← 🌙 Dark (slate night)
│   ├── theme-retro.css           ← 📟 Retro (amber terminal)
│   ├── theme-horizon.css         ← 🔷 SAP Horizon
│   └── theme-sapgui.css          ← 🖥 SAP GUI (classic)
├── transactions/
│   ├── *.json                    ← live production transactions
│   ├── testing-time/             ← 90-day test data (git-ignored)
│   ├── testing-period/           ← 3-year test data (git-ignored)
│   ├── receipts/                 ← receipt HTML files (git-ignored)
│   └── backup/
│       └── YYYYMMDD_HHmmss/      ← archived transactions (git-ignored)
├── index.html                    ← POS terminal
├── analytics-overview.html       ← Transaction Overview (full Analytical List Page)
├── analytics.html                ← Sales Analytical List Page
├── analytics-items.html          ← Item Analytical List Page
├── analytics-time.html           ← Time Analytical List Page
├── analytics-period.html         ← Period Analytical List Page
├── server.js                     ← local Node.js server
├── generate-test-transactions.js ← generates 500 tx / 90 days → testing-time/
└── generate-period-test-data.js  ← generates 2 000 tx / 3 years → testing-period/
```

---

## Configuration Files

All configuration lives under `./configuration/`. Changes take effect on the
next browser page refresh — **no server restart required**.

---

### `catalog.json` — Products & Categories

**Path:** `configuration/catalog.json`

Controls every product shown on the POS tile grid, its price, and the tax rate
applied per category.

```json
{
  "categories": [
    { "name": "Beverages", "taxRate": 0.10 },
    { "name": "Bakery",    "taxRate": 0.07 },
    { "name": "Food",      "taxRate": 0.19 },
    { "name": "Desserts",  "taxRate": 0.19 }
  ],
  "products": [
    { "id": "P001", "name": "Espresso", "category": "Beverages", "price": 2.50 }
  ]
}
```

#### Category fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✔ | Unique category name — must match `category` values in products |
| `taxRate` | number | ✔ | Tax rate as a decimal, e.g. `0.19` = 19 % |

#### Product fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | ✔ | Unique product identifier |
| `name` | string | ✔ | Display name on the tile |
| `category` | string | ✔ | Must exactly match a category `name` above |
| `price` | number | ✔ | Unit price in euros |
| `taxRate` | — | ✘ | **Do not add** — resolved automatically from the category |

> **Adding a product:** append an object to `products` and save. Refresh the browser.  
> **Changing a tax rate:** edit the `taxRate` on the relevant category entry. All
> products in that category pick up the new rate immediately.

---

### `sources.json` — Transaction Sources

**Path:** `configuration/sources.json`

Controls which transaction folders the server includes when the analytics pages
call `GET /transactions`. Edit and save — **no server restart needed**, takes
effect on the next page refresh.

```json
{
  "sources": {
    "active":         { "enabled": true,  "description": "Live transactions in ./transactions/*.json" },
    "testing-time":   { "enabled": true,  "description": "Generated test data in ./transactions/testing-time/" },
    "testing-period": { "enabled": true,  "description": "3-year period test data in ./transactions/testing-period/" },
    "backup":         { "enabled": false, "description": "Archived transactions in ./transactions/backup/<stamp>/" }
  }
}
```

#### Source keys

| Key | Default | Folder read | Description |
|---|---|---|---|
| `active` | `true` | `transactions/*.json` | Real production transactions written by the POS |
| `testing-time` | `true` | `transactions/testing-time/` | 500 short-range synthetic transactions (90 days) |
| `testing-period` | `true` | `transactions/testing-period/` | 2 000 long-range synthetic transactions (3 years) |
| `backup` | `false` | `transactions/backup/<YYYYMMDD_HHmmss>/` | Transactions moved there by the **Clear Data** button |

#### How to toggle a source

Set `"enabled": false` to exclude a source, `"enabled": true` to include it.
Save the file and refresh any analytics page.

**Common scenarios:**

| Goal | Setting |
|---|---|
| Show only real production data | `active: true`, all others `false` |
| Test time-of-day analytics | `active: false`, `testing-time: true`, others `false` |
| Test period (weekly/monthly/yearly) analytics | `active: false`, `testing-period: true`, others `false` |
| Audit cleared/archived transactions | `backup: true` (plus any other sources as needed) |
| Full dataset (all sources) | all four `true` |

> If `sources.json` is missing or contains invalid JSON the server falls back
> to `active`, `testing-time`, and `backup` all **enabled**.

---

## Transaction Files

### Folder Layout

```
transactions/
├── transaction_20250117_143022.json        ← active (written by POS)
├── testing-time/                           ← 90-day test data (git-ignored)
│   └── transaction_20250415_091200.json
├── testing-period/                         ← 3-year test data (git-ignored)
│   └── transaction_20230101_090000.json
├── receipts/                               ← receipt HTML files (git-ignored)
│   └── receipt_20250117_143022.html
└── backup/                                 ← archived by Clear Data (git-ignored)
    └── 20250120_103045/
        └── transaction_20250117_143022.json
```

### File Format

Each transaction JSON contains:

```json
{
  "id": "20250117_143022",
  "timestamp": "2025-01-17T14:30:22.000Z",
  "items": [
    {
      "id": "P001", "name": "Espresso", "category": "Beverages",
      "price": 2.50, "taxRate": 0.10, "quantity": 2,
      "subtotal": 5.00, "taxAmount": 0.50
    }
  ],
  "subtotal": 5.00,
  "taxBreakdown": [
    { "label": "Tax Beverages (10%)", "amount": 0.50 }
  ],
  "totalTax": 0.50,
  "total": 5.50
}
```

### Receipt Files

Every time **🖨 Print & Save PDF** is clicked the POS also writes a complete
self-contained HTML receipt to `transactions/receipts/receipt_<id>.html`. These
files can be opened directly in any browser and printed as PDF at any time.
Receipt HTML files are git-ignored.

### Fallback (no server)

If `server.js` is not running (e.g. page opened via `file://`) the POS falls
back to triggering a browser download of each transaction JSON to the browser's
Downloads folder. Receipt files are not persisted in this case.

---

## Analytics Pages

Five pages are accessible from the POS header and from each other via navigation
buttons in the header.

| Page | File | Purpose |
|---|---|---|
| 📋 Transaction Overview | `analytics-overview.html` | Full ALP: all transactions, group-by, column visibility, totals row |
| 📊 Sales Analytics | `analytics.html` | Revenue, tax, KPIs, charts, transaction list |
| 🛒 Item Analytics | `analytics-items.html` | Per-product sales, quantities, revenue ranking |
| ⏰ Time Analytics | `analytics-time.html` | Hourly, daily, day-of-week, time-slot breakdowns |
| 📅 Period Analytics | `analytics-period.html` | Daily / Weekly / Monthly / Yearly trends & comparisons |

All five pages read data from `GET /transactions`, which respects the
`configuration/sources.json` toggles described above.

### Transaction Overview (`analytics-overview.html`)

The primary Analytical List Page — shows every transaction as a flat, filterable,
sortable table with full aggregation.

- **KPI strip:** transactions, revenue, total tax, avg order value, items sold, active/archived split
- **Quick stats bar:** live count, revenue, tax, items, avg order — updates instantly on every filter change
- **Filters:** date range, category, product, minimum total, status (Active / All / Archived / Test data), free-text search
- **Group-by:** None · Date · Category · Status — inserts labelled group header rows with counts
- **Column visibility toggles:** TX ID, Date/Time, Status, Categories, Items, Products, Subtotal, Tax, Total — toggle each on/off
- **Expand rows:** click ▶ to see all line items, unit prices, tax rates, and the full tax breakdown
- **Summary footer row:** running Subtotal / Tax / Total across all filtered records
- **Status badges:** `Active` (green), `Archived` (grey), `Test` (yellow)
- **Sort:** Newest/Oldest, Highest/Lowest total, Most items, Highest tax
- **Page size:** 15 / 25 / 50 / 100 / All
- **Pagination:** numbered window buttons with Prev / Next
- **Export:** CSV and JSON of the current filtered result set

### Sales Analytics (`analytics.html`)

- KPI strip: transactions, revenue, total tax, avg order value, items sold
- Bar charts: revenue by category · top 8 products · tax by rate
- Filterable by date range, category, minimum total, status (active/archived), and free-text search
- Sortable, paginated transaction list with expandable line-item detail
- **Clear Data** button (password-protected: `QWERTZ`) — moves active
  transactions to `transactions/backup/<timestamp>/` rather than deleting them
- Export all visible transactions as a single JSON file

### Item Analytics (`analytics-items.html`)

- KPI strip: unique products, units sold, item revenue, item tax, best seller,
  avg units per transaction
- Bar charts: top 10 by quantity · top 10 by revenue · revenue & qty by category
- Filterable by date range, category, min quantity, min revenue
- Item table with rank badges, inline revenue progress bar, first/last sale dates
- Export filtered item list as CSV

### Time Analytics (`analytics-time.html`)

- KPI strip: transactions, peak time slot, peak hour, busiest day of week,
  avg revenue/tx, total revenue
- Group by: **Time Slot** · **Hour of Day** · **Day of Week** · **Calendar Day**
- Bar charts: transactions by current grouping · revenue by time slot ·
  top item per time slot
- Detail table: tx count, items sold, revenue, tax, avg/tx, top seller,
  revenue share bar
- Export current view as CSV

### Period Analytics (`analytics-period.html`)

- Period selector tabs: **Daily · Weekly · Monthly · Yearly**
- KPI strip: periods, total revenue (with half-over-half trend ▲/▼), transactions,
  best period, avg revenue/period, total tax
- SVG sparkline charts: revenue trend + transaction count trend across all periods
- Bar charts: revenue by period (last 15) · top category per period ·
  period-over-period comparison (current vs previous same-length window)
- Detail table: chronological with period-over-period % change badge, top
  category pill, top product, revenue share bar — sortable and searchable
- Default date range auto-set to the full span of available data
- Export current period view as CSV

> **Recommended test data:** enable `testing-period` in `configuration/sources.json`
> to see all four period views populated across 3 years of data.

#### Time slot definitions

| Slot | Hours |
|---|---|
| 🌅 Morning | 06:00 – 11:00 |
| 🍽 Lunch | 11:00 – 14:00 |
| ☀ Afternoon | 14:00 – 17:00 |
| 🌆 Evening | 17:00 – 21:00 |
| 🌙 Night | 21:00 – 00:00 |
| 🌃 Late Night | 00:00 – 06:00 |

---

## Themes

A theme switcher dropdown appears in the header of every page. The selected
theme is stored in `localStorage` (`pos_theme`) and syncs instantly across all
open tabs.

| Theme | ID | Character |
|---|---|---|
| ☀ Default | `default` | Clean white/grey, blue accents |
| 🌙 Dark | `dark` | Deep slate, violet accents, glowing KPI values |
| 📟 Retro | `retro` | Black background, amber monospace, CRT scanline overlay |
| 🔷 SAP Horizon | `horizon` | SAP Fiori Morning Horizon tokens, SAP 72 web font |
| 🖥 SAP GUI | `sapgui` | Classic SAP R/3 desktop — flat grey, bevelled borders, navy toolbar |

Theme CSS files live in `css/theme-<id>.css`. To add a new theme, create
`css/theme-<id>.css` following the same class structure and register it in
`css/theme-switcher.js`:

```js
var THEMES = [
    ...
    { id: "mytheme", label: "🎨 My Theme" }
];
```

---

## Test Data Generators

### Short-range data — Time & Sales analytics (90 days)

`generate-test-transactions.js` creates 500 transactions in `transactions/testing-time/`.

```bash
node generate-test-transactions.js
```

| Property | Detail |
|---|---|
| Count | 500 transactions |
| Date range | Last 90 days |
| Output folder | `transactions/testing-time/` |
| Hour distribution | Weighted — busy 08:00–14:00, quiet overnight |
| Day-of-week bias | Mon–Fri busier, Sunday slowest |
| Items per transaction | 1–6 (weighted toward 2–3) |
| Quantity per item | 1–3 (weighted toward 1) |
| Product popularity | Long-tail — coffee and food items most common |

Toggle with `testing-time.enabled` in `configuration/sources.json`.

### Long-range data — Period analytics (3 years)

`generate-period-test-data.js` creates 2 000 transactions across 3 years in
`transactions/testing-period/`.

```bash
node generate-period-test-data.js
```

| Property | Detail |
|---|---|
| Count | 2 000 transactions |
| Date range | 3 years back from today |
| Output folder | `transactions/testing-period/` |
| Monthly seasonality | Dec/Nov/Aug peaks; Jan/Feb slowest |
| Yearly growth | ~15 % more transactions per year; ~5 % price inflation per year |
| Holiday quiet weeks | Random closures simulated in December and June |
| Day-of-week bias | Mon–Fri busier, weekend slower |
| Hour distribution | Weighted — morning/lunch peaks |

Toggle with `testing-period.enabled` in `configuration/sources.json`.

Both `transactions/testing-time/` and `transactions/testing-period/` are git-ignored.
Re-run either script at any time to regenerate.

---

## Server Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Serves `index.html` |
| `GET` | `/configuration/catalog.json` | Catalog config (products & categories) |
| `GET` | `/configuration/sources.json` | Transaction source toggles (`active`, `testing-time`, `testing-period`, `backup`) |
| `GET` | `/transactions` | Returns all enabled transactions as a JSON array |
| `POST` | `/save-transaction` | Writes `transactions/transaction_<id>.json` |
| `POST` | `/save-receipt` | Writes `transactions/receipts/receipt_<id>.html` |
| `DELETE` | `/transactions` | Moves all active `*.json` files to a timestamped backup folder |
| `GET` | `/*` | Static file handler for all other assets |
