/**
 * generate-test-transactions.js
 *
 * Generates 500 realistic test transactions into ./transactions/testing-time/
 * Run with:  node generate-test-transactions.js
 *
 * Characteristics:
 *  • Spread over last 90 days
 *  • Realistic hour distribution (busy morning/lunch, quieter evening/night)
 *  • Realistic day-of-week bias (busier Mon–Fri, slower Sunday)
 *  • 1–6 items per transaction, quantity 1–3
 *  • Product popularity follows a long-tail distribution
 */
"use strict";

const fs   = require("fs");
const path = require("path");

/* ── Config ─────────────────────────────────────────────────────────────── */
const TX_COUNT  = 500;
const OUT_DIR   = path.join(__dirname, "transactions", "testing-time");
const DAYS_BACK = 90;   // spread transactions over last N days

/* ── Catalog (must match configuration/catalog.json) ───────────────────── */
const CATEGORIES = [
    { name: "Beverages", taxRate: 0.10 },
    { name: "Bakery",    taxRate: 0.07 },
    { name: "Food",      taxRate: 0.19 },
    { name: "Desserts",  taxRate: 0.19 },
    { name: "Tax1",      taxRate: 0.11 }
];
const catMap = {};
CATEGORIES.forEach(function (c) { catMap[c.name] = c.taxRate; });

const RAW_PRODUCTS = [
    { id: "P001",  name: "Espresso",         category: "Beverages", price: 2.50 },
    { id: "P002",  name: "Cappuccino",        category: "Beverages", price: 3.80 },
    { id: "P007",  name: "Orange Juice",      category: "Beverages", price: 3.20 },
    { id: "P008",  name: "Sparkling Water",   category: "Beverages", price: 1.80 },
    { id: "P003",  name: "Croissant",         category: "Bakery",    price: 2.20 },
    { id: "P004",  name: "Blueberry Muffin",  category: "Bakery",    price: 2.90 },
    { id: "P005",  name: "Club Sandwich",     category: "Food",      price: 7.50 },
    { id: "P006",  name: "Caesar Salad",      category: "Food",      price: 6.80 },
    { id: "P009",  name: "Chocolate Cake",    category: "Desserts",  price: 4.50 },
    { id: "P010",  name: "Fruit Salad",       category: "Desserts",  price: 3.90 },
    { id: "P011",  name: "Tiramisu",          category: "Desserts",  price: 4.20 },
    { id: "P012",  name: "Cheesecake",        category: "Desserts",  price: 4.80 },
    { id: "P013",  name: "Brownie",           category: "Desserts",  price: 3.50 },
    { id: "P014",  name: "Panna Cotta",       category: "Desserts",  price: 4.10 },
    { id: "P015",  name: "Waffle",            category: "Desserts",  price: 3.80 },
    { id: "P016",  name: "Ice Cream",         category: "Desserts",  price: 3.20 },
    { id: "P017",  name: "Creme Brulee",      category: "Desserts",  price: 5.00 },
    { id: "P018",  name: "Macarons (4 pcs)",  category: "Desserts",  price: 4.60 },
    { id: "P019",  name: "Sorbet",            category: "Desserts",  price: 3.70 },
    { id: "P0209", name: "YXCV",              category: "Tax1",      price: 3.99 }
];
const PRODUCTS = RAW_PRODUCTS.map(function (p) {
    return Object.assign({}, p, { taxRate: catMap[p.category] || 0 });
});

/* ── Weighted random helpers ────────────────────────────────────────────── */
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick from an array using weights (must be same length as arr).
 * Higher weight = more likely to be chosen.
 */
function weightedPick(arr, weights) {
    var total = weights.reduce(function (s, w) { return s + w; }, 0);
    var r = Math.random() * total;
    for (var i = 0; i < arr.length; i++) {
        r -= weights[i];
        if (r <= 0) { return arr[i]; }
    }
    return arr[arr.length - 1];
}

/* ── Hour-of-day distribution ───────────────────────────────────────────── */
/* 24 weights, one per hour; higher = busier */
const HOUR_WEIGHTS = [
/*  0    1    2    3    4    5    6    7    8    9   10   11 */
    1,   0,   0,   0,   0,   1,   3,   8,  15,  20,  18,  25,
/* 12   13   14   15   16   17   18   19   20   21   22   23 */
   28,  22,  16,  12,  10,  14,  18,  15,  10,   6,   4,   2
];
const HOURS = Array.from({ length: 24 }, function (_, i) { return i; });

/* ── Day-of-week distribution ───────────────────────────────────────────── */
/* 0=Sun … 6=Sat; weekdays busy, Sunday slowest */
const DOW_WEIGHTS = [5, 14, 16, 16, 15, 14, 10];

/* ── Product popularity (long-tail) ─────────────────────────────────────── */
/* Beverages and popular desserts picked most often */
const PRODUCT_WEIGHTS = [
    20, 16, 10,  8,   /* Beverages */
    12,  8,             /* Bakery */
    14, 10,             /* Food */
     9,  7, 10,  6,  12,  5,  8,  7,  4,  6,  5,   /* Desserts */
     3                  /* Tax1 */
];

