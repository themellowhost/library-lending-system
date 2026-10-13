import { db, initDatabase } from './db.js';
import bcrypt from 'bcryptjs';

export function seedData() {
  initDatabase();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    console.log('Database already contains data, skipping seed.');
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
    INSERT INTO books (isbn, title, publisher, category_id, published_year, description)
    VALUES (?, ?, ?, ?, ?, ?)
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
    const cat3 = insertCategory.run('Mathematics', 'Discrete math, calculus, linear algebra and statistics').lastInsertRowid;

    // 5. Authors
    const auth1 = insertAuthor.run('Abraham Silberschatz').lastInsertRowid;
    const auth2 = insertAuthor.run('Henry F. Korth').lastInsertRowid;
    const auth3 = insertAuthor.run('S. Sudarshan').lastInsertRowid;
    const auth4 = insertAuthor.run('Martin Kleppmann').lastInsertRowid;
    const auth5 = insertAuthor.run('Robert C. Martin').lastInsertRowid;
    const auth6 = insertAuthor.run('Thomas H. Cormen').lastInsertRowid;

    // 6. Books
    // Book 1: Database System Concepts
    const b1 = insertBook.run(
      '978-0078022159',
      'Database System Concepts (7th Edition)',
      'McGraw-Hill',
      cat2,
      2019,
      'Fundamental textbook for relational databases, ACID transactions, and query processing.'
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
      'The definitive guide to distributed data systems, reliability, scalability, and maintainability.'
    ).lastInsertRowid;
    insertBookAuthor.run(b2, auth4);

    // Book 3: Clean Architecture
    const b3 = insertBook.run(
      '978-0134494166',
      'Clean Architecture: A Craftsman\'s Guide',
      'Prentice Hall',
      cat1,
      2017,
      'Software structure, domain boundaries, decoupling, and dependency inversion.'
    ).lastInsertRowid;
    insertBookAuthor.run(b3, auth5);

    // Book 4: Introduction to Algorithms
    const b4 = insertBook.run(
      '978-0262046305',
      'Introduction to Algorithms (CLRS)',
      'MIT Press',
      cat1,
      2022,
      'Comprehensive textbook covering algorithms, data structures, dynamic programming and graph theory.'
    ).lastInsertRowid;
    insertBookAuthor.run(b4, auth6);

    // 7. Copies
    // Book 1 Copies
    insertCopy.run(b1, 'BC-DBS-001', 'available', 'Floor 2, Shelf A1');
    insertCopy.run(b1, 'BC-DBS-002', 'available', 'Floor 2, Shelf A1');
    insertCopy.run(b1, 'BC-DBS-003', 'on_loan', 'Floor 2, Shelf A1');

    // Book 2 Copies
    insertCopy.run(b2, 'BC-DDIA-001', 'available', 'Floor 2, Shelf B3');
    insertCopy.run(b2, 'BC-DDIA-002', 'available', 'Floor 2, Shelf B3');

    // Book 3 Copies
    insertCopy.run(b3, 'BC-ARCH-001', 'available', 'Floor 1, Shelf C2');

    // Book 4 Copies
    insertCopy.run(b4, 'BC-CLRS-001', 'available', 'Floor 1, Shelf D4');
    insertCopy.run(b4, 'BC-CLRS-002', 'on_loan', 'Floor 1, Shelf D4');

    // 8. Seed an active loan and an overdue loan
    const pastLoanDueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days overdue
    const futureDueDate = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(); // 9 days in future

    // Alex has BC-DBS-003 (id 3)
    db.prepare(`
      INSERT INTO loans (copy_id, member_id, checked_out_at, due_at)
      VALUES (3, 1, datetime('now', '-5 days'), ?)
    `).run(futureDueDate);

    // Priya has BC-CLRS-002 (id 8) which is overdue!
    db.prepare(`
      INSERT INTO loans (copy_id, member_id, checked_out_at, due_at, fine_amount)
      VALUES (8, 2, datetime('now', '-19 days'), ?, 5.0)
    `).run(pastLoanDueDate);
  });

  seedTransaction();
  console.log('Sample books, copies, members, loans and categories seeded successfully.');
}

if (process.argv[1]?.includes('seed')) {
  seedData();
}

