/**
 * Minimal POS local server — no npm dependencies.
 * Runs with:  node server.js
 * Opens at:  http://localhost:3000
 *
 * Routes
 *   GET  /configuration/catalog.json  → served as a static file (edit to reconfigure)
 *   GET  /transactions                → return all transaction JSON files as an array
 *   POST /save-transaction            → write body as ./transactions/<id>.json
 *   DELETE /transactions              → delete all transaction JSON files
 *   GET  /*                           → serve all other static files
 */
"use strict";

const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT      = 3000;
const ROOT      = __dirname;
const TX_DIR    = path.join(ROOT, "transactions");

/* ensure ./transactions/ exists */
if (!fs.existsSync(TX_DIR)) { fs.mkdirSync(TX_DIR); }

/* ── MIME map ──────────────────────────────────────────────────── */
const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".xml":  "application/xml; charset=utf-8",
    ".png":  "image/png",
    ".ico":  "image/x-icon"
};

/* ── Collect request body ──────────────────────────────────────── */
function readBody(req) {
    return new Promise(function (resolve, reject) {
        var chunks = [];
        req.on("data", function (c) { chunks.push(c); });
        req.on("end",  function ()  { resolve(Buffer.concat(chunks).toString("utf8")); });
        req.on("error", reject);
    });
}

/* ── Server ────────────────────────────────────────────────────── */
const server = http.createServer(async function (req, res) {

    /* CORS pre-flight (needed when page is opened via file://) */
    res.setHeader("Access-Control-Allow-Origin",  "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    /* ── GET /transactions ─────────────────────────────────────── */
    if (req.method === "GET" && req.url === "/transactions") {
        try {
            var txList = [];

            /* 1. active transactions in TX_DIR root */
            fs.readdirSync(TX_DIR)
                .filter(function (f) { return f.endsWith(".json"); })
                .sort()
                .forEach(function (f) {
                    var tx = JSON.parse(fs.readFileSync(path.join(TX_DIR, f), "utf8"));
                    tx._archived   = false;
                    tx._backupFolder = null;
                    txList.push(tx);
                });

            /* 2. archived transactions inside backup sub-folders */
            var backupRoot = path.join(TX_DIR, "backup");
            if (fs.existsSync(backupRoot)) {
                fs.readdirSync(backupRoot)
                    .filter(function (d) {
                        return fs.statSync(path.join(backupRoot, d)).isDirectory();
                    })
                    .sort()
                    .forEach(function (folder) {
                        var folderPath = path.join(backupRoot, folder);
                        fs.readdirSync(folderPath)
                            .filter(function (f) { return f.endsWith(".json"); })
                            .sort()
                            .forEach(function (f) {
                                var tx = JSON.parse(fs.readFileSync(path.join(folderPath, f), "utf8"));
                                tx._archived     = true;
                                tx._backupFolder = "transactions/backup/" + folder;
                                txList.push(tx);
                            });
                    });
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(txList));
        } catch (err) {
            console.error("GET /transactions error:", err.message);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: err.message }));
        }
        return;
    }

    /* ── DELETE /transactions — moves files to ./transactions/backup/<timestamp>/ */
    if (req.method === "DELETE" && req.url === "/transactions") {
        try {
            var files = fs.readdirSync(TX_DIR).filter(function (f) { return f.endsWith(".json"); });
            if (files.length === 0) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: true, moved: 0, backupDir: null }));
                return;
            }

            /* create a timestamped backup sub-folder */
            var now    = new Date();
            var pad    = function (n) { return String(n).padStart(2, "0"); };
            var stamp  = now.getFullYear() + "" +
                         pad(now.getMonth() + 1) + "" +
                         pad(now.getDate()) + "_" +
                         pad(now.getHours()) + "" +
                         pad(now.getMinutes()) + "" +
                         pad(now.getSeconds());
            var backupDir = path.join(TX_DIR, "backup", stamp);
            fs.mkdirSync(backupDir, { recursive: true });

            files.forEach(function (f) {
                fs.renameSync(path.join(TX_DIR, f), path.join(backupDir, f));
            });

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                ok: true,
                moved: files.length,
                backupDir: "transactions/backup/" + stamp
            }));
        } catch (err) {
            console.error("DELETE /transactions error:", err.message);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: err.message }));
        }
        return;
    }

    /* ── POST /save-transaction ────────────────────────────────── */
    if (req.method === "POST" && req.url === "/save-transaction") {
        try {
            var body = await readBody(req);
            var tx   = JSON.parse(body);

            /* sanitise id — allow only alphanum, dash, underscore */
            var safeId = String(tx.id || "unknown").replace(/[^a-zA-Z0-9_\-]/g, "_");
            var file   = path.join(TX_DIR, "transaction_" + safeId + ".json");

            fs.writeFileSync(file, JSON.stringify(tx, null, 2), "utf8");

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, file: "transactions/transaction_" + safeId + ".json" }));
        } catch (err) {
            console.error("save-transaction error:", err.message);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: err.message }));
        }
        return;
    }

    /* ── Static file serving ───────────────────────────────────── */
    var urlPath = req.url.split("?")[0];
    if (urlPath === "/" || urlPath === "") { urlPath = "/index.html"; }

    var filePath = path.join(ROOT, urlPath);
    /* security: stay inside ROOT */
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403); res.end("Forbidden"); return;
    }

    fs.readFile(filePath, function (err, data) {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not found: " + urlPath);
            return;
        }
        var ext  = path.extname(filePath).toLowerCase();
        var mime = MIME[ext] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": mime });
        res.end(data);
    });
});

server.listen(PORT, "127.0.0.1", function () {
    console.log("POS server running → http://localhost:" + PORT);
    console.log("Transactions saved to → " + TX_DIR);
});
