/**
 * Product catalog loader.
 *
 * Reads categories and products from configuration/catalog.json at runtime.
 * Products do NOT carry a taxRate in the JSON — it is resolved automatically
 * from the matching category entry.
 *
 * This module returns a Promise that resolves to { CATEGORIES, PRODUCTS }.
 * Consumers must handle it asynchronously (see index.html).
 */
sap.ui.define([], function () {
    "use strict";

    /**
     * Fetch the catalog JSON, stamp taxRate onto every product, and resolve.
     * Falls back to empty arrays if the file cannot be loaded.
     */
    var catalogPromise = fetch("configuration/catalog.json")
        .then(function (res) {
            if (!res.ok) { throw new Error("HTTP " + res.status); }
            return res.json();
        })
        .then(function (data) {
            var CATEGORIES = data.categories || [];

            /* Build a quick name → rate lookup */
            var catMap = {};
            CATEGORIES.forEach(function (c) { catMap[c.name] = c.taxRate; });

            /* Stamp taxRate onto every product from its category */
            var PRODUCTS = (data.products || []).map(function (p) {
                return Object.assign({}, p, {
                    taxRate: catMap[p.category] !== undefined ? catMap[p.category] : 0
                });
            });

            return { CATEGORIES: CATEGORIES, PRODUCTS: PRODUCTS };
        })
        .catch(function (err) {
            console.error("Failed to load configuration/catalog.json:", err.message);
            return { CATEGORIES: [], PRODUCTS: [] };
        });

    return catalogPromise;
});
