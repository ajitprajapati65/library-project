/* LIBRARY MANAGEMENT SYSTEM LOGIC
    Features: Data Initialization, CRUD, Issue/Return, Fines
*/

// --- DATA INITIALIZATION ---
// Runs on every page load to ensure we have data in LocalStorage
document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    checkAuth();
    setupEventListeners();
});

function initializeData() {
    if (!localStorage.getItem('lms_books')) {
        const dummyBooks = [
            { id: 1, title: "The Great Gatsby", author: "F. Scott Fitzgerald", category: "Fiction", qty: 5, status: "Available" },
            { id: 2, title: "Clean Code", author: "Robert C. Martin", category: "Technology", qty: 2, status: "Available" },
            { id: 3, title: "A Brief History of Time", author: "Stephen Hawking", category: "Science", qty: 0, status: "Issued" },
            { id: 4, title: "Introduction to Algorithms", author: "Cormen", category: "Education", qty: 3, status: "Available" }
        ];
        localStorage.setItem('lms_books', JSON.stringify(dummyBooks));
    }

    if (!localStorage.getItem('lms_issued')) {
        localStorage.setItem('lms_issued', JSON.stringify([]));
    }
}

// --- AUTHENTICATION SIMULATION ---
function checkAuth() {
    const user = JSON.parse(sessionStorage.getItem('lms_user'));
    const path = window.location.pathname;

    // Redirect logic
    if (path.includes('admin.html') && (!user || user.role !== 'admin')) {
        window.location.href = 'login.html';
    } else if (path.includes('student.html') && (!user || user.role !== 'student')) {
        window.location.href = 'login.html';
    }
    
    // Update Nav if logged in
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn && user) {
        logoutBtn.style.display = 'inline-block';
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('lms_user');
            window.location.href = 'index.html';
        });
    }
}

// --- GLOBAL UTILS ---
function getBooks() { return JSON.parse(localStorage.getItem('lms_books')) || []; }
function saveBooks(books) { localStorage.setItem('lms_books', JSON.stringify(books)); }
function getIssued() { return JSON.parse(localStorage.getItem('lms_issued')) || []; }
function saveIssued(records) { localStorage.setItem('lms_issued', JSON.stringify(records)); }

// --- DASHBOARD NAVIGATION (SPA feel within pages) ---
function setupEventListeners() {
    // Tab switching
    const buttons = document.querySelectorAll('.sidebar button');
    const sections = document.querySelectorAll('.main-content section');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class
            buttons.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.add('hidden'));

            // Add active class
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('hidden');

            // Refresh data based on view
            if (targetId === 'manage-books') renderAdminBookTable();
            if (targetId === 'view-books') renderStudentBooks();
            if (targetId === 'my-books') renderMyBooks();
            if (targetId === 'issued-books') renderAdminIssuedTable();
        });
    });

    // Initial renders
    if (document.getElementById('manage-books')) renderAdminBookTable();
    if (document.getElementById('view-books')) renderStudentBooks();
    
    // Search Listener
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => renderStudentBooks(e.target.value));
    }
}

// --- ADMIN FUNCTIONS ---

