/**
 * generate-period-test-data.js
 *
 * Generates ~2000 transactions spread across 3 years into
 * ./transactions/testing-period/ to stress-test the Period Analytics page.
 *
 * Patterns built in:
 *  • Monthly seasonality  — Dec/Nov/Aug peaks, Jan/Feb slow
 *  • Yearly growth        — ~15 % revenue growth per year
 *  • Weekly rhythm        — Mon–Fri busier, weekend slower
 *  • Hourly distribution  — morning/lunch peaks
 *  • Random quiet weeks   — simulate holidays / closures
 *
 * Run with:  node generate-period-test-data.js
 */
"use strict";

const fs   = require("fs");
const path = require("path");

/* ── Config ──────────────────────────────────────────────────────────────── */
const TX_COUNT  = 2000;
const OUT_DIR   = path.join(__dirname, "transactions", "testing-period");
const YEARS     = 3;

/* ── Catalog ─────────────────────────────────────────────────────────────── */
const CATEGORIES = [
    { name: "Beverages", taxRate: 0.10 },
    { name: "Bakery",    taxRate: 0.07 },
    { name: "Food",      taxRate: 0.19 },
    { name: "Desserts",  taxRate: 0.19 },
    { name: "Tax1",      taxRate: 0.11 }
];
const catMap = {};
CATEGORIES.forEach(function(c){ catMap[c.name] = c.taxRate; });

const RAW_PRODUCTS = [
    { id:"P001",  name:"Espresso",         category:"Beverages", price:2.50 },
    { id:"P002",  name:"Cappuccino",        category:"Beverages", price:3.80 },
    { id:"P007",  name:"Orange Juice",      category:"Beverages", price:3.20 },
    { id:"P008",  name:"Sparkling Water",   category:"Beverages", price:1.80 },
    { id:"P003",  name:"Croissant",         category:"Bakery",    price:2.20 },
    { id:"P004",  name:"Blueberry Muffin",  category:"Bakery",    price:2.90 },
    { id:"P005",  name:"Club Sandwich",     category:"Food",      price:7.50 },
    { id:"P006",  name:"Caesar Salad",      category:"Food",      price:6.80 },
    { id:"P009",  name:"Chocolate Cake",    category:"Desserts",  price:4.50 },
    { id:"P010",  name:"Fruit Salad",       category:"Desserts",  price:3.90 },
    { id:"P011",  name:"Tiramisu",          category:"Desserts",  price:4.20 },
    { id:"P012",  name:"Cheesecake",        category:"Desserts",  price:4.80 },
    { id:"P013",  name:"Brownie",           category:"Desserts",  price:3.50 },
    { id:"P014",  name:"Panna Cotta",       category:"Desserts",  price:4.10 },
    { id:"P015",  name:"Waffle",            category:"Desserts",  price:3.80 },
    { id:"P016",  name:"Ice Cream",         category:"Desserts",  price:3.20 },
    { id:"P017",  name:"Creme Brulee",      category:"Desserts",  price:5.00 },
    { id:"P018",  name:"Macarons (4 pcs)",  category:"Desserts",  price:4.60 },
    { id:"P019",  name:"Sorbet",            category:"Desserts",  price:3.70 },
    { id:"P0209", name:"YXCV",              category:"Tax1",      price:3.99 }
];
const PRODUCTS = RAW_PRODUCTS.map(function(p){
    return Object.assign({}, p, { taxRate: catMap[p.category]||0 });
});

/* ── Weighted random helpers ────────────────────────────────────────────── */
function rand(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }
function weightedPick(arr, weights){
    var total = weights.reduce(function(s,w){ return s+w; },0);
    var r = Math.random()*total;
    for (var i=0;i<arr.length;i++){ r-=weights[i]; if(r<=0){ return arr[i]; } }
    return arr[arr.length-1];
}

/* ── Monthly seasonality weights (Jan=0 … Dec=11) ─────────────────────── */
const MONTH_WEIGHTS = [
/*  Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec */
     6,   5,   9,  10,  11,  10,  10,  14,  11,  12,  13,  16
];

/* ── Day-of-week weights (0=Sun … 6=Sat) ───────────────────────────────── */
const DOW_WEIGHTS = [4, 14, 16, 16, 15, 13, 8];

/* ── Hour weights ───────────────────────────────────────────────────────── */
const HOUR_WEIGHTS = [
     1,  0,  0,  0,  0,  1,  3,  8, 15, 20, 18, 25,
    28, 22, 16, 12, 10, 14, 18, 15, 10,  6,  4,  2
];
const HOURS = Array.from({length:24}, function(_,i){ return i; });

