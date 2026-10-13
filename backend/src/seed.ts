import { db, initDatabase } from './db.js';
import bcrypt from 'bcryptjs';

export function seedData() {
  initDatabase();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    // Check if open access sample books are already seeded
    const openBook = db.prepare("SELECT id FROM books WHERE isbn = '978-0262510875'").get();
    if (!openBook) {
      console.log('Seeding open-access e-reader books into existing catalog...');
      seedOpenAccessBooks();
    }
    return;
  }

  console.log('Seeding initial data...');

  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, name, role)
    VALUES (?, ?, ?, ?)
  `);

  const insertMember = db.prepare(`
    INSERT INTO members (user_id, member_number, phone, max_loans, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertCategory = db.prepare(`
    INSERT INTO categories (name, description)
    VALUES (?, ?)
  `);

  const insertAuthor = db.prepare(`
    INSERT INTO authors (name)
    VALUES (?)
  `);

  const insertBook = db.prepare(`
    INSERT INTO books (isbn, title, publisher, category_id, published_year, description, cover_image_url, pdf_url, reader_url, ia_identifier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBookAuthor = db.prepare(`
    INSERT INTO book_authors (book_id, author_id)
    VALUES (?, ?)
  `);

  const insertCopy = db.prepare(`
    INSERT INTO copies (book_id, barcode, status, location)
    VALUES (?, ?, ?, ?)
  `);

  const seedTransaction = db.transaction(() => {
    // Industry-standard bcrypt hashed passwords (salt rounds = 10)
    const passwordHash = bcrypt.hashSync('password123', 10);

    // 1. Admin
    insertUser.run('admin@library.edu', passwordHash, 'System Administrator', 'admin');

    // 2. Librarian
    insertUser.run('librarian@library.edu', passwordHash, 'Sarah Jenkins (Librarian)', 'librarian');

    // 3. Members
    const member1Res = insertUser.run('alex@student.edu', passwordHash, 'Alex Rivera', 'member');
    insertMember.run(member1Res.lastInsertRowid, 'MEM-00101', '+1-555-0101', 5, 'active');

    const member2Res = insertUser.run('priya@student.edu', passwordHash, 'Priya Sharma', 'member');
    insertMember.run(member2Res.lastInsertRowid, 'MEM-00102', '+1-555-0102', 5, 'active');

    const member3Res = insertUser.run('david@student.edu', passwordHash, 'David Chen', 'member');
    insertMember.run(member3Res.lastInsertRowid, 'MEM-00103', '+1-555-0103', 3, 'suspended');

    // 4. Categories
    const cat1 = insertCategory.run('Computer Science', 'Algorithms, systems, software engineering and AI').lastInsertRowid;
    const cat2 = insertCategory.run('Database Systems', 'Relational design, indexing, transactions, and SQL').lastInsertRowid;
    const cat3 = insertCategory.run('Software Architecture', 'Domain boundaries, distributed data, clean code').lastInsertRowid;

    // 5. Authors
    const auth1 = insertAuthor.run('Abraham Silberschatz').lastInsertRowid;
    const auth2 = insertAuthor.run('Henry F. Korth').lastInsertRowid;
    const auth3 = insertAuthor.run('S. Sudarshan').lastInsertRowid;
    const auth4 = insertAuthor.run('Martin Kleppmann').lastInsertRowid;
    const auth5 = insertAuthor.run('Robert C. Martin').lastInsertRowid;
    const auth6 = insertAuthor.run('Harold Abelson').lastInsertRowid;
    const auth7 = insertAuthor.run('Gerald Jay Sussman').lastInsertRowid;
    const auth8 = insertAuthor.run('Keith Elliot Greenberg').lastInsertRowid;

    // 6. Books
    // Book 1: Database System Concepts
    const b1 = insertBook.run(
      '978-0078022159',
      'Database System Concepts (7th Edition)',
      'McGraw-Hill',
      cat2,
      2019,
      'Fundamental textbook for relational databases, ACID transactions, and query processing.',
      'https://covers.openlibrary.org/b/id/8226191-L.jpg',
      null,
      'https://archive.org/embed/databasesystemco0000silb',
      'databasesystemco0000silb'
    ).lastInsertRowid;
    insertBookAuthor.run(b1, auth1);
    insertBookAuthor.run(b1, auth2);
    insertBookAuthor.run(b1, auth3);

    // Book 2: Designing Data-Intensive Applications
    const b2 = insertBook.run(
      '978-1449373320',
      'Designing Data-Intensive Applications',
      'O\'Reilly Media',
      cat1,
      2017,
      'The definitive guide to distributed data systems, reliability, scalability, and maintainability.',
      'https://covers.openlibrary.org/b/id/8389656-L.jpg',
      null,
      null,
      null
    ).lastInsertRowid;
    insertBookAuthor.run(b2, auth4);

    // Book 3: Clean Architecture
    const b3 = insertBook.run(
      '978-0134494166',
      'Clean Architecture: A Craftsman\'s Guide',
      'Prentice Hall',
      cat3,
      2017,
      'Software structure, domain boundaries, decoupling, and dependency inversion.',
      'https://covers.openlibrary.org/b/id/8575003-L.jpg',
      null,
      null,
      null
    ).lastInsertRowid;
    insertBookAuthor.run(b3, auth5);

    // Book 4: Structure and Interpretation of Computer Programs (SICP) - Open Access with Reader
    const b4 = insertBook.run(
      '978-0262510875',
      'Structure and Interpretation of Computer Programs (SICP)',
      'MIT Press',
      cat1,
      1996,
      'Legendary computing and programming paradigms book from MIT. Free open-access digital edition.',
      'https://covers.openlibrary.org/b/id/149338-L.jpg',
      'https://archive.org/download/jisuanjichengxud0000abel/jisuanjichengxud0000abel.pdf',
      'https://archive.org/embed/jisuanjichengxud0000abel',
      'jisuanjichengxud0000abel'
    ).lastInsertRowid;
    insertBookAuthor.run(b4, auth6);
    insertBookAuthor.run(b4, auth7);

    // Book 5: Jobs & Wozniak - Creating The Apple Computer - Free PDF & Online Reader
    const b5 = insertBook.run(
      '978-0822506843',
      'Jobs & Wozniak: Creating The Apple Computer',
      'Lerner Publications',
      cat1,
      1994,
      'The biography of Steve Jobs and Steve Wozniak creating Apple Computer. Full public domain PDF online.',
      'https://covers.openlibrary.org/b/id/1239615-L.jpg',
      'https://archive.org/download/jobs-wozniak-creating-the-apple-computer/jobs-wozniak-creating-the-apple-computer.pdf',
      'https://archive.org/embed/jobs-wozniak-creating-the-apple-computer',
      'jobs-wozniak-creating-the-apple-computer'
    ).lastInsertRowid;
    insertBookAuthor.run(b5, auth8);

    // Copies
    insertCopy.run(b1, 'BC-DBS-001', 'available', 'Floor 2, Shelf A1');
    insertCopy.run(b1, 'BC-DBS-002', 'available', 'Floor 2, Shelf A1');
    insertCopy.run(b1, 'BC-DBS-003', 'on_loan', 'Floor 2, Shelf A1');

    insertCopy.run(b2, 'BC-DDIA-001', 'available', 'Floor 2, Shelf B3');
    insertCopy.run(b2, 'BC-DDIA-002', 'available', 'Floor 2, Shelf B3');

    insertCopy.run(b3, 'BC-ARCH-001', 'available', 'Floor 1, Shelf C2');

    insertCopy.run(b4, 'BC-SICP-001', 'available', 'Floor 1, Shelf D1');
    insertCopy.run(b4, 'BC-SICP-002', 'available', 'Floor 1, Shelf D1');

    insertCopy.run(b5, 'BC-AAPL-001', 'available', 'Floor 1, Shelf E2');

    // Seed Active and Overdue Loans
    const pastLoanDueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const futureDueDate = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO loans (copy_id, member_id, checked_out_at, due_at)
      VALUES (3, 1, datetime('now', '-5 days'), ?)
    `).run(futureDueDate);

    db.prepare(`
      INSERT INTO loans (copy_id, member_id, checked_out_at, due_at, fine_amount)
      VALUES (8, 2, datetime('now', '-19 days'), ?, 5.0)
    `).run(pastLoanDueDate);
  });

  seedTransaction();
  console.log('Sample books, copies, members, loans and categories seeded successfully.');
}

