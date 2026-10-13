import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-library-jwt-key-2026';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerMemberSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  maxLoans: z.number().int().positive().optional().default(5),
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid login details', details: parse.error.issues });
    return;
  }

  const { email, password } = parse.data;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // If member, look up member record
  let memberId: number | undefined;
  let memberNumber: string | undefined;
  let memberStatus: string | undefined;

  if (user.role === 'member') {
    const member = db.prepare('SELECT * FROM members WHERE user_id = ?').get(user.id) as any;
    if (member) {
      memberId = member.id;
      memberNumber = member.member_number;
      memberStatus = member.status;
    }
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      memberId,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      memberId,
      memberNumber,
      memberStatus,
    },
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }

  const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.user.id) as any;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  let memberData = null;
  if (user.role === 'member') {
    memberData = db.prepare('SELECT * FROM members WHERE user_id = ?').get(user.id);
  }

  res.json({ user, member: memberData });
});

// POST /api/auth/oauth - Sign in or register with Apple / Google
const oauthSchema = z.object({
  provider: z.enum(['apple', 'google']),
  email: z.string().email(),
  name: z.string().optional(),
});

router.post('/oauth', (req, res) => {
  const parse = oauthSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid OAuth payload', details: parse.error.issues });
    return;
  }

  const { provider, email, name } = parse.data;
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

  if (!user) {
    // Automatically provision verified OAuth member in SQLite
    const displayName = name || (provider === 'apple' ? 'Apple User' : 'Google User');
    const randomHash = bcrypt.hashSync(Math.random().toString(36), 10);
    
    const insertRes = db.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, 'member')
    `).run(email, randomHash, displayName);

    const newUserId = insertRes.lastInsertRowid;
    const memberNum = `MEM-${Math.floor(10000 + Math.random() * 90000)}`;

    db.prepare(`
      INSERT INTO members (user_id, member_number, status, max_loans)
      VALUES (?, ?, 'active', 5)
    `).run(newUserId, memberNum);

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId) as any;
  }

  let memberId: number | undefined;
  let memberNumber: string | undefined;
  let memberStatus: string | undefined;

  if (user.role === 'member') {
    const member = db.prepare('SELECT * FROM members WHERE user_id = ?').get(user.id) as any;
    if (member) {
      memberId = member.id;
      memberNumber = member.member_number;
      memberStatus = member.status;
    }
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      memberId,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      memberId,
      memberNumber,
      memberStatus,
    },
  });
});

export default router;

