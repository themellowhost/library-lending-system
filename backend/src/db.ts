import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../library.db');
export const db = new Database(dbPath);

// Enable foreign key constraints and write-ahead logging (WAL) for high concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export function initDatabase() {
  const schema = `
  -- Users & Authentication
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT CHECK(role IN ('member', 'librarian', 'admin')) NOT NULL DEFAULT 'member',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Members Profile
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    member_number TEXT UNIQUE NOT NULL,
    phone TEXT,
    max_loans INTEGER NOT NULL DEFAULT 5,
    status TEXT CHECK(status IN ('active', 'suspended', 'expired')) NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Categories
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
  );

  -- Authors
  CREATE TABLE IF NOT EXISTS authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  -- Books (Catalog metadata with optional reader & open access links)
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    isbn TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    publisher TEXT,
    category_id INTEGER,
    published_year INTEGER,
    description TEXT,
    cover_image_url TEXT,
    pdf_url TEXT,
    reader_url TEXT,
    ia_identifier TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  -- Book-Authors Many-to-Many
  CREATE TABLE IF NOT EXISTS book_authors (
    book_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    PRIMARY KEY (book_id, author_id),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
  );

  -- Copies (Physical inventory)
  CREATE TABLE IF NOT EXISTS copies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    barcode TEXT UNIQUE NOT NULL,
    status TEXT CHECK(status IN ('available', 'on_loan', 'on_hold', 'maintenance', 'lost')) NOT NULL DEFAULT 'available',
    location TEXT DEFAULT 'Main Stacks',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  -- Loans (Checkout and Return)
  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    copy_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    checked_out_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_at DATETIME NOT NULL,
    returned_at DATETIME,
    renewal_count INTEGER DEFAULT 0,
    fine_amount REAL DEFAULT 0.0,
    fine_paid INTEGER DEFAULT 0,
    FOREIGN KEY (copy_id) REFERENCES copies(id),
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  -- Critical Partial Unique Index: A copy can only have ONE active loan at any given time!
  CREATE UNIQUE INDEX IF NOT EXISTS unique_active_loan_per_copy 
  ON loans (copy_id) 
  WHERE returned_at IS NULL;

  -- Holds / Reservations Queue
  CREATE TABLE IF NOT EXISTS holds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('waiting', 'ready_for_pickup', 'fulfilled', 'cancelled', 'expired')) NOT NULL DEFAULT 'waiting',
    placed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ready_at DATETIME,
    expires_at DATETIME,
    allocated_copy_id INTEGER,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (allocated_copy_id) REFERENCES copies(id) ON DELETE SET NULL
  );

  -- Index: Ensure member doesn't hold the same book twice simultaneously while active
  CREATE UNIQUE INDEX IF NOT EXISTS unique_active_hold_per_member_book
  ON holds (book_id, member_id)
  WHERE status IN ('waiting', 'ready_for_pickup');

  -- Immutable Circulation Audit Log
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER,
    performed_by_id INTEGER,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Loan Extension Requests (Member Application & Librarian Approval)
  CREATE TABLE IF NOT EXISTS loan_extensions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    requested_days INTEGER NOT NULL DEFAULT 7,
    reason TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) NOT NULL DEFAULT 'pending',
    reviewed_by_id INTEGER,
    review_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by_id) REFERENCES users(id) ON DELETE SET NULL
  );

  -- Index: Only one pending extension request per loan
  CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_extension_per_loan
  ON loan_extensions (loan_id)
  WHERE status = 'pending';
  `;

  db.exec(schema);

  // Safe ALTER TABLE additions for existing database instances
  const columnsToAdd = [
    { table: 'loans', col: 'renewal_count INTEGER DEFAULT 0' },
    { table: 'books', col: 'cover_image_url TEXT' },
    { table: 'books', col: 'pdf_url TEXT' },
    { table: 'books', col: 'reader_url TEXT' },
    { table: 'books', col: 'ia_identifier TEXT' }
  ];

  for (const item of columnsToAdd) {
    try {
      db.prepare(`ALTER TABLE ${item.table} ADD COLUMN ${item.col}`).run();
    } catch (e) {
      // Column already exists
    }
  }

  console.log('Database schema created and verified successfully.');
}

export function logAuditEvent(action: string, targetType: string, targetId?: number, performedById?: number, details?: string) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (action, target_type, target_id, performed_by_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(action, targetType, targetId || null, performedById || null, details || null);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// Background Worker: Reaps expired holds and advances queue to next waiting member
export function reapExpiredHolds(): number {
  const expiredHolds = db.prepare(`
    SELECT h.*, c.id as copy_id, b.id as book_id
    FROM holds h
    JOIN copies c ON h.allocated_copy_id = c.id
    JOIN books b ON h.book_id = b.id
    WHERE h.status = 'ready_for_pickup' AND datetime('now') > datetime(h.expires_at)
  `).all() as any[];

  let count = 0;
  for (const hold of expiredHolds) {
    const reapTx = db.transaction(() => {
      // 1. Mark expired
      db.prepare(`UPDATE holds SET status = 'expired' WHERE id = ?`).run(hold.id);

      // 2. Find next waiting reservation
      const nextHold = db.prepare(`
        SELECT * FROM holds 
        WHERE book_id = ? AND status = 'waiting'
        ORDER BY placed_at ASC LIMIT 1
      `).get(hold.book_id) as any;

      if (nextHold) {
        const pickupExpires = new Date();
        pickupExpires.setDate(pickupExpires.getDate() + 3);
        db.prepare(`
          UPDATE holds 
          SET status = 'ready_for_pickup', ready_at = datetime('now'), expires_at = ?, allocated_copy_id = ?
          WHERE id = ?
        `).run(pickupExpires.toISOString(), hold.allocated_copy_id, nextHold.id);
      } else {
        // Return copy to available on shelf
        db.prepare(`UPDATE copies SET status = 'available' WHERE id = ?`).run(hold.allocated_copy_id);
      }
    });

    try {
      reapTx();
      count++;
    } catch (e) {
      console.error(`Error reaping hold ${hold.id}`, e);
    }
  }

  return count;
}
