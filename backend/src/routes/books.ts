import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// GET /api/books - Search and list catalog with copy counts & availability
router.get('/', (req, res) => {
  const query = (req.query.q as string || '').trim().toLowerCase();
  const categoryId = req.query.category ? Number(req.query.category) : undefined;

  let sql = `
    SELECT 
      b.id,
      b.isbn,
      b.title,
      b.publisher,
      b.published_year,
      b.description,
      b.cover_image_url,
      b.pdf_url,
      b.reader_url,
      b.ia_identifier,
      c.id as category_id,
      c.name as category_name,
      GROUP_CONCAT(DISTINCT a.name) as authors,
      COALESCE(cp_agg.total_copies, 0) as total_copies,
      COALESCE(cp_agg.available_copies, 0) as available_copies,
      COALESCE(cp_agg.on_loan_copies, 0) as on_loan_copies,
      COALESCE(cp_agg.on_hold_copies, 0) as on_hold_copies
    FROM books b
    LEFT JOIN categories c ON b.category_id = c.id
    LEFT JOIN book_authors ba ON b.id = ba.book_id
    LEFT JOIN authors a ON ba.author_id = a.id
    LEFT JOIN (
      SELECT 
        book_id,
        COUNT(id) as total_copies,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_copies,
        SUM(CASE WHEN status = 'on_loan' THEN 1 ELSE 0 END) as on_loan_copies,
        SUM(CASE WHEN status = 'on_hold' THEN 1 ELSE 0 END) as on_hold_copies
      FROM copies
      GROUP BY book_id
    ) cp_agg ON b.id = cp_agg.book_id
  `;

  const whereClauses: string[] = [];
  const params: any[] = [];

  if (query) {
    whereClauses.push(`(
      LOWER(b.title) LIKE ? OR
      LOWER(b.isbn) LIKE ? OR
      LOWER(a.name) LIKE ? OR
      LOWER(b.publisher) LIKE ?
    )`);
    const searchPattern = `%${query}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (categoryId) {
    whereClauses.push(`b.category_id = ?`);
    params.push(categoryId);
  }

  if (whereClauses.length > 0) {
    sql += ` WHERE ` + whereClauses.join(' AND ');
  }

  sql += ` GROUP BY b.id ORDER BY b.title ASC`;

  const books = db.prepare(sql).all(...params);
  res.json(books);
});

// GET /api/books/open-search - Live search Open Library public domain archive
router.get('/open-search', async (req, res) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    res.json({ docs: [] });
    return;
  }

  try {
    const encoded = encodeURIComponent(query);
    const response = await fetch(`https://openlibrary.org/search.json?q=${encoded}&has_fulltext=true&limit=12`);
    if (!response.ok) {
      throw new Error(`Open Library API responded with ${response.status}`);
    }
    const data = await response.json() as any;

    const formatted = (data.docs || []).map((doc: any) => {
      const ia = doc.ia && doc.ia.length > 0 ? doc.ia[0] : null;
      return {
        key: doc.key,
        title: doc.title,
        author_name: doc.author_name || ['Unknown Author'],
        first_publish_year: doc.first_publish_year || null,
        cover_i: doc.cover_i,
        cover_image_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
        ia_identifier: ia,
        reader_url: ia ? `https://archive.org/embed/${ia}` : null,
        pdf_url: ia ? `https://archive.org/download/${ia}/${ia}.pdf` : null,
        edition_count: doc.edition_count || 1
      };
    });

    res.json({ docs: formatted });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to search Open Library catalog', details: err.message });
  }
});

// GET /api/books/:id - Detailed book view with individual copy statuses
router.get('/:id', (req, res) => {
  const bookId = Number(req.params.id);
  const book = db.prepare(`
    SELECT 
      b.id,
      b.isbn,
      b.title,
      b.publisher,
      b.published_year,
      b.description,
      b.cover_image_url,
      b.pdf_url,
      b.reader_url,
      b.ia_identifier,
      c.id as category_id,
      c.name as category_name,
      GROUP_CONCAT(DISTINCT a.name) as authors
    FROM books b
    LEFT JOIN categories c ON b.category_id = c.id
    LEFT JOIN book_authors ba ON b.id = ba.book_id
    LEFT JOIN authors a ON ba.author_id = a.id
    WHERE b.id = ?
    GROUP BY b.id
  `).get(bookId) as any;

  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }

  const copies = db.prepare(`
    SELECT 
      id,
      barcode,
      status,
      location,
      created_at
    FROM copies
    WHERE book_id = ?
    ORDER BY id ASC
  `).all(bookId);

  const activeHolds = db.prepare(`
    SELECT COUNT(*) as count 
    FROM holds 
    WHERE book_id = ? AND status IN ('waiting', 'ready_for_pickup')
  `).get(bookId) as any;

  res.json({
    ...book,
    copies,
    activeHoldsCount: activeHolds?.count || 0,
  });
});

