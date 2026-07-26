# Point of Sale

A browser-based POS application built with SAPUI5 and plain HTML/JS.

## Running the app

The app requires the bundled Node.js server so that completed transactions are
written to disk under `./transactions/`.  Node.js itself is the only prerequisite
— no `npm install` needed.

```bash
node server.js
```

Then open **http://localhost:3000** in your browser.

## Transaction files

Every time **✓ Total** is pressed the transaction is:

| Action | Destination |
|--------|-------------|
| Saved as JSON on disk | `./transactions/transaction_<id>.json` |
| Persisted in browser  | `localStorage` key `pos_transactions` |

The JSON file name format is `transaction_YYYYMMDD_HHmmss.json`.

### Fallback (no server)

If `server.js` is not running (e.g. the page is opened directly via `file://`)
the app falls back to triggering a browser download to the Downloads folder.

## Analytics

Click **📊 Analytics** in the POS header to open `analytics.html`.  
It reads all stored transactions from `localStorage` and displays:

- KPI strip (revenue, tax, avg order, items sold)
- Bar charts: revenue by category, top products, tax by rate
- Filterable, sortable, paginated transaction list with line-item drill-down
- Export all transactions as a single JSON file