function seedOpenAccessBooks() {
  const insertCategory = db.prepare(`INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)`);
  const catRes = db.prepare("SELECT id FROM categories WHERE name = 'Computer Science'").get() as any;
  const catId = catRes ? catRes.id : insertCategory.run('Computer Science', 'Computing and systems').lastInsertRowid;

  const insertAuthor = db.prepare(`INSERT OR IGNORE INTO authors (name) VALUES (?)`);
  insertAuthor.run('Harold Abelson');
  insertAuthor.run('Gerald Jay Sussman');
  insertAuthor.run('Keith Elliot Greenberg');

  const authAbelson = db.prepare("SELECT id FROM authors WHERE name = 'Harold Abelson'").get() as any;
  const authGreenberg = db.prepare("SELECT id FROM authors WHERE name = 'Keith Elliot Greenberg'").get() as any;

  const insertBook = db.prepare(`
    INSERT OR IGNORE INTO books (isbn, title, publisher, category_id, published_year, description, cover_image_url, pdf_url, reader_url, ia_identifier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBookAuthor = db.prepare(`INSERT OR IGNORE INTO book_authors (book_id, author_id) VALUES (?, ?)`);
  const insertCopy = db.prepare(`INSERT OR IGNORE INTO copies (book_id, barcode, status, location) VALUES (?, ?, 'available', ?)`);

  // Book 1: SICP
  const b1 = insertBook.run(
    '978-0262510875',
    'Structure and Interpretation of Computer Programs (SICP)',
    'MIT Press',
    catId,
    1996,
    'Legendary computing and programming paradigms book from MIT. Free open-access digital edition with full online reader.',
    'https://covers.openlibrary.org/b/id/149338-L.jpg',
    'https://archive.org/download/jisuanjichengxud0000abel/jisuanjichengxud0000abel.pdf',
    'https://archive.org/embed/jisuanjichengxud0000abel',
    'jisuanjichengxud0000abel'
  ).lastInsertRowid;

  if (b1) {
    if (authAbelson) insertBookAuthor.run(b1, authAbelson.id);
    insertCopy.run(b1, 'BC-SICP-001', 'Floor 1, Shelf D1');
    insertCopy.run(b1, 'BC-SICP-002', 'Floor 1, Shelf D1');
  }

  // Book 2: Apple Computer Biography
  const b2 = insertBook.run(
    '978-0822506843',
    'Jobs & Wozniak: Creating The Apple Computer',
    'Lerner Publications',
    catId,
    1994,
    'The biography of Steve Jobs and Steve Wozniak creating Apple Computer. Full public domain PDF online.',
    'https://covers.openlibrary.org/b/id/1239615-L.jpg',
    'https://archive.org/download/jobs-wozniak-creating-the-apple-computer/jobs-wozniak-creating-the-apple-computer.pdf',
    'https://archive.org/embed/jobs-wozniak-creating-the-apple-computer',
    'jobs-wozniak-creating-the-apple-computer'
  ).lastInsertRowid;

  if (b2) {
    if (authGreenberg) insertBookAuthor.run(b2, authGreenberg.id);
    insertCopy.run(b2, 'BC-AAPL-001', 'Floor 1, Shelf E2');
  }

  console.log('Open-access books seeded successfully.');
}

seedData();