// POST /api/books - Add a new book title to catalog (Librarian/Admin only)
const createBookSchema = z.object({
  isbn: z.string().min(5),
  title: z.string().min(1),
  publisher: z.string().optional(),
  publishedYear: z.number().int().optional(),
  categoryId: z.number().int().optional(),
  authors: z.array(z.string().min(1)).min(1),
  description: z.string().optional(),
  initialCopies: z.number().int().min(0).default(1),
});

router.post('/', authenticate, authorize(['librarian', 'admin']), (req, res) => {
  const parse = createBookSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Validation failed', details: parse.error.issues });
    return;
  }

  const data = parse.data;

  // Check unique ISBN
  const existing = db.prepare('SELECT id FROM books WHERE isbn = ?').get(data.isbn);
  if (existing) {
    res.status(409).json({ error: 'A book with this ISBN already exists' });
    return;
  }

  const createBookTx = db.transaction(() => {
    // 1. Insert Book
    const bookInsert = db.prepare(`
      INSERT INTO books (isbn, title, publisher, category_id, published_year, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.isbn,
      data.title,
      data.publisher || null,
      data.categoryId || null,
      data.publishedYear || null,
      data.description || null
    );

    const bookId = Number(bookInsert.lastInsertRowid);

    // 2. Link or insert authors
    for (const authorName of data.authors) {
      let author = db.prepare('SELECT id FROM authors WHERE LOWER(name) = LOWER(?)').get(authorName.trim()) as any;
      let authorId: number;
      if (!author) {
        const authInsert = db.prepare('INSERT INTO authors (name) VALUES (?)').run(authorName.trim());
        authorId = Number(authInsert.lastInsertRowid);
      } else {
        authorId = author.id;
      }

      db.prepare(`
        INSERT OR IGNORE INTO book_authors (book_id, author_id)
        VALUES (?, ?)
      `).run(bookId, authorId);
    }

    // 3. Create initial copies if requested
    const generatedCopies: string[] = [];
    if (data.initialCopies > 0) {
      for (let i = 1; i <= data.initialCopies; i++) {
        const barcode = `BC-${data.isbn.replace(/[^A-Za-z0-9]/g, '').slice(-6)}-${String(i).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;
        db.prepare(`
          INSERT INTO copies (book_id, barcode, status, location)
          VALUES (?, ?, 'available', 'Main Stacks')
        `).run(bookId, barcode);
        generatedCopies.push(barcode);
      }
    }

    return { bookId, copiesCreated: generatedCopies };
  });

  try {
    const result = createBookTx();
    res.status(201).json({ message: 'Book created successfully', ...result });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create book', details: err.message });
  }
});

// POST /api/books/:id/copies - Add physical copy to existing book (Librarian/Admin only)
const addCopySchema = z.object({
  barcode: z.string().min(3).optional(),
  location: z.string().optional().default('Main Stacks'),
});

router.post('/:id/copies', authenticate,  authorize(['librarian', 'admin']), (req, res) => {
  const bookId = Number(req.params.id);
  const book = db.prepare('SELECT id, isbn FROM books WHERE id = ?').get(bookId) as any;
  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }

  const parse = addCopySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Validation failed', details: parse.error.issues });
    return;
  }

  const barcode = parse.data.barcode || `BC-${book.isbn.replace(/[^A-Za-z0-9]/g, '').slice(-6)}-${Date.now().toString().slice(-5)}`;
  const location = parse.data.location || 'Main Stacks';

  try {
    const insertRes = db.prepare(`
      INSERT INTO copies (book_id, barcode, status, location)
      VALUES (?, ?, 'available', ?)
    `).run(bookId, barcode, location);

    res.status(201).json({
      message: 'Copy added successfully',
      copy: {
        id: insertRes.lastInsertRowid,
        bookId,
        barcode,
        status: 'available',
        location,
      },
    });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed: copies.barcode')) {
      res.status(409).json({ error: 'A copy with this barcode already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to add copy', details: err.message });
  }
});

// GET /api/books/categories/all - List categories
router.get('/categories/all', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  res.json(categories);
});

export default router;
