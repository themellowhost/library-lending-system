import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// ==========================================
// 1. PLACE A HOLD ON A BOOK TITLE
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

  // Check if member already has an active hold on this title
  const existingHold = db.prepare(`
    SELECT id, status FROM holds 
    WHERE book_id = ? AND member_id = ? AND status IN ('waiting', 'ready_for_pickup')
  `).get(bookId, memberId);

  if (existingHold) {
    res.status(409).json({ error: 'You already have an active hold or reservation on this book title' });
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
      // Check if an available copy is already on the shelf!
      const availableCopy = db.prepare(`
        SELECT id, barcode, location 
        FROM copies 
        WHERE book_id = ? AND status = 'available' 
        LIMIT 1
      `).get(bookId) as any;

      if (availableCopy) {
        // Instant reservation for pickup!
        const pickupExpires = new Date();
        pickupExpires.setDate(pickupExpires.getDate() + 3); // 3 day pickup window

        const insertHold = db.prepare(`
          INSERT INTO holds (book_id, member_id, status, ready_at, expires_at, allocated_copy_id)
          VALUES (?, ?, 'ready_for_pickup', datetime('now'), ?, ?)
        `).run(bookId, memberId, pickupExpires.toISOString(), availableCopy.id);

        // Mark copy as on_hold
        db.prepare(`UPDATE copies SET status = 'on_hold' WHERE id = ?`).run(availableCopy.id);

        return {
          id: insertHold.lastInsertRowid,
          bookId,
          bookTitle: book.title,
          status: 'ready_for_pickup',
          isImmediateReservation: true,
          pickupBarcode: availableCopy.barcode,
          pickupLocation: availableCopy.location,
          expiresAt: pickupExpires.toISOString(),
          message: `Item reserved! Ready for pickup at ${availableCopy.location}. Please collect within 3 days.`,
        };
      } else {
        // No available copies right now, place on waiting queue
        const insertHold = db.prepare(`
          INSERT INTO holds (book_id, member_id, status)
          VALUES (?, ?, 'waiting')
        `).run(bookId, memberId);

        // Calculate queue position
        const queuePosition = db.prepare(`
          SELECT COUNT(*) as pos 
          FROM holds 
          WHERE book_id = ? AND status = 'waiting' AND id <= ?
        `).get(bookId, insertHold.lastInsertRowid) as { pos: number };

        return {
          id: insertHold.lastInsertRowid,
          bookId,
          bookTitle: book.title,
          status: 'waiting',
          isImmediateReservation: false,
          queuePosition: queuePosition.pos,
          message: `Hold placed in queue. You are #${queuePosition.pos} in line. We will notify you when a copy is returned.`,
        };
      }
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
// 3. CANCEL A HOLD
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
    // If copy was allocated, release copy or pass to next hold
    if (hold.allocated_copy_id) {
      const nextHold = db.prepare(`
        SELECT * FROM holds 
        WHERE book_id = ? AND status = 'waiting' AND id != ?
        ORDER BY placed_at ASC LIMIT 1
      `).get(hold.book_id, hold.id) as any;

      if (nextHold) {
        const pickupExpires = new Date();
        pickupExpires.setDate(pickupExpires.getDate() + 3);
        db.prepare(`
          UPDATE holds 
          SET status = 'ready_for_pickup', ready_at = datetime('now'), expires_at = ?, allocated_copy_id = ?
          WHERE id = ?
        `).run(pickupExpires.toISOString(), hold.allocated_copy_id, nextHold.id);
      } else {
        // Return copy to available
        db.prepare(`UPDATE copies SET status = 'available' WHERE id = ?`).run(hold.allocated_copy_id);
      }
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

