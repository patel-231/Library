// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { db, init } = require('./db');
const path = require('path');

init();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// list books with search, filters, sort, pagination
app.get('/api/books', (req, res) => {
  const q = (req.query.q || '').trim();
  const department = req.query.department || '';
  const subject = req.query.subject || '';
  const sort = req.query.sort || 'created_at_desc'; // created_at_desc | price_asc | price_desc | title_asc
  const page = Math.max(1, parseInt(req.query.page || '1'));
  const perPage = Math.min(50, parseInt(req.query.perPage || '12'));
  const offset = (page - 1) * perPage;

  let where = [];
  let params = {};

  if (q) {
    where.push("(title LIKE @q OR author LIKE @q OR description LIKE @q OR isbn LIKE @q)");
    params.q = `%${q}%`;
  }
  if (department) {
    where.push("department = @department");
    params.department = department;
  }
  if (subject) {
    where.push("subject = @subject");
    params.subject = subject;
  }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  let orderSql = 'ORDER BY created_at DESC';
  if (sort === 'price_asc') orderSql = 'ORDER BY price ASC';
  if (sort === 'price_desc') orderSql = 'ORDER BY price DESC';
  if (sort === 'title_asc') orderSql = 'ORDER BY title COLLATE NOCASE ASC';

  const totalRow = db.prepare(`SELECT COUNT(*) as cnt FROM books ${whereSql}`).get(params);
  const total = totalRow.cnt;

  const stmt = db.prepare(`
    SELECT * FROM books
    ${whereSql}
    ${orderSql}
    LIMIT @perPage OFFSET @offset
  `);
  const rows = stmt.all({ ...params, perPage, offset });

  res.json({ data: rows, page, perPage, total });
});

// get one book
app.get('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const row = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// create
app.post('/api/books', (req, res) => {
  const body = req.body;
  const stmt = db.prepare(`INSERT INTO books
    (title, author, description, subject, department, price, isbn, cover_url)
    VALUES (@title,@author,@description,@subject,@department,@price,@isbn,@cover_url)`);
  const info = stmt.run({
    title: body.title || '',
    author: body.author || '',
    description: body.description || '',
    subject: body.subject || '',
    department: body.department || '',
    price: body.price || 0,
    isbn: body.isbn || '',
    cover_url: body.cover_url || ''
  });
  const created = db.prepare('SELECT * FROM books WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

// update
app.put('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const body = req.body;
  const stmt = db.prepare(`UPDATE books SET
    title=@title, author=@author, description=@description,
    subject=@subject, department=@department, price=@price, isbn=@isbn, cover_url=@cover_url
    WHERE id=@id`);
  const info = stmt.run({
    id,
    title: body.title || '',
    author: body.author || '',
    description: body.description || '',
    subject: body.subject || '',
    department: body.department || '',
    price: body.price || 0,
    isbn: body.isbn || '',
    cover_url: body.cover_url || ''
  });
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  res.json(updated);
});

// delete
app.delete('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const info = db.prepare('DELETE FROM books WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});