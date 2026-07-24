sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "pos/model/products"
], function (Controller, JSONModel, MessageToast, MessageBox, ProductCatalog) {
    "use strict";

    // Products and category/tax-rate definitions live in model/products.js.
    var PRODUCTS   = ProductCatalog.PRODUCTS;
    var CATEGORIES = ProductCatalog.CATEGORIES;

    return Controller.extend("pos.controller.App", {

        /* ── Lifecycle ────────────────────────────────────────────────── */
        onInit: function () {
            // Catalog model
            var oCatalogModel = new JSONModel({ products: PRODUCTS });
            this.getView().setModel(oCatalogModel, "catalog");

            // Config model – categories with their tax rates (drives the tile subheader tax badge)
            var oConfigModel = new JSONModel({ categories: CATEGORIES });
            this.getView().setModel(oConfigModel, "config");

            // Cart model
            this._resetCartModel();
        },

        /* ── Helpers ──────────────────────────────────────────────────── */
        _resetCartModel: function () {
            var oCartModel = new JSONModel({
                items:        [],
                subtotal:     0,
                taxBreakdown: [],   // [ { label: "Tax 10% (Beverages)", amount: x }, … ]
                tax:          0,
                total:        0
            });
            this.getView().setModel(oCartModel, "cart");
        },

        _recalculate: function () {
            var oModel  = this.getView().getModel("cart");
            var aItems  = oModel.getProperty("/items");

            var fSubtotal = aItems.reduce(function (acc, item) {
                return acc + item.subtotal;
            }, 0);

            // Accumulate tax per category (each category has its own rate)
            var oTaxBuckets = {};   // { "Beverages": { category, rate, base }, … }
            aItems.forEach(function (item) {
                var sKey = item.category;
                if (!oTaxBuckets[sKey]) {
                    oTaxBuckets[sKey] = { category: item.category, rate: item.taxRate, base: 0 };
                }
                oTaxBuckets[sKey].base += item.subtotal;
            });

            // Build breakdown array sorted by rate descending, then category name
            var aTaxBreakdown = Object.keys(oTaxBuckets)
                .sort(function (a, b) {
                    var rDiff = oTaxBuckets[b].rate - oTaxBuckets[a].rate;
                    return rDiff !== 0 ? rDiff : a.localeCompare(b);
                })
                .map(function (sKey) {
                    var bucket = oTaxBuckets[sKey];
                    var fAmt   = bucket.base * bucket.rate;
                    var iPct   = Math.round(bucket.rate * 100);
                    return {
                        label:  "Tax " + bucket.category + " (" + iPct + "%)",
                        amount: fAmt
                    };
                });

            var fTax   = aTaxBreakdown.reduce(function (acc, b) { return acc + b.amount; }, 0);
            var fTotal = fSubtotal + fTax;

            oModel.setProperty("/subtotal",     fSubtotal);
            oModel.setProperty("/taxBreakdown", aTaxBreakdown);
            oModel.setProperty("/tax",          fTax);
            oModel.setProperty("/total",        fTotal);
        },

        formatCurrency: function (fValue) {
            if (fValue === undefined || fValue === null) { return "€0.00"; }
            return "€" + parseFloat(fValue).toFixed(2);
        },

        // Short alias used in XML view bindings: formatter='.fmt'
        fmt: function (fValue) { return this.formatCurrency(fValue); },

        // Used by ObjectNumber (number + unit="€"), returns just the numeric string
        formatNumber: function (fValue) {
            if (fValue === undefined || fValue === null) { return "0.00"; }
            return parseFloat(fValue).toFixed(2);
        },

        // Short alias used in XML view bindings: formatter='.fmtNum'
        fmtNum: function (fValue) { return this.formatNumber(fValue); },

        // Formats a tax rate (0–1) as a percentage string, e.g. 0.19 → "19%"
        formatTaxRate: function (fRate) {
            if (fRate === undefined || fRate === null) { return ""; }
            return Math.round(fRate * 100) + "%";
        },

        // Used on the product tile subheader: "Beverages · 10%"
        formatTileSubheader: function (sCategory, fRate) {
            if (!sCategory) { return ""; }
            if (fRate === undefined || fRate === null) { return sCategory; }
            return sCategory + " · " + Math.round(fRate * 100) + "%";
        },

        /* ── Product tile pressed ─────────────────────────────────────── */
        onProductPress: function (oEvent) {
            var oCtx     = oEvent.getSource().getBindingContext("catalog");
            var oProduct = oCtx.getObject();

            var oModel   = this.getView().getModel("cart");
            var aItems   = oModel.getProperty("/items");

            // Check if already in cart
            var oExisting = aItems.find(function (item) {
                return item.id === oProduct.id;
            });

            if (oExisting) {
                oExisting.quantity += 1;
                oExisting.subtotal  = oExisting.price * oExisting.quantity;
                oModel.setProperty("/items", aItems.slice()); // trigger binding refresh
            } else {
                aItems.push({
                    id:       oProduct.id,
                    name:     oProduct.name,
                    category: oProduct.category,
                    price:    oProduct.price,
                    taxRate:  oProduct.taxRate,
                    quantity: 1,
                    subtotal: oProduct.price
                });
                oModel.setProperty("/items", aItems);
            }

            this._recalculate();
            MessageToast.show(oProduct.name + " added to cart");
        },

        /* ── Quantity step-input changed ──────────────────────────────── */
        onQuantityChange: function (oEvent) {
            var oStepInput = oEvent.getSource();
            var iQty       = parseInt(oEvent.getParameter("value"), 10);
            var oCtx       = oStepInput.getBindingContext("cart");

            if (!oCtx) { return; }

            var sPath  = oCtx.getPath();          // e.g. /items/2
            var oModel = this.getView().getModel("cart");
            var oItem  = oModel.getProperty(sPath);

            oItem.quantity = iQty;
            oItem.subtotal = oItem.price * iQty;
            oModel.setProperty(sPath, oItem);

            this._recalculate();
        },

        /* ── Remove single item ───────────────────────────────────────── */
        onRemoveItem: function (oEvent) {
            var oBtn   = oEvent.getSource();
            var oCtx   = oBtn.getBindingContext("cart");
            var sPath  = oCtx.getPath();                    // /items/N
            var iIndex = parseInt(sPath.split("/").pop(), 10);

            var oModel = this.getView().getModel("cart");
            var aItems = oModel.getProperty("/items");

            aItems.splice(iIndex, 1);
            oModel.setProperty("/items", aItems);

            this._recalculate();
        },

        /* ── Clear cart ───────────────────────────────────────────────── */
        onClearCart: function () {
            var oModel = this.getView().getModel("cart");
            if (oModel.getProperty("/items").length === 0) { return; }

            MessageBox.confirm("Clear the entire cart?", {
                title: "Clear Cart",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this._resetCartModel();
                    }
                }.bind(this)
            });
        },

        /* ── Print receipt ────────────────────────────────────────────── */
        onPrintReceipt: function () {
            var oModel    = this.getView().getModel("cart");
            var aItems    = oModel.getProperty("/items");
            var fSubtotal = oModel.getProperty("/subtotal");
            var fTax      = oModel.getProperty("/tax");
            var fTotal    = oModel.getProperty("/total");

            if (aItems.length === 0) {
                MessageToast.show("Cart is empty");
                return;
            }

            var aTaxBreakdown = oModel.getProperty("/taxBreakdown");

            var sNow   = new Date().toLocaleString();
            var sLines = aItems.map(function (item) {
                var iTaxPct = Math.round((item.taxRate || 0) * 100);
                return "<tr>" +
                    "<td>" + item.name + "</td>" +
                    "<td style='text-align:center'>" + item.quantity + "</td>" +
                    "<td style='text-align:right'>€" + item.price.toFixed(2) + "</td>" +
                    "<td style='text-align:center'>" + iTaxPct + "%</td>" +
                    "<td style='text-align:right'>€" + item.subtotal.toFixed(2) + "</td>" +
                    "</tr>";
            }).join("");

            var sReceipt = [
                "<!DOCTYPE html><html><head>",
                "<meta charset='UTF-8'>",
                "<title>Receipt</title>",
                "<style>",
                "  body{font-family:monospace;font-size:13px;max-width:400px;margin:0 auto;padding:20px;}",
                "  h2{text-align:center;margin-bottom:4px;}",
                "  .sub{text-align:center;color:#666;margin-bottom:16px;}",
                "  table{width:100%;border-collapse:collapse;}",
                "  th{border-bottom:2px solid #000;padding:4px 2px;text-align:left;}",
                "  td{padding:4px 2px;border-bottom:1px dotted #ccc;}",
                "  .total-row td{border-top:2px solid #000;border-bottom:none;font-weight:bold;}",
                "  .tax-row td{border-bottom:none;color:#555;}",
                "  .thank-you{text-align:center;margin-top:24px;font-weight:bold;}",
                "</style></head><body>",
                "<h2>POINT OF SALE</h2>",
                "<div class='sub'>" + sNow + "</div>",
                "<table>",
                "<thead><tr><th>Item</th><th style='text-align:center'>Qty</th><th style='text-align:right'>Price</th><th style='text-align:center'>Tax</th><th style='text-align:right'>Total</th></tr></thead>",
                "<tbody>",
                sLines,
                "</tbody>",
                "<tfoot>",
                "<tr class='tax-row'><td colspan='4'>Subtotal</td><td style='text-align:right'>€" + fSubtotal.toFixed(2) + "</td></tr>",
                aTaxBreakdown.map(function (b) {
                    return "<tr class='tax-row'><td colspan='4'>" + b.label + "</td><td style='text-align:right'>€" + b.amount.toFixed(2) + "</td></tr>";
                }).join("\n"),
                "<tr class='total-row'><td colspan='4'>TOTAL</td><td style='text-align:right'>€" + fTotal.toFixed(2) + "</td></tr>",
                "</tfoot>",
                "</table>",
                "<div class='thank-you'>★ Thank you for your purchase! ★</div>",
                "</body></html>"
            ].join("\n");

            var oWin = window.open("", "_blank", "width=460,height=620");
            oWin.document.write(sReceipt);
            oWin.document.close();
            oWin.focus();
            // Short delay to allow rendering before print dialog
            setTimeout(function () {
                oWin.print();
            }, 400);
        }
    });
});
