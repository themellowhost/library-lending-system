import { Router } from 'express';
import { z } from 'zod';
import { db, logAuditEvent } from '../db.js';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// ==========================================
// 1. CHECKOUT A BOOK (TRANSACTIONAL)
// ==========================================
const checkoutSchema = z.object({
  memberNumber: z.string().min(1).optional(),
  memberId: z.number().int().positive().optional(),
  copyBarcode: z.string().min(1),
  loanDays: z.number().int().positive().default(14),
});

router.post('/checkout', authenticate, authorize(['librarian', 'admin']), (req: AuthenticatedRequest, res) => {
  const parse = checkoutSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Validation failed', details: parse.error.issues });
    return;
  }

  const { memberNumber, memberId, copyBarcode, loanDays } = parse.data;

  // Run everything inside an ACID transaction
  const checkoutTransaction = db.transaction(() => {
    // 1. Find Member
    let member: any;
    if (memberId) {
      member = db.prepare(`
        SELECT m.*, u.name, u.email 
        FROM members m 
        JOIN users u ON m.user_id = u.id 
        WHERE m.id = ?
      `).get(memberId);
    } else if (memberNumber) {
      member = db.prepare(`
        SELECT m.*, u.name, u.email 
        FROM members m 
        JOIN users u ON m.user_id = u.id 
        WHERE m.member_number = ?
      `).get(memberNumber);
    } else {
      throw new Error('Member ID or Member Number must be provided');
    }

    if (!member) {
      throw new Error('Member not found');
    }

    // 2. Enforce Rule: Member status must be active
    if (member.status !== 'active') {
      throw new Error(`Member account is ${member.status}. Only active members can borrow.`);
    }

    // 3. Enforce Rule: Check loan limit
    const activeLoansCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM loans 
      WHERE member_id = ? AND returned_at IS NULL
    `).get(member.id) as { count: number };

    if (activeLoansCount.count >= member.max_loans) {
      throw new Error(`Member has reached maximum borrowing limit of ${member.max_loans} books (currently has ${activeLoansCount.count} active loans).`);
    }

    // 4. Find Copy
    const copy = db.prepare(`
      SELECT c.*, b.title, b.id as book_id 
      FROM copies c 
      JOIN books b ON c.book_id = b.id 
      WHERE c.barcode = ?
    `).get(copyBarcode) as any;

    if (!copy) {
      throw new Error(`Physical copy with barcode "${copyBarcode}" not found.`);
    }

    // 5. Enforce Rule: Copy must be available (or assigned to this member via hold)
    if (copy.status === 'on_loan') {
      throw new Error(`Copy "${copyBarcode}" is already on loan to another borrower.`);
    }

    if (copy.status === 'on_hold') {
      // Check if this specific member is the hold holder
      const memberHold = db.prepare(`
        SELECT * FROM holds 
        WHERE book_id = ? AND member_id = ? AND status = 'ready_for_pickup'
      `).get(copy.book_id, member.id) as any;

      if (!memberHold) {
        throw new Error(`This copy is currently on hold for another member.`);
      }
    } else if (copy.status !== 'available') {
      throw new Error(`Copy "${copyBarcode}" is currently not available (status: ${copy.status}).`);
    }

    // 6. Calculate due date
    const checkedOutAt = new Date().toISOString();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);
    const dueAt = dueDate.toISOString();

    // 7. Insert Loan Record
    const insertLoan = db.prepare(`
      INSERT INTO loans (copy_id, member_id, checked_out_at, due_at)
      VALUES (?, ?, ?, ?)
    `).run(copy.id, member.id, checkedOutAt, dueAt);

    // 8. Update Copy Status to 'on_loan'
    db.prepare(`
      UPDATE copies 
      SET status = 'on_loan' 
      WHERE id = ?
    `).run(copy.id);

    // 9. If member had an active hold on this book, fulfill it
    db.prepare(`
      UPDATE holds 
      SET status = 'fulfilled' 
      WHERE book_id = ? AND member_id = ? AND status IN ('waiting', 'ready_for_pickup')
    `).run(copy.book_id, member.id);

    // 10. Immutable Audit log
    logAuditEvent(
      'CHECKOUT',
      'LOAN',
      Number(insertLoan.lastInsertRowid),
      req.user?.id,
      `Checked out copy ${copy.barcode} to member ${member.member_number} (${member.name})`
    );

    return {
      loanId: insertLoan.lastInsertRowid,
      copyBarcode: copy.barcode,
      bookTitle: copy.title,
      memberName: member.name,
      memberNumber: member.member_number,
      checkedOutAt,
      dueAt,
    };
  });

  try {
    const result = checkoutTransaction();
    res.status(201).json({
      message: 'Checkout completed successfully',
      loan: result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 2. RETURN A BOOK (TRANSACTIONAL)
// ==========================================
const returnSchema = z.object({
  copyBarcode: z.string().min(1),
});

router.post('/return', authenticate, authorize(['librarian', 'admin']), (req: AuthenticatedRequest, res) => {
  const parse = returnSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Validation failed', details: parse.error.issues });
    return;
  }

  const { copyBarcode } = parse.data;

  const returnTransaction = db.transaction(() => {
    // 1. Find Copy
    const copy = db.prepare(`
      SELECT c.*, b.id as book_id, b.title 
      FROM copies c 
      JOIN books b ON c.book_id = b.id 
      WHERE c.barcode = ?
    `).get(copyBarcode) as any;

    if (!copy) {
      throw new Error(`Copy with barcode "${copyBarcode}" not found.`);
    }

    // 2. Find active loan for this copy
    const activeLoan = db.prepare(`
      SELECT l.*, m.member_number, u.name as member_name, u.email as member_email
      FROM loans l
      JOIN members m ON l.member_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE l.copy_id = ? AND l.returned_at IS NULL
    `).get(copy.id) as any;

    if (!activeLoan) {
      throw new Error(`No active loan found for copy "${copyBarcode}". It may already have been returned.`);
    }

    const returnDate = new Date();
    const returnDateStr = returnDate.toISOString();
    const dueDate = new Date(activeLoan.due_at);

    // 3. Calculate Overdue & Fine ($1 per day overdue)
    let isOverdue = false;
    let fineAmount = 0.0;
    if (returnDate > dueDate) {
      isOverdue = true;
      const overdueDays = Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      fineAmount = overdueDays * 1.0;
    }

    // 4. Close Active Loan
    db.prepare(`
      UPDATE loans 
      SET returned_at = ?, fine_amount = ? 
      WHERE id = ?
    `).run(returnDateStr, fineAmount, activeLoan.id);

    // 5. Check if there is a hold waiting for this book
    const nextHold = db.prepare(`
      SELECT h.*, u.name as member_name, u.email as member_email 
      FROM holds h
      JOIN members m ON h.member_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE h.book_id = ? AND h.status = 'waiting'
      ORDER BY h.placed_at ASC
      LIMIT 1
    `).get(copy.book_id) as any;

    let newCopyStatus = 'available';
    let holdNotice = null;

    if (nextHold) {
      // Allocate copy to hold queue member
      newCopyStatus = 'on_hold';
      const pickupExpires = new Date();
      pickupExpires.setDate(pickupExpires.getDate() + 3); // 3 days pickup window

      db.prepare(`
        UPDATE holds 
        SET status = 'ready_for_pickup', ready_at = ?, expires_at = ?, allocated_copy_id = ?
        WHERE id = ?
      `).run(returnDateStr, pickupExpires.toISOString(), copy.id, nextHold.id);

      holdNotice = {
        holdId: nextHold.id,
        memberId: nextHold.member_id,
        memberName: nextHold.member_name,
        expiresAt: pickupExpires.toISOString(),
      };
    }

    // 6. Update copy status
    db.prepare(`
      UPDATE copies 
      SET status = ? 
      WHERE id = ?
    `).run(newCopyStatus, copy.id);

    // 7. Audit log
    logAuditEvent(
      'RETURN',
      'LOAN',
      activeLoan.id,
      req.user?.id,
      `Returned copy ${copy.barcode}. Overdue: ${isOverdue}, Fine: $${fineAmount}. Copy status now: ${newCopyStatus}`
    );

    return {
      loanId: activeLoan.id,
      copyBarcode: copy.barcode,
      bookTitle: copy.title,
      returnedAt: returnDateStr,
      isOverdue,
      fineAmount,
      nextHoldAssigned: holdNotice,
      copyStatus: newCopyStatus,
    };
  });

  try {
    const result = returnTransaction();
    res.json({
      message: 'Item returned successfully',
      details: result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 3. RENEW A LOAN (+7 DAYS)
// ==========================================
router.post('/:id/renew', authenticate, (req: AuthenticatedRequest, res) => {
  const loanId = Number(req.params.id);

  const renewTransaction = db.transaction(() => {
    const loan = db.prepare(`
      SELECT l.*, c.barcode, c.book_id, b.title 
      FROM loans l 
      JOIN copies c ON l.copy_id = c.id 
      JOIN books b ON c.book_id = b.id 
      WHERE l.id = ?
    `).get(loanId) as any;

    if (!loan) {
      throw new Error('Loan record not found');
    }

    if (loan.returned_at) {
      throw new Error('Cannot renew an already returned loan');
    }

    // If user is a member, verify ownership
    if (req.user?.role === 'member' && loan.member_id !== req.user.memberId) {
      throw new Error('Cannot renew loans belonging to other members');
    }

    // Rule 1: Cannot renew if overdue
    const isOverdue = new Date() > new Date(loan.due_at);
    if (isOverdue) {
      throw new Error('Item is already overdue and cannot be renewed. Please return it to the desk.');
    }

    // Rule 2: Renewal limit (max 2 renewals)
    if (loan.renewal_count >= 2) {
      throw new Error('Maximum renewal limit (2 times) reached for this loan.');
    }

    // Rule 3: Cannot renew if other members are waiting in the hold queue
    const activeHolds = db.prepare(`
      SELECT COUNT(*) as count 
      FROM holds 
      WHERE book_id = ? AND status IN ('waiting', 'ready_for_pickup')
    `).get(loan.book_id) as { count: number };

    if (activeHolds.count > 0) {
      throw new Error('Cannot renew: Other library members are waiting in the reservation queue.');
    }

    // Extend due date by 7 days
    const currentDue = new Date(loan.due_at);
    currentDue.setDate(currentDue.getDate() + 7);
    const newDueDateStr = currentDue.toISOString();

    db.prepare(`
      UPDATE loans 
      SET due_at = ?, renewal_count = renewal_count + 1 
      WHERE id = ?
    `).run(newDueDateStr, loan.id);

    logAuditEvent(
      'RENEWAL',
      'LOAN',
      loan.id,
      req.user?.id,
      `Loan for copy ${loan.barcode} extended to ${newDueDateStr}`
    );

    return {
      loanId: loan.id,
      newDueDate: newDueDateStr,
      renewalCount: (loan.renewal_count || 0) + 1,
    };
  });

  try {
    const result = renewTransaction();
    res.json({ message: 'Loan renewed successfully (+7 days)', ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 4. PAY FINE FOR A LOAN
// ==========================================
router.post('/:id/pay-fine', authenticate, authorize(['librarian', 'admin']), (req: AuthenticatedRequest, res) => {
  const loanId = Number(req.params.id);
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId) as any;

  if (!loan) {
    res.status(404).json({ error: 'Loan not found' });
    return;
  }

  if (loan.fine_amount <= 0 || loan.fine_paid === 1) {
    res.status(400).json({ error: 'No unpaid fine on this loan' });
    return;
  }

  db.prepare('UPDATE loans SET fine_paid = 1 WHERE id = ?').run(loanId);
  logAuditEvent('FINE_PAID', 'LOAN', loanId, req.user?.id, `Fine of $${loan.fine_amount.toFixed(2)} marked paid.`);

  res.json({ message: `Fine of $${loan.fine_amount.toFixed(2)} collected successfully.` });
});

// ==========================================
// 5. MEMBER CURRENT LOANS & HISTORY
// ==========================================
router.get('/my-loans', authenticate, (req: AuthenticatedRequest, res) => {
  if (!req.user || !req.user.memberId) {
    res.status(403).json({ error: 'Only members have borrowing history' });
    return;
  }

  const loans = db.prepare(`
    SELECT 
      l.id,
      l.checked_out_at,
      l.due_at,
      l.returned_at,
      l.renewal_count,
      l.fine_amount,
      l.fine_paid,
      c.barcode,
      c.location,
      b.id as book_id,
      b.title as book_title,
      b.isbn,
      CASE 
        WHEN l.returned_at IS NULL AND datetime('now') > datetime(l.due_at) THEN 1 
        ELSE 0 
      END as is_overdue
    FROM loans l
    JOIN copies c ON l.copy_id = c.id
    JOIN books b ON c.book_id = b.id
    WHERE l.member_id = ?
    ORDER BY l.checked_out_at DESC
  `).all(req.user.memberId);

  res.json(loans);
});

// ==========================================
// 6. OVERDUE & CIRCULATION REPORTS
// ==========================================
router.get('/reports/overdue', authenticate, authorize(['librarian', 'admin']), (req, res) => {
  const overdueLoans = db.prepare(`
    SELECT 
      l.id as loan_id,
      l.checked_out_at,
      l.due_at,
      l.fine_amount,
      l.fine_paid,
      c.barcode,
      b.title as book_title,
      m.id as member_id,
      m.member_number,
      u.name as member_name,
      u.email as member_email,
      CAST((julianday('now') - julianday(l.due_at)) AS INTEGER) as days_overdue
    FROM loans l
    JOIN copies c ON l.copy_id = c.id
    JOIN books b ON c.book_id = b.id
    JOIN members m ON l.member_id = m.id
    JOIN users u ON m.user_id = u.id
    WHERE l.returned_at IS NULL AND datetime('now') > datetime(l.due_at)
    ORDER BY days_overdue DESC
  `).all();

  res.json(overdueLoans);
});

router.get('/reports/circulation', authenticate, authorize(['librarian', 'admin']), (req, res) => {
  const summary = db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM books) as total_titles,
      (SELECT COUNT(*) FROM copies) as total_copies,
      (SELECT COUNT(*) FROM copies WHERE status = 'available') as available_copies,
      (SELECT COUNT(*) FROM copies WHERE status = 'on_loan') as active_loans_count,
      (SELECT COUNT(*) FROM copies WHERE status = 'on_hold') as on_hold_copies,
      (SELECT COUNT(*) FROM members WHERE status = 'active') as active_members,
      (SELECT COUNT(*) FROM loans WHERE returned_at IS NULL AND datetime('now') > datetime(due_at)) as overdue_loans_count
  `).get();

  const topCirculatedBooks = db.prepare(`
    SELECT 
      b.id,
      b.title,
      b.isbn,
      COUNT(l.id) as total_checkouts
    FROM books b
    JOIN copies c ON b.id = c.book_id
    JOIN loans l ON c.id = l.copy_id
    GROUP BY b.id
    ORDER BY total_checkouts DESC
    LIMIT 5
  `).all();

  const recentAudits = db.prepare(`
    SELECT * FROM audit_logs ORDER BY id DESC LIMIT 6
  `).all();

  res.json({
    summary,
    topCirculatedBooks,
    recentAudits,
  });
});

export default router;
