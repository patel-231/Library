// server.js
import express from "express";
import http from "http";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import bodyParser from "body-parser";
import { Server as WSServer } from "ws";

const app = express();
app.use(bodyParser.json());

// open sqlite db file
let db;
async function initDb() {
  db = await open({
    filename: "./library.db",
    driver: sqlite3.Database
  });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS shelves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT,
      location TEXT
    );
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE NOT NULL,
      title TEXT,
      author TEXT,
      isbn TEXT,
      status TEXT NOT NULL DEFAULT 'on_shelf',
      shelf_id INTEGER,
      last_seen_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER,
      shelf_id INTEGER,
      event_type TEXT NOT NULL,
      actor TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      details TEXT
    );
  `);
}
await initDb();

// basic middleware: simple API key check for dev actions
const DEV_API_KEY = process.env.DEV_API_KEY || "dev-secret";
function requireDev(req, res, next) {
  const key = req.headers["x-api-key"];
  if (key === DEV_API_KEY) return next();
  return res.status(403).json({ error: "dev api key required" });
}

// WebSocket server for real-time notifications
const server = http.createServer(app);
const wss = new WSServer({ server });
function broadcastJSON(obj) {
  const msg = JSON.stringify(obj);
  wss.clients.forEach(c => {
    if (c.readyState === c.OPEN) c.send(msg);
  });
}

// API: public user endpoints
app.get("/api/books", async (req, res) => {
  // search query params: q (title/author/isbn), shelf
  const { q = "", shelf } = req.query;
  let sql = `SELECT b.*, s.code as shelf_code, s.name as shelf_name FROM books b LEFT JOIN shelves s ON b.shelf_id = s.id WHERE 1=1`;
  const params = [];
  if (q) {
    sql += ` AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR b.barcode LIKE ?)`;
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (shelf) {
    sql += ` AND s.code = ?`;
    params.push(shelf);
  }
  const rows = await db.all(sql, params);
  res.json(rows);
});

app.get("/api/book/:barcode", async (req, res) => {
  const { barcode } = req.params;
  const book = await db.get(`SELECT b.*, s.code as shelf_code FROM books b LEFT JOIN shelves s ON b.shelf_id = s.id WHERE b.barcode = ?`, [barcode]);
  if (!book) return res.status(404).json({ error: "not found" });
  res.json(book);
});

// API: sensor endpoint (trusted device)
app.post("/api/sensor/event", async (req, res) => {
  // payload: { barcode, shelf_code, action, actor }
  const { barcode, shelf_code, action, actor = "sensor" } = req.body;
  if (!barcode || !shelf_code || !action) return res.status(400).json({ error: "missing fields" });

  // ensure shelf exists
  let shelf = await db.get("SELECT * FROM shelves WHERE code = ?", [shelf_code]);
  if (!shelf) {
    const r = await db.run("INSERT INTO shelves (code, name) VALUES (?, ?)", [shelf_code, shelf_code]);
    shelf = { id: r.lastID, code: shelf_code };
  }

  // ensure book exists (if new add placeholder)
  let book = await db.get("SELECT * FROM books WHERE barcode = ?", [barcode]);
  if (!book) {
    const r = await db.run("INSERT INTO books (barcode, title, status, shelf_id, last_seen_at) VALUES (?, ?, ?, ?, datetime('now'))", [barcode, "Unknown Title", "on_shelf", shelf.id]);
    book = await db.get("SELECT * FROM books WHERE id = ?", [r.lastID]);
  }

  // determine event type & update book
  let event_type = action; // e.g., "placed" or "removed"
  if (action === "placed") {
    await db.run("UPDATE books SET shelf_id = ?, status = 'on_shelf', last_seen_at = datetime('now') WHERE id = ?", [shelf.id, book.id]);
  } else if (action === "removed") {
    await db.run("UPDATE books SET status = 'checked_out', shelf_id = NULL, last_seen_at = datetime('now') WHERE id = ?", [book.id]);
  } else if (action === "moved") {
    await db.run("UPDATE books SET shelf_id = ?, last_seen_at = datetime('now') WHERE id = ?", [shelf.id, book.id]);
  } // add more actions as needed

  await db.run("INSERT INTO events (book_id, shelf_id, event_type, actor, details) VALUES (?, ?, ?, ?, ?)", [book.id, shelf.id, event_type, actor, JSON.stringify(req.body)]);
  const event = await db.get("SELECT e.*, b.barcode, b.title FROM events e JOIN books b ON e.book_id = b.id WHERE e.id = last_insert_rowid()");
  broadcastJSON({ type: "event", event });
  res.json({ ok: true, event });
});

// Dev endpoints (protected)
app.post("/api/dev/books", requireDev, async (req, res) => {
  const { barcode, title, author, isbn, shelf_code } = req.body;
  let shelfId = null;
  if (shelf_code) {
    let s = await db.get("SELECT * FROM shelves WHERE code = ?", [shelf_code]);
    if (!s) {
      const r = await db.run("INSERT INTO shelves (code, name) VALUES (?, ?)", [shelf_code, shelf_code]);
      s = { id: r.lastID };
    }
    shelfId = s.id;
  }
  const r = await db.run("INSERT INTO books (barcode, title, author, isbn, shelf_id) VALUES (?, ?, ?, ?, ?)", [barcode, title, author, isbn, shelfId]);
  const book = await db.get("SELECT * FROM books WHERE id = ?", [r.lastID]);
  res.json(book);
});

app.delete("/api/dev/books/:barcode", requireDev, async (req, res) => {
  const { barcode } = req.params;
  await db.run("DELETE FROM books WHERE barcode = ?", [barcode]);
  res.json({ ok: true });
});

app.post("/api/dev/move", requireDev, async (req, res) => {
  const { barcode, shelf_code } = req.body;
  const book = await db.get("SELECT * FROM books WHERE barcode = ?", [barcode]);
  if (!book) return res.status(404).json({ error: "book not found" });
  let shelf = await db.get("SELECT * FROM shelves WHERE code = ?", [shelf_code]);
  if (!shelf) {
    const r = await db.run("INSERT INTO shelves (code, name) VALUES (?, ?)", [shelf_code, shelf_code]);
    shelf = { id: r.lastID, code: shelf_code };
  }
  await db.run("UPDATE books SET shelf_id = ?, status = 'on_shelf', last_seen_at = datetime('now') WHERE id = ?", [shelf.id, book.id]);
  await db.run("INSERT INTO events (book_id, shelf_id, event_type, actor) VALUES (?, ?, 'moved','dev')", [book.id, shelf.id]);
  const updated = await db.get("SELECT * FROM books WHERE id = ?", [book.id]);
  broadcastJSON({ type: "book_updated", book: updated });
  res.json({ ok: true, book: updated });
});

// small events list
app.get("/api/events", async (req, res) => {
  const events = await db.all("SELECT e.*, b.barcode, s.code as shelf_code FROM events e LEFT JOIN books b ON e.book_id = b.id LEFT JOIN shelves s ON e.shelf_id = s.id ORDER BY e.created_at DESC LIMIT 200");
  res.json(events);
});

// start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server listening on", PORT);
});
