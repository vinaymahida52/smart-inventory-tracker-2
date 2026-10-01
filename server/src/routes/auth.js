import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/init.js';
import { signToken, requireAuth, requireRole } from '../auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Admin-only: create staff/manager accounts
router.post('/users', requireAuth, requireRole('admin'), (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  if (!['admin', 'manager', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    const hash = bcrypt.hashSync(password, 10);
    const info = db
      .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(name, email.toLowerCase().trim(), hash, role);
    res.status(201).json({ id: Number(info.lastInsertRowid), name, email, role });
  } catch (e) {
    res.status(409).json({ error: 'Email already registered' });
  }
});

router.get('/users', requireAuth, requireRole('admin'), (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY id').all();
  res.json(users);
});

router.delete('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
