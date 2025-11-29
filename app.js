// app.js - frontend logic
const api = '/api/books';
let state = {
  q: '',
  department: '',
  subject: '',
  sort: 'created_at_desc',
  page: 1,
  perPage: 12,
  total: 0
};

const booksGrid = document.getElementById('booksGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const deptSel = document.getElementById('departmentSelect');
const subjSel = document.getElementById('subjectSelect');
const sortSel = document.getElementById('sortSelect');
const pagination = document.getElementById('pagination');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');
const addBookBtn = document.getElementById('addBookBtn');

searchBtn.addEventListener('click', () => { state.q = searchInput.value.trim(); state.page = 1; loadBooks(); });
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { state.q = searchInput.value.trim(); state.page = 1; loadBooks(); }});
deptSel.addEventListener('change', () => { state.department = deptSel.value; state.page = 1; loadBooks(); });
subjSel.addEventListener('change', () => { state.subject = subjSel.value; state.page = 1; loadBooks(); });
sortSel.addEventListener('change', () => { state.sort = sortSel.value; state.page = 1; loadBooks(); });
addBookBtn.addEventListener('click', () => showBookForm());

closeModal.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

async function loadBooks() {
  const params = new URLSearchParams({
    q: state.q,
    department: state.department,
    subject: state.subject,
    sort: state.sort,
    page: state.page,
    perPage: state.perPage
  });
  const res = await fetch(`${api}?${params.toString()}`);
  const json = await res.json();
  state.total = json.total;
  renderBooks(json.data);
  renderPagination();
  renderSideLists(json.data);
}