function renderAdminBookTable() {
    const tbody = document.querySelector('#adminBookTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const books = getBooks();

    books.forEach(book => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${book.id}</td>
            <td>${book.title}</td>
            <td>${book.author}</td>
            <td>${book.category}</td>
            <td>${book.qty}</td>
            <td>
                <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="editBook(${book.id})">Edit</button>
                <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px;" onclick="deleteBook(${book.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function handleAddBook(e) {
    e.preventDefault();
    const title = document.getElementById('bookTitle').value;
    const author = document.getElementById('bookAuthor').value;
    const category = document.getElementById('bookCategory').value;
    const qty = parseInt(document.getElementById('bookQty').value);

    const books = getBooks();
    const newId = books.length > 0 ? books[books.length - 1].id + 1 : 1;
    
    books.push({ id: newId, title, author, category, qty, status: qty > 0 ? 'Available' : 'Issued' });
    saveBooks(books);
    
    alert('Book Added Successfully!');
    e.target.reset();
    renderAdminBookTable();
}

function deleteBook(id) {
    if(confirm('Are you sure?')) {
        let books = getBooks();
        books = books.filter(b => b.id !== id);
        saveBooks(books);
        renderAdminBookTable();
    }
}

function renderAdminIssuedTable() {
    const tbody = document.querySelector('#issuedBookTable tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    const issued = getIssued();
    
    issued.forEach(record => {
        const fine = calculateFine(record.returnDate);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${record.bookTitle}</td>
            <td>${record.user}</td>
            <td>${record.issueDate}</td>
            <td>${record.returnDate}</td>
            <td style="color: ${fine > 0 ? 'red' : 'green'}">$${fine}</td>
            <td>${record.status}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- STUDENT FUNCTIONS ---

function renderStudentBooks(query = '') {
    const container = document.getElementById('bookListContainer');
    if (!container) return;

    container.innerHTML = '';
    const books = getBooks();
    
    const filtered = books.filter(b => 
        b.title.toLowerCase().includes(query.toLowerCase()) || 
        b.author.toLowerCase().includes(query.toLowerCase())
    );

    filtered.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = `
            <div class="book-title">${book.title}</div>
            <div class="book-meta">By ${book.author} | ${book.category}</div>
            <div style="margin: 10px 0;">
                <span class="badge ${book.qty > 0 ? 'badge-avail' : 'badge-issue'}">
                    ${book.qty > 0 ? 'Available ('+book.qty+')' : 'Out of Stock'}
                </span>
            </div>
            ${book.qty > 0 ? `<button class="btn btn-primary" onclick="issueBook(${book.id}, '${book.title}')">Issue Book</button>` : ''}
        `;
        container.appendChild(card);
    });
}

function issueBook(bookId, bookTitle) {
    const user = JSON.parse(sessionStorage.getItem('lms_user'));
    
    // Logic: Reduce Qty, Add to Issued List
    let books = getBooks();
    const bookIndex = books.findIndex(b => b.id === bookId);
    
    if (books[bookIndex].qty > 0) {
        books[bookIndex].qty -= 1;
        if(books[bookIndex].qty === 0) books[bookIndex].status = "Issued";
        saveBooks(books);

        const today = new Date();
        const returnDate = new Date();
        returnDate.setDate(today.getDate() + 7); // 7 days return policy

        const issuedRecord = {
            id: Date.now(),
            bookId: bookId,
            bookTitle: bookTitle,
            user: user.name,
            userId: user.id,
            issueDate: today.toISOString().split('T')[0],
            returnDate: returnDate.toISOString().split('T')[0],
            status: 'Issued'
        };

        const issuedList = getIssued();
        issuedList.push(issuedRecord);
        saveIssued(issuedList);

        alert(`Book Issued! Please return by ${returnDate.toDateString()}`);
        renderStudentBooks();
    }
}

function renderMyBooks() {
    const tbody = document.querySelector('#myBooksTable tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const user = JSON.parse(sessionStorage.getItem('lms_user'));
    const issued = getIssued().filter(r => r.userId === user.id && r.status === 'Issued');

    issued.forEach(record => {
        const fine = calculateFine(record.returnDate);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${record.bookTitle}</td>
            <td>${record.issueDate}</td>
            <td>${record.returnDate}</td>
            <td style="color: red; font-weight:bold;">$${fine}</td>
            <td>
                <button class="btn btn-secondary" onclick="returnBook(${record.id}, ${record.bookId}, ${fine})">Return</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function calculateFine(returnDateStr) {
    const returnDate = new Date(returnDateStr);
    const today = new Date();
    
    // If today is past return date
    if (today > returnDate) {
        const diffTime = Math.abs(today - returnDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays * 5; // $5 fine per day
    }
    return 0;
}

function returnBook(recordId, bookId, fine) {
    if(fine > 0) {
        alert(`You have a fine of $${fine}. Please pay at the counter.`);
    }

    // Update Issued Record
    let issued = getIssued();
    const index = issued.findIndex(r => r.id === recordId);
    if (index !== -1) {
        issued[index].status = "Returned";
        // In a real app, we might keep history, but here we remove it or mark returned
        issued.splice(index, 1); 
        saveIssued(issued);
    }

    // Update Book Qty
    let books = getBooks();
    const bIndex = books.findIndex(b => b.id === bookId);
    if(bIndex !== -1) {
        books[bIndex].qty += 1;
        saveBooks(books);
    }

    alert("Book returned successfully!");
    renderMyBooks();
}