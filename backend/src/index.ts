import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase, reapExpiredHolds } from './db.js';
import { seedData } from './seed.js';

import authRoutes from './routes/auth.js';
import booksRoutes from './routes/books.js';
import loansRoutes from './routes/loans.js';
import holdsRoutes from './routes/holds.js';
import membersRoutes from './routes/members.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Initialize SQLite database and seed if empty
initDatabase();
seedData();

// Background timer to reap expired holds every 60 seconds
setInterval(() => {
  const reaped = reapExpiredHolds();
  if (reaped > 0) {
    console.log(`[Worker] Automatically reaped ${reaped} expired holds and promoted next in queue.`);
  }
}, 60000);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Library Lending System API', timestamp: new Date() });
});

// Trigger manual hold reaper (useful for testing and demo evaluations)
app.post('/api/admin/reap-holds', (req, res) => {
  const count = reapExpiredHolds();
  res.json({ message: `Reaped ${count} expired holds.` });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/holds', holdsRoutes);
app.use('/api/members', membersRoutes);

app.listen(PORT, () => {
  console.log(`Library Lending System backend running on http://localhost:${PORT}`);
});