/* ── Product popularity ─────────────────────────────────────────────────── */
const PRODUCT_WEIGHTS = [
    20, 16, 10,  8,
    12,  8,
    14, 10,
     9,  7, 10,  6, 12,  5,  8,  7,  4,  6,  5,
     3
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function pad(n){ return String(n).padStart(2,"0"); }
function txId(d){
    return d.getFullYear()+""+pad(d.getMonth()+1)+""+pad(d.getDate())+
           "_"+pad(d.getHours())+""+pad(d.getMinutes())+""+pad(d.getSeconds());
}

/* ── Date generator ─────────────────────────────────────────────────────── */
function randomDate(yearOffset, growthFactor) {
    /* Pick month weighted by seasonality */
    var months  = Array.from({length:12}, function(_,i){ return i; });
    var month   = weightedPick(months, MONTH_WEIGHTS);

    /* Year: spread evenly across YEARS from (today - YEARS) to today */
    var now      = new Date();
    var baseYear = now.getFullYear() - YEARS + yearOffset;
    var maxDay   = new Date(baseYear, month+1, 0).getDate();
    var day      = rand(1, maxDay);

    var candidate = new Date(baseYear, month, day);

    /* reject some days based on weekday weight */
    var dow = candidate.getDay();
    if (Math.random() > DOW_WEIGHTS[dow]/16) {
        /* retry once */
        day       = rand(1, maxDay);
        candidate = new Date(baseYear, month, day);
    }

    /* random quiet week (~8% chance, simulates holiday closure) */
    var weekNum = Math.floor(candidate.getDate()/7);
    if (weekNum === 1 && [6, 11].indexOf(month) !== -1 && Math.random() < 0.08) {
        /* skip this transaction — return null */
        return null;
    }

    var hour   = weightedPick(HOURS, HOUR_WEIGHTS);
    var minute = rand(0, 59);
    var second = rand(0, 59);
    candidate.setHours(hour, minute, second, 0);
    return candidate;
}

/* ── Transaction builder ────────────────────────────────────────────────── */
function buildTransaction(date, growthFactor) {
    var itemCount = weightedPick([1,2,3,4,5,6], [20,30,22,14,8,6]);
    var chosen = [];
    var attempts = 0;
    while (chosen.length < itemCount && attempts < 60) {
        attempts++;
        var p = weightedPick(PRODUCTS, PRODUCT_WEIGHTS);
        if (!chosen.find(function(c){ return c.id===p.id; })) { chosen.push(p); }
    }

    var items = chosen.map(function(p) {
        var qty      = weightedPick([1,2,3], [60,28,12]);
        /* apply a slight price growth factor per year (simulates inflation) */
        var price    = +(p.price * growthFactor).toFixed(2);
        var subtotal = +(price * qty).toFixed(4);
        var taxAmt   = +(subtotal * p.taxRate).toFixed(4);
        return { id:p.id, name:p.name, category:p.category,
                 price:price, taxRate:p.taxRate,
                 quantity:qty, subtotal:subtotal, taxAmount:taxAmt };
    });

    var taxBuckets = {};
    items.forEach(function(i){
        var key = i.category;
        if (!taxBuckets[key]){ taxBuckets[key]={ category:key, rate:i.taxRate, base:0 }; }
        taxBuckets[key].base += i.subtotal;
    });
    var taxBreakdown = Object.keys(taxBuckets)
        .sort(function(a,b){ return taxBuckets[b].rate-taxBuckets[a].rate||a.localeCompare(b); })
        .map(function(k){
            var b=taxBuckets[k];
            var amt=+(b.base*b.rate).toFixed(4);
            return { label:"Tax "+b.category+" ("+Math.round(b.rate*100)+"%)", amount:amt };
        });

    var subtotal = +items.reduce(function(s,i){ return s+i.subtotal; },0).toFixed(4);
    var totalTax = +taxBreakdown.reduce(function(s,b){ return s+b.amount; },0).toFixed(4);
    var total    = +(subtotal+totalTax).toFixed(4);

    return { id:txId(date), timestamp:date.toISOString(),
             items:items, subtotal:subtotal,
             taxBreakdown:taxBreakdown, totalTax:totalTax, total:total,
             _archived:false, _backupFolder:null, _testing:true };
}

/* ── Main ────────────────────────────────────────────────────────────────── */
if (!fs.existsSync(OUT_DIR)){ fs.mkdirSync(OUT_DIR, { recursive:true }); }

var seen  = {};
var count = 0;
var skipped = 0;
var txPerYear = Math.ceil(TX_COUNT / YEARS);

for (var y = 0; y < YEARS; y++) {
    /* 15% growth per year in transaction volume and price */
    var growthFactor = Math.pow(1.05, y);   /* price inflation */
    var volumeFactor = Math.pow(1.15, y);   /* more transactions in later years */
    var yearTarget   = Math.round(txPerYear * volumeFactor / YEARS);
    if (y === YEARS-1) { yearTarget = TX_COUNT - count; } /* fill remainder */

    var yCount = 0;
    while (yCount < yearTarget && (count+yCount) < TX_COUNT*2) {
        var date = randomDate(y, growthFactor);
        if (!date) { continue; }

        var id = txId(date);
        while (seen[id]) {
            date.setSeconds(date.getSeconds()+1);
            id = txId(date);
            skipped++;
            if (skipped > 20000) { break; }
        }
        seen[id] = true;

        var tx   = buildTransaction(date, growthFactor);
        var file = path.join(OUT_DIR, "transaction_"+id+".json");
        fs.writeFileSync(file, JSON.stringify(tx, null, 2), "utf8");
        yCount++;
        count++;
        if (count % 200 === 0){
            process.stdout.write("  Generated "+count+" / "+TX_COUNT+"\r");
        }
        if (count >= TX_COUNT) { break; }
    }
    if (count >= TX_COUNT) { break; }
}

console.log("\nDone! "+count+" transactions written to: "+OUT_DIR);
console.log("Date range: "+(YEARS)+" years");
