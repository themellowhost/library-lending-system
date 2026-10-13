import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// GET /api/members - List members (Librarian/Admin)
router.get('/', authenticate, authorize(['librarian', 'admin']), (req, res) => {
  const members = db.prepare(`
    SELECT 
      m.id,
      m.member_number,
      m.phone,
      m.max_loans,
      m.status,
      m.created_at,
      u.id as user_id,
      u.name,
      u.email,
      (SELECT COUNT(*) FROM loans l WHERE l.member_id = m.id AND l.returned_at IS NULL) as active_loans_count,
      (SELECT COUNT(*) FROM loans l WHERE l.member_id = m.id AND l.returned_at IS NULL AND datetime('now') > datetime(l.due_at)) as overdue_loans_count
    FROM members m
    JOIN users u ON m.user_id = u.id
    ORDER BY m.id DESC
  `).all();

  res.json(members);
});

// POST /api/members - Register new member (Librarian/Admin)
const registerMemberSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).default('password123'),
  phone: z.string().optional(),
  maxLoans: z.number().int().min(1).default(5),
  status: z.enum(['active', 'suspended', 'expired']).default('active'),
});

router.post('/', authenticate, authorize(['librarian', 'admin']), (req, res) => {
  const parse = registerMemberSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Validation failed', details: parse.error.issues });
    return;
  }

  const { name, email, password, phone, maxLoans, status } = parse.data;

  // Check unique email
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingUser) {
    res.status(409).json({ error: 'User with this email already exists' });
    return;
  }

  const createMemberTx = db.transaction(() => {
    const passwordHash = bcrypt.hashSync(password, 10);
    const userRes = db.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, 'member')
    `).run(email, passwordHash, name);

    const userId = Number(userRes.lastInsertRowid);
    const memberNumber = `MEM-${Date.now().toString().slice(-5)}`;

    const memberRes = db.prepare(`
      INSERT INTO members (user_id, member_number, phone, max_loans, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, memberNumber, phone || null, maxLoans, status);

    return {
      id: Number(memberRes.lastInsertRowid),
      userId,
      memberNumber,
      name,
      email,
      status,
      maxLoans,
    };
  });

  try {
    const member = createMemberTx();
    res.status(201).json({ message: 'Member registered successfully', member });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to register member', details: err.message });
  }
});

// PATCH /api/members/:id/status - Update member status (e.g., active, suspended)
router.patch('/:id/status', authenticate, authorize(['librarian', 'admin']), (req, res) => {
  const memberId = Number(req.params.id);
  const statusSchema = z.object({
    status: z.enum(['active', 'suspended', 'expired']),
  });

  const parse = statusSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  const result = db.prepare('UPDATE members SET status = ? WHERE id = ?').run(parse.data.status, memberId);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  res.json({ message: 'Member status updated', status: parse.data.status });
});

export default router;

