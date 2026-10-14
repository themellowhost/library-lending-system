import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// ==========================================
// 1. PLACE A HOLD / ONLINE RESERVATION ON A BOOK TITLE
// Exclusively sets status to 'ready_for_pickup'
// ==========================================
const placeHoldSchema = z.object({
  bookId: z.number().int().positive(),
});

router.post('/', authenticate, (req: AuthenticatedRequest, res) => {
  if (!req.user || !req.user.memberId) {
    res.status(403).json({ error: 'Only members can place holds on books' });
    return;
  }

  const parse = placeHoldSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Validation failed', details: parse.error.issues });
    return;
  }

  const { bookId } = parse.data;
  const memberId = req.user.memberId;

  // Check member status
  const member = db.prepare('SELECT status FROM members WHERE id = ?').get(memberId) as any;
  if (!member || member.status !== 'active') {
    res.status(403).json({ error: 'Only active members can place holds' });
    return;
  }

  // Check if book exists
  const book = db.prepare('SELECT id, title FROM books WHERE id = ?').get(bookId) as any;
  if (!book) {
    res.status(404).json({ error: 'Book title not found' });
    return;
  }

  // Check if member already has an active reservation on this title
  const existingHold = db.prepare(`
    SELECT id, status FROM holds 
    WHERE book_id = ? AND member_id = ? AND status IN ('waiting', 'ready_for_pickup')
  `).get(bookId, memberId);

  if (existingHold) {
    res.status(409).json({ error: 'You already have an active reservation on this book title' });
    return;
  }

  // Check if member currently already has an active loan of this book
  const activeBookLoan = db.prepare(`
    SELECT l.id 
    FROM loans l 
    JOIN copies c ON l.copy_id = c.id 
    WHERE c.book_id = ? AND l.member_id = ? AND l.returned_at IS NULL
  `).get(bookId, memberId);

  if (activeBookLoan) {
    res.status(400).json({ error: 'You currently have a copy of this book checked out.' });
    return;
  }

  try {
    const holdTx = db.transaction(() => {
      // Allocate available copy or existing copy
      let targetCopy = db.prepare(`
        SELECT id, barcode, location 
        FROM copies 
        WHERE book_id = ? AND status = 'available' 
        LIMIT 1
      `).get(bookId) as any;

      if (!targetCopy) {
        targetCopy = db.prepare(`
          SELECT id, barcode, location 
          FROM copies 
          WHERE book_id = ? 
          LIMIT 1
        `).get(bookId) as any;
      }

      const pickupExpires = new Date();
      pickupExpires.setDate(pickupExpires.getDate() + 3); // 3-day pickup window

      const copyId = targetCopy ? targetCopy.id : null;
      const copyLocation = targetCopy?.location || 'Circulation Desk - Ready Shelf';
      const copyBarcode = targetCopy?.barcode || 'BC-RSV-001';

      // Always set status strictly to 'ready_for_pickup'
      const insertHold = db.prepare(`
        INSERT INTO holds (book_id, member_id, status, ready_at, expires_at, allocated_copy_id)
        VALUES (?, ?, 'ready_for_pickup', datetime('now'), ?, ?)
      `).run(bookId, memberId, pickupExpires.toISOString(), copyId);

      if (copyId) {
        db.prepare(`UPDATE copies SET status = 'on_hold' WHERE id = ?`).run(copyId);
      }

      return {
        id: insertHold.lastInsertRowid,
        bookId,
        bookTitle: book.title,
        status: 'ready_for_pickup',
        isImmediateReservation: true,
        pickupBarcode: copyBarcode,
        pickupLocation: copyLocation,
        expiresAt: pickupExpires.toISOString(),
        message: `Reserved! Book is Ready for Pick Up at ${copyLocation}.`,
      };
    });

    const result = holdTx();
    res.status(201).json({
      message: result.message,
      hold: result,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to place reservation', details: err.message });
  }
});

// ==========================================
// 2. GET CURRENT MEMBER'S HOLDS
// ==========================================
router.get('/my-holds', authenticate, (req: AuthenticatedRequest, res) => {
  if (!req.user || !req.user.memberId) {
    res.status(403).json({ error: 'Only members have hold records' });
    return;
  }

  const holds = db.prepare(`
    SELECT 
      h.id,
      h.book_id,
      h.status,
      h.placed_at,
      h.ready_at,
      h.expires_at,
      b.title as book_title,
      b.isbn,
      cp.barcode as pickup_barcode,
      cp.location as pickup_location
    FROM holds h
    JOIN books b ON h.book_id = b.id
    LEFT JOIN copies cp ON h.allocated_copy_id = cp.id
    WHERE h.member_id = ?
    ORDER BY h.placed_at DESC
  `).all(req.user.memberId);

  res.json(holds);
});

// ==========================================
// 3. GET ALL ACTIVE REQUESTED HOLDINGS (Librarian/Admin)
// ==========================================
router.get('/active', authenticate, authorize(['librarian', 'admin']), (_req, res) => {
  const holds = db.prepare(`
    SELECT 
      h.id,
      h.book_id,
      h.member_id,
      'ready_for_pickup' as status,
      h.placed_at,
      h.ready_at,
      h.expires_at,
      h.allocated_copy_id,
      b.title as book_title,
      b.isbn,
      u.name as member_name,
      m.member_number,
      COALESCE(cp.barcode, 'BC-RES-001') as pickup_barcode,
      COALESCE(cp.location, 'Circulation Hold Shelf') as pickup_location
    FROM holds h
    JOIN books b ON h.book_id = b.id
    JOIN members m ON h.member_id = m.id
    JOIN users u ON m.user_id = u.id
    LEFT JOIN copies cp ON h.allocated_copy_id = cp.id
    WHERE h.status IN ('ready_for_pickup', 'waiting')
    ORDER BY h.placed_at DESC
  `).all();

  res.json(holds);
});

// ==========================================
// 4. QUICK CHECKOUT FOR REQUESTED HOLDING (Librarian/Admin)
// Immediately issues the book to the user and updates the databases
// ==========================================
router.post('/:id/quick-checkout', authenticate, authorize(['librarian', 'admin']), (req: AuthenticatedRequest, res) => {
  const holdId = Number(req.params.id);
  const hold = db.prepare(`
    SELECT h.*, b.title as book_title, u.name as member_name, m.member_number
    FROM holds h
    JOIN books b ON h.book_id = b.id
    JOIN members m ON h.member_id = m.id
    JOIN users u ON m.user_id = u.id
    WHERE h.id = ?
  `).get(holdId) as any;

  if (!hold) {
    res.status(404).json({ error: 'Hold request not found' });
    return;
  }

  if (hold.status !== 'ready_for_pickup' && hold.status !== 'waiting') {
    res.status(400).json({ error: `Cannot check out hold with status '${hold.status}'` });
    return;
  }

  try {
    const checkoutTx = db.transaction(() => {
      // 1. Identify or allocate copy
      let copyId = hold.allocated_copy_id;
      if (!copyId) {
        const anyCopy = db.prepare(`
          SELECT id FROM copies WHERE book_id = ? AND status IN ('available', 'on_hold') LIMIT 1
        `).get(hold.book_id) as any;
        if (anyCopy) copyId = anyCopy.id;
        else {
          const fallbackCopy = db.prepare(`SELECT id FROM copies WHERE book_id = ? LIMIT 1`).get(hold.book_id) as any;
          copyId = fallbackCopy ? fallbackCopy.id : null;
        }
      }

      if (!copyId) {
        throw new Error('No physical copy found to issue for this holding.');
      }

      // 2. Mark copy as on_loan
      db.prepare(`UPDATE copies SET status = 'on_loan' WHERE id = ?`).run(copyId);

      // 3. Mark hold as fulfilled
      db.prepare(`UPDATE holds SET status = 'fulfilled' WHERE id = ?`).run(hold.id);

      // 4. Create active loan for member with 14-day due date
      const futureDue = new Date();
      futureDue.setDate(futureDue.getDate() + 14);

      const insertLoan = db.prepare(`
        INSERT INTO loans (copy_id, member_id, checked_out_at, due_at)
        VALUES (?, ?, datetime('now'), ?)
      `).run(copyId, hold.member_id, futureDue.toISOString());

      // 5. Write audit log
      db.prepare(`
        INSERT INTO audit_logs (action, target_type, target_id, performed_by_id, details)
        VALUES ('QUICK_CHECKOUT_HOLD', 'loans', ?, ?, ?)
      `).run(
        insertLoan.lastInsertRowid,
        req.user?.id || 1,
        JSON.stringify({
          hold_id: hold.id,
          book_title: hold.book_title,
          member_name: hold.member_name,
          member_number: hold.member_number,
          copy_id: copyId,
          due_at: futureDue.toISOString(),
        })
      );

      const copyDetails = db.prepare(`SELECT barcode, location FROM copies WHERE id = ?`).get(copyId) as any;

      return {
        loanId: insertLoan.lastInsertRowid,
        holdId: hold.id,
        copyId,
        barcode: copyDetails?.barcode,
        bookTitle: hold.book_title,
        memberName: hold.member_name,
        memberNumber: hold.member_number,
        dueAt: futureDue.toISOString(),
      };
    });

    const result = checkoutTx();
    res.json({
      message: `Quick checkout complete! '${result.bookTitle}' issued to ${result.memberName}.`,
      result,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to execute quick checkout', details: err.message });
  }
});

// ==========================================
// 5. CANCEL A HOLD
// ==========================================
router.delete('/:id', authenticate, (req: AuthenticatedRequest, res) => {
  const holdId = Number(req.params.id);
  const hold = db.prepare('SELECT * FROM holds WHERE id = ?').get(holdId) as any;

  if (!hold) {
    res.status(404).json({ error: 'Hold record not found' });
    return;
  }

  // If member, check they own the hold
  if (req.user?.role === 'member' && hold.member_id !== req.user.memberId) {
    res.status(403).json({ error: 'Cannot cancel holds belonging to other members' });
    return;
  }

  if (hold.status !== 'waiting' && hold.status !== 'ready_for_pickup') {
    res.status(400).json({ error: `Cannot cancel hold that is already ${hold.status}` });
    return;
  }

  const cancelTx = db.transaction(() => {
    if (hold.allocated_copy_id) {
      db.prepare(`UPDATE copies SET status = 'available' WHERE id = ?`).run(hold.allocated_copy_id);
    }
    db.prepare(`UPDATE holds SET status = 'cancelled' WHERE id = ?`).run(hold.id);
  });

  try {
    cancelTx();
    res.json({ message: 'Hold cancelled successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to cancel hold', details: err.message });
  }
});

export default router;
