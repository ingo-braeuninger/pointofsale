/**
 * theme-switcher.js — shared across index.html, analytics.html, analytics-items.html
 *
 * • Reads the saved theme from localStorage (key: "pos_theme")
 * • Injects a <link id="pos-theme-css"> that loads the correct CSS file
 * • Renders a small <select> inside any element with class "theme-switcher"
 * • Syncs the choice across tabs via the storage event
 */
(function () {
    "use strict";

    var STORAGE_KEY = "pos_theme";
    var THEMES = [
        { id: "default",   label: "☀ Default"    },
        { id: "dark",      label: "🌙 Dark"       },
        { id: "retro",     label: "📟 Retro"      },
        { id: "horizon",   label: "🔷 SAP Horizon" },
        { id: "sapgui",    label: "🖥 SAP GUI"    },
        { id: "bootstrap", label: "🅱 Bootstrap"  },
        { id: "yaml4",     label: "📐 YAML4"      }
    ];

    /* resolve path to css/ relative to the current page */
    function cssHref(themeId) {
        /* works whether the page is at root or in a sub-folder */
        var base = (function () {
            var scripts = document.querySelectorAll("script[src]");
            for (var i = 0; i < scripts.length; i++) {
                var src = scripts[i].getAttribute("src");
                if (src && src.indexOf("theme-switcher.js") !== -1) {
                    /* src is e.g. "css/theme-switcher.js" → base is "" */
                    return src.replace(/css\/theme-switcher\.js.*$/, "");
                }
            }
            return "";
        }());
        return base + "css/theme-" + themeId + ".css";
    }

    function currentTheme() {
        var saved = localStorage.getItem(STORAGE_KEY);
        return THEMES.some(function (t) { return t.id === saved; }) ? saved : "default";
    }

    function applyTheme(themeId) {
        var link = document.getElementById("pos-theme-css");
        if (!link) {
            link = document.createElement("link");
            link.rel  = "stylesheet";
            link.id   = "pos-theme-css";
            /* insert after all existing <link> and <style> tags so it wins specificity */
            document.head.appendChild(link);
        }
        link.href = cssHref(themeId);
        localStorage.setItem(STORAGE_KEY, themeId);

        /* keep all selects in sync (e.g. multiple switcher widgets) */
        document.querySelectorAll(".theme-switcher select").forEach(function (sel) {
            sel.value = themeId;
        });
    }

    function buildSwitcher(container) {
        var sel = document.createElement("select");
        sel.title = "Switch theme";
        THEMES.forEach(function (t) {
            var opt = document.createElement("option");
            opt.value       = t.id;
            opt.textContent = t.label;
            sel.appendChild(opt);
        });
        sel.value = currentTheme();
        sel.addEventListener("change", function () {
            applyTheme(sel.value);
        });
        container.appendChild(sel);
    }

    /* ── Init: apply saved theme immediately, then build widgets ── */
    function init() {
        applyTheme(currentTheme());

        document.querySelectorAll(".theme-switcher").forEach(buildSwitcher);

        /* sync across browser tabs */
        window.addEventListener("storage", function (e) {
            if (e.key === STORAGE_KEY && e.newValue) {
                applyTheme(e.newValue);
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}());
