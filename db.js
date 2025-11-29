// db.js
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'books.db');
const db = new Database(dbPath);

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      description TEXT,
      subject TEXT,
      department TEXT,
      price REAL DEFAULT 0,
      isbn TEXT,
      cover_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_books_department ON books(department);
    CREATE INDEX IF NOT EXISTS idx_books_subject ON books(subject);
  `);
}

module.exports = { db, init };