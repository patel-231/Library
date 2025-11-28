let books = [];
let shelves = [];

const API = "http://localhost:3000";

/* ---------------- UI SWITCHING --------------- */
function showLogin() { document.getElementById("loginBox").classList.remove("hidden"); }
function hideLogin() { document.getElementById("loginBox").classList.add("hidden"); }

function switchToUser() {
    document.getElementById("userUI").classList.remove("hidden");
    document.getElementById("devUI").classList.add("hidden");
}

/* ---------------- LOGIN ---------------- */
async function loginDev() {
    let pass = document.getElementById("devPassword").value;

    let res = await fetch(API + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass })
    });

    let data = await res.json();

    if (!data.success) return alert("Wrong password!");

    hideLogin();
    showDevUI();
}

function logoutDev() {
    switchToUser();
}

/* ---------------- LOAD DATA ---------------- */
async function loadData() {
    let res = await fetch(API + "/data");
    let data = await res.json();
    books = data.books;
    shelves = data.shelves;
    renderBooks();
    updateDevControls();
}

loadData();

/* ---------------- RENDER BOOKS ---------------- */
function renderBooks() {
    let list = document.getElementById("bookList");
    let search = document.getElementById("searchUser").value.toLowerCase();

    list.innerHTML = "";

    books.filter(b => b.name.toLowerCase().includes(search))
        .forEach(b => {
            list.innerHTML += `
                <div class="p-3 bg-gray-200 rounded mb-2">
                    <strong>${b.name}</strong><br>
                    <span class="text-sm text-gray-700">Shelf: ${b.shelf}</span>
                </div>
            `;
        });
}

/* ------------ SWITCH TO DEVELOPER UI ----------- */
function showDevUI() {
    document.getElementById("userUI").classList.add("hidden");
    document.getElementById("devUI").classList.remove("hidden");
}

/* ------------ UPDATE DROPDOWNS IN DEV UI ---------- */
function updateDevControls() {
    let shelfHTML = shelves.map(s => `<option>${s}</option>`).join("");
    let bookHTML  = books.map((b,i) => `<option value="${i}">${b.name}</option>`).join("");

    document.getElementById("bookShelf").innerHTML = shelfHTML;
    document.getElementById("moveShelf").innerHTML = shelfHTML;
    document.getElementById("deleteBook").innerHTML = bookHTML;
    document.getElementById("moveBook").innerHTML = bookHTML;
}

/* ---------------- DEV ACTIONS ---------------- */
async function addBook() {
    let name = document.getElementById("bookName").value;
    let shelf = document.getElementById("bookShelf").value;

    await fetch(API + "/addBook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, shelf })
    });

    loadData();
}

async function deleteBook() {
    let index = document.getElementById("deleteBook").value;

    await fetch(API + "/deleteBook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index })
    });

    loadData();
}

async function moveBook() {
    let index = document.getElementById("moveBook").value;
    let newShelf = document.getElementById("moveShelf").value;

    await fetch(API + "/moveBook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index, newShelf })
    });

    loadData();
}

async function addShelf() {
    let name = document.getElementById("newShelf").value;

    await fetch(API + "/addShelf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
    });

    loadData();
}
