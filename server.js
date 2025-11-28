const express = require("express");
const bcrypt = require("bcryptjs");
const fs = require("fs-extra");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const dbFile = "./database.json";

function loadDB() {
    return JSON.parse(fs.readFileSync(dbFile));
}

function saveDB(data) {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

/* ----------------------------- LOGIN ----------------------------- */
app.post("/login", (req, res) => {
    const { password } = req.body;
    const db = loadDB();

    bcrypt.compare(password, db.password, (err, result) => {
        if (result) return res.json({ success: true });
        return res.json({ success: false });
    });
});

/* ----------------------------- GET DATA ----------------------------- */
app.get("/data", (req, res) => {
    const { books, shelves } = loadDB();
    res.json({ books, shelves });
});

/* ----------------------------- ADD BOOK ----------------------------- */
app.post("/addBook", (req, res) => {
    const db = loadDB();
    db.books.push(req.body);
    saveDB(db);
    res.json({ success: true });
});

/* ----------------------------- DELETE BOOK ----------------------------- */
app.post("/deleteBook", (req, res) => {
    const db = loadDB();
    db.books.splice(req.body.index, 1);
    saveDB(db);
    res.json({ success: true });
});

/* ----------------------------- MOVE BOOK ----------------------------- */
app.post("/moveBook", (req, res) => {
    const { index, newShelf } = req.body;
    const db = loadDB();
    db.books[index].shelf = newShelf;
    saveDB(db);
    res.json({ success: true });
});

/* ----------------------------- ADD SHELF ----------------------------- */
app.post("/addShelf", (req, res) => {
    const db = loadDB();
    db.shelves.push(req.body.name);
    saveDB(db);
    res.json({ success: true });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
