// seed.js
const { db, init } = require('./db');

init();

const sample = [
  {
    title: "Learning JavaScript Design Patterns",
    author: "Addy Osmani",
    description: "A practical guide to JavaScript design patterns.",
    subject: "Programming",
    department: "Computer",
    price: 399.00,
    isbn: "978-1449331818",
    cover_url: "https://source.unsplash.com/collection/928423/400x600?sig=1"
  },
  {
    title: "Principles of Microeconomics",
    author: "N. Gregory Mankiw",
    description: "Introductory microeconomics for business students.",
    subject: "Economics",
    department: "Business",
    price: 499.00,
    isbn: "978-1305971494",
    cover_url: "https://source.unsplash.com/collection/928423/400x600?sig=2"
  },
  {
    title: "Database System Concepts",
    author: "Abraham Silberschatz",
    description: "Comprehensive database systems textbook.",
    subject: "Databases",
    department: "Computer",
    price: 799.00,
    isbn: "978-0073523323",
    cover_url: "https://source.unsplash.com/collection/928423/400x600?sig=3"
  },
  {
    title: "Business Ethics",
    author: "Andrew Ghillyer",
    description: "Ethical decision making in business.",
    subject: "Ethics",
    department: "Business",
    price: 299.00,
    isbn: "978-0078028790",
    cover_url: "https://source.unsplash.com/collection/928423/400x600?sig=4"
  }
];

const insert = db.prepare(`INSERT INTO books
  (title, author, description, subject, department, price, isbn, cover_url)
  VALUES (@title, @author, @description, @subject, @department, @price, @isbn, @cover_url)
`);

const count = db.prepare('SELECT COUNT(*) as c FROM books').get().c;
if (count === 0) {
  const insertMany = db.transaction((items) => {
    for (const it of items) insert.run(it);
  });
  insertMany(sample);
  console.log('Seeded database with sample books.');
} else {
  console.log('Database already has data, skipping seed.');
}