function renderBooks(items) {
  booksGrid.innerHTML = '';
  if (!items.length) {
    booksGrid.innerHTML = `<div style="padding:28px;background:#fff;border-radius:10px;">No books found</div>`;
    return;
  }
  for (const b of items) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${b.cover_url || 'https://source.unsplash.com/collection/928423/400x600?sig=20'}" alt="${escapeHtml(b.title)}" loading="lazy"/>
      <div>
        <div class="title">${escapeHtml(b.title)}</div>
        <div class="author">${escapeHtml(b.author)}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <div class="price">₹${(b.price||0).toFixed(0)}</div>
          <div style="font-size:12px;color:#888">${escapeHtml(b.department || '')}</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn-primary" data-id="${b.id}" onclick="viewBook(${b.id})">View</button>
        <button class="btn-ghost" data-id="${b.id}" onclick="editBook(${b.id})">Edit</button>
      </div>
    `;
    booksGrid.appendChild(card);
  }
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(state.total / state.perPage));
  pagination.innerHTML = '';
  const makeBtn = (label, page, disabled=false) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.disabled = disabled;
    btn.onclick = () => { state.page = page; loadBooks(); };
    return btn;
  };
  pagination.appendChild(makeBtn('Prev', Math.max(1,state.page-1), state.page===1));
  for (let p = 1; p <= totalPages && p <= 7; p++) {
    const btn = document.createElement('button');
    btn.textContent = p;
    btn.style.fontWeight = (p===state.page ? '700' : '400');
    btn.onclick = () => { state.page = p; loadBooks(); };
    pagination.appendChild(btn);
  }
  pagination.appendChild(makeBtn('Next', Math.min(totalPages,state.page+1), state.page===totalPages));
}

function renderSideLists(items) {
  const depts = new Set();
  const subs = new Set();
  // fetch all departments/subjects from visible items + defaults
  items.forEach(b => { if (b.department) depts.add(b.department); if (b.subject) subs.add(b.subject); });
  // keep defaults in side list
  const deptList = document.getElementById('deptList');
  const subjectList = document.getElementById('subjectList');
  deptList.innerHTML = `<li onclick="filterByDept('')">Show all</li>`;
  subjectList.innerHTML = `<li onclick="filterBySubject('')">Show all</li>`;
  Array.from(depts).sort().forEach(d => {
    const li = document.createElement('li');
    li.textContent = d;
    li.onclick = () => { state.department = d; deptSel.value = d; loadBooks(); };
    deptList.appendChild(li);
  });
  Array.from(subs).sort().forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    li.onclick = () => { state.subject = s; subjSel.value = s; loadBooks(); };
    subjectList.appendChild(li);
  });
}

/* utility */
function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* view book detail */
async function viewBook(id) {
  const res = await fetch(`${api}/${id}`);
  if (!res.ok) return alert('Book not found');
  const b = await res.json();
  modalBody.innerHTML = `
    <div class="book-detail">
      <img src="${b.cover_url || 'https://source.unsplash.com/collection/928423/400x600?sig=99'}" alt="${escapeHtml(b.title)}" />
      <div class="book-info">
        <h2>${escapeHtml(b.title)}</h2>
        <div class="book-meta">by ${escapeHtml(b.author)} • ${escapeHtml(b.department)} / ${escapeHtml(b.subject)}</div>
        <p style="margin-top:12px">${escapeHtml(b.description || '')}</p>
        <div class="book-actions">
          <div class="price" style="font-size:20px;">₹${(b.price||0).toFixed(0)}</div>
          <button class="btn-primary" onclick="editBook(${b.id})">Edit</button>
          <button class="btn-ghost" onclick="deleteBook(${b.id})">Delete</button>
        </div>
      </div>
    </div>
  `;
  modal.classList.remove('hidden');
}

/* show add/edit form */
function showBookForm(book = {}) {
  modalBody.innerHTML = `
    <h3>${book.id ? 'Edit Book' : 'Add Book'}</h3>
    <form id="bookForm">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
        <input name="title" placeholder="Title" required value="${escapeHtml(book.title||'')}" />
        <input name="author" placeholder="Author" required value="${escapeHtml(book.author||'')}" />
        <input name="isbn" placeholder="ISBN" value="${escapeHtml(book.isbn||'')}" />
        <input name="price" type="number" placeholder="Price" value="${book.price||0}" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        <input name="department" placeholder="Department (e.g., Computer)" value="${escapeHtml(book.department||'')}" />
        <input name="subject" placeholder="Subject (e.g., Programming)" value="${escapeHtml(book.subject||'')}" />
      </div>
      <textarea name="description" placeholder="Description" style="width:100%;margin-top:8px" rows="6">${escapeHtml(book.description||'')}</textarea>
      <input name="cover_url" placeholder="Cover image URL" style="width:100%;margin-top:8px" value="${escapeHtml(book.cover_url||'')}" />
      <div style="margin-top:12px;display:flex;gap:8px">
        <button type="submit" class="btn-primary">${book.id ? 'Save' : 'Add'}</button>
        <button type="button" class="btn-ghost" onclick="modal.classList.add('hidden')">Cancel</button>
      </div>
    </form>
  `;
  document.getElementById('bookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd.entries());
    payload.price = Number(payload.price || 0);
    try {
      if (book.id) {
        const res = await fetch(`${api}/${book.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)});
        if (!res.ok) throw new Error('Update failed');
      } else {
        const res = await fetch(api, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)});
        if (!res.ok) throw new Error('Create failed');
      }
      modal.classList.add('hidden');
      loadBooks();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  });
  modal.classList.remove('hidden');
}

/* global helpers for onclick */
window.viewBook = viewBook;
window.editBook = async function(id){
  const res = await fetch(`${api}/${id}`);
  if (!res.ok) return alert('Not found');
  const b = await res.json();
  showBookForm(b);
};
window.deleteBook = async function(id){
  if (!confirm('Delete this book?')) return;
  const res = await fetch(`${api}/${id}`, { method: 'DELETE' });
  if (res.ok) loadBooks();
  else alert('Delete failed');
};

function filterByDept(d) { state.department = d; deptSel.value = d; loadBooks(); }
function filterBySubject(s) { state.subject = s; subjSel.value = s; loadBooks(); }

// initial load
loadBooks();