/* ── Date helpers ───────────────────────────────────────────────────────── */
function pad(n) { return String(n).padStart(2, "0"); }

function randomTimestamp(daysBack) {
    /* pick a day-of-week-weighted day within the last daysBack days */
    var now    = Date.now();
    var dayMs  = 24 * 60 * 60 * 1000;

    /* try up to 20 times to land on a well-weighted weekday */
    var date;
    for (var attempt = 0; attempt < 20; attempt++) {
        var offsetDays = rand(0, daysBack - 1);
        var candidate  = new Date(now - offsetDays * dayMs);
        var dow        = candidate.getDay();
        if (Math.random() < DOW_WEIGHTS[dow] / 16) {
            date = candidate;
            break;
        }
    }
    if (!date) { date = new Date(now - rand(0, daysBack - 1) * dayMs); }

    /* pick hour weighted by busyness */
    var hour   = weightedPick(HOURS, HOUR_WEIGHTS);
    var minute = rand(0, 59);
    var second = rand(0, 59);

    date.setHours(hour, minute, second, 0);
    return date;
}

function txId(date) {
    return date.getFullYear() + "" +
           pad(date.getMonth() + 1) + "" +
           pad(date.getDate()) + "_" +
           pad(date.getHours()) + "" +
           pad(date.getMinutes()) + "" +
           pad(date.getSeconds());
}

/* ── Transaction builder ────────────────────────────────────────────────── */
function buildTransaction(date) {
    /* 1–6 distinct products per transaction */
    var itemCount = weightedPick([1,2,3,4,5,6], [20,30,22,14,8,6]);
    var chosen    = [];
    var attempts  = 0;
    while (chosen.length < itemCount && attempts < 60) {
        attempts++;
        var p = weightedPick(PRODUCTS, PRODUCT_WEIGHTS);
        if (!chosen.find(function (c) { return c.id === p.id; })) {
            chosen.push(p);
        }
    }

    var items = chosen.map(function (p) {
        var qty      = weightedPick([1,2,3], [60,28,12]);
        var subtotal = +(p.price * qty).toFixed(4);
        var taxAmt   = +(subtotal * p.taxRate).toFixed(4);
        return {
            id:        p.id,
            name:      p.name,
            category:  p.category,
            price:     p.price,
            taxRate:   p.taxRate,
            quantity:  qty,
            subtotal:  subtotal,
            taxAmount: taxAmt
        };
    });

    /* per-category tax breakdown */
    var taxBuckets = {};
    items.forEach(function (i) {
        var key = i.category;
        if (!taxBuckets[key]) { taxBuckets[key] = { category: key, rate: i.taxRate, base: 0 }; }
        taxBuckets[key].base += i.subtotal;
    });
    var taxBreakdown = Object.keys(taxBuckets)
        .sort(function (a, b) { return taxBuckets[b].rate - taxBuckets[a].rate || a.localeCompare(b); })
        .map(function (k) {
            var b    = taxBuckets[k];
            var amt  = +(b.base * b.rate).toFixed(4);
            var pct  = Math.round(b.rate * 100);
            return { label: "Tax " + b.category + " (" + pct + "%)", amount: amt };
        });

    var subtotal = +items.reduce(function (s, i) { return s + i.subtotal; }, 0).toFixed(4);
    var totalTax = +taxBreakdown.reduce(function (s, b) { return s + b.amount; }, 0).toFixed(4);
    var total    = +(subtotal + totalTax).toFixed(4);

    return {
        id:           txId(date),
        timestamp:    date.toISOString(),
        items:        items,
        subtotal:     subtotal,
        taxBreakdown: taxBreakdown,
        totalTax:     totalTax,
        total:        total,
        _archived:    false,
        _backupFolder: null
    };
}

/* ── Main ───────────────────────────────────────────────────────────────── */
if (!fs.existsSync(OUT_DIR)) { fs.mkdirSync(OUT_DIR, { recursive: true }); }

/* generate TX_COUNT transactions with unique IDs */
var seen = {};
var count = 0;
var skipped = 0;

while (count < TX_COUNT) {
    var date = randomTimestamp(DAYS_BACK);
    var id   = txId(date);

    /* avoid exact-second collisions — nudge by 1s */
    while (seen[id]) {
        date.setSeconds(date.getSeconds() + 1);
        id = txId(date);
        skipped++;
        if (skipped > 10000) { break; }   /* safety valve */
    }
    seen[id] = true;

    var tx   = buildTransaction(date);
    var file = path.join(OUT_DIR, "transaction_" + id + ".json");
    fs.writeFileSync(file, JSON.stringify(tx, null, 2), "utf8");
    count++;

    if (count % 100 === 0) {
        process.stdout.write("  Generated " + count + " / " + TX_COUNT + "\r");
    }
}

console.log("\nDone! " + TX_COUNT + " transactions written to: " + OUT_DIR);
