/**
 * Product catalog, category, and tax-rate definitions.
 *
 * CATEGORIES – master list of product categories.  Each entry defines the
 *              category name and the tax rate that applies to every product in
 *              it.  Add, remove, or rename entries here to configure the
 *              catalog without touching any other file.
 *
 * PRODUCTS   – master product list.  The `taxRate` of each product is derived
 *              automatically from its category — no manual per-product tax field
 *              is needed.  To add a product simply append an object with
 *              { id, name, category, price }; the loader resolves the rate.
 */
sap.ui.define([], function () {
    "use strict";

    /* ── Category registry (name + tax rate) ──────────────────────────────── */
    var CATEGORIES = [
        { name: "Beverages", taxRate: 0.10 },  // 10 %
        { name: "Bakery",    taxRate: 0.07 },  //  7 %
        { name: "Food",      taxRate: 0.19 },  // 19 %
        { name: "Desserts",  taxRate: 0.19 },   // 19 %
        { name: "Tax1",  taxRate: 0.11 }   // 11 %
    ];

    /* ── Build a quick name→rate lookup ───────────────────────────────────── */
    var _catMap = {};
    CATEGORIES.forEach(function (c) { _catMap[c.name] = c.taxRate; });

    /* ── Product catalog ──────────────────────────────────────────────────── */
    // Products do NOT carry a hard-coded taxRate; it is resolved from CATEGORIES.
    var _rawProducts = [
        /* Beverages */
        { id: "P001", name: "Espresso",         category: "Beverages", price: 2.50 },
        { id: "P002", name: "Cappuccino",        category: "Beverages", price: 3.80 },
        { id: "P007", name: "Orange Juice",      category: "Beverages", price: 3.20 },
        { id: "P008", name: "Sparkling Water",   category: "Beverages", price: 1.80 },

        /* Bakery */
        { id: "P003", name: "Croissant",         category: "Bakery",    price: 2.20 },
        { id: "P004", name: "Blueberry Muffin",  category: "Bakery",    price: 2.90 },

        /* Food */
        { id: "P005", name: "Club Sandwich",     category: "Food",      price: 7.50 },
        { id: "P006", name: "Caesar Salad",      category: "Food",      price: 6.80 },

        /* Desserts */
        { id: "P009", name: "Chocolate Cake",    category: "Desserts",  price: 4.50 },
        { id: "P010", name: "Fruit Salad",       category: "Desserts",  price: 3.90 },
        { id: "P011", name: "Tiramisu",          category: "Desserts",  price: 4.20 },
        { id: "P012", name: "Cheesecake",        category: "Desserts",  price: 4.80 },
        { id: "P013", name: "Brownie",           category: "Desserts",  price: 3.50 },
        { id: "P014", name: "Panna Cotta",       category: "Desserts",  price: 4.10 },
        { id: "P015", name: "Waffle",            category: "Desserts",  price: 3.80 },
        { id: "P016", name: "Ice Cream",         category: "Desserts",  price: 3.20 },
        { id: "P017", name: "Crème Brûlée",      category: "Desserts",  price: 5.00 },
        { id: "P018", name: "Macarons (4 pcs)",  category: "Desserts",  price: 4.60 },
        { id: "P019", name: "Sorbet",            category: "Desserts",  price: 3.70 },
        { id: "P0209", name: "XXX",              category: "Tax1",  price: 3.99 }
    ];

    // Stamp taxRate onto every product from its category
    var PRODUCTS = _rawProducts.map(function (p) {
        return Object.assign({}, p, { taxRate: _catMap[p.category] !== undefined ? _catMap[p.category] : 0 });
    });

    return { CATEGORIES: CATEGORIES, PRODUCTS: PRODUCTS };
});
