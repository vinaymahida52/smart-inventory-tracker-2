import { Router } from 'express';
import QRCode from 'qrcode';
import { db } from '../db/init.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();

function withStatus(p) {
  return {
    ...p,
    status: p.quantity <= 0 ? 'out' : p.quantity <= p.low_stock_threshold ? 'low' : 'ok',
  };
}

router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY name').all();
  res.json(rows.map(withStatus));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Product not found' });
  res.json(withStatus(row));
});

router.get('/:id/qrcode', async (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Product not found' });
  try {
    const dataUrl = await QRCode.toDataURL(row.sku, { margin: 1, width: 300 });
    res.json({ sku: row.sku, dataUrl });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

router.get('/scan/:code', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE sku = ?').get(req.params.code);
  if (!row) return res.status(404).json({ error: 'No product matches that code' });
  res.json(withStatus(row));
});

router.post('/', requireRole('admin', 'manager'), (req, res) => {
  const { name, sku, category, unit, quantity, low_stock_threshold, cost_price, sell_price } = req.body;
  if (!name || !sku) return res.status(400).json({ error: 'Name and SKU are required' });
  try {
    const info = db
      .prepare(`
        INSERT INTO products (name, sku, category, unit, quantity, low_stock_threshold, cost_price, sell_price, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        name,
        sku.trim(),
        category || 'General',
        unit || 'pcs',
        Number(quantity) || 0,
        Number(low_stock_threshold) || 5,
        Number(cost_price) || 0,
        Number(sell_price) || 0,
        req.user.id
      );
    const row = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
    req.app.get('io').emit('product-created', withStatus(row));
    res.status(201).json(withStatus(row));
  } catch (e) {
    res.status(409).json({ error: 'SKU already exists' });
  }
});

router.put('/:id', requireRole('admin', 'manager'), (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  const { name, sku, category, unit, low_stock_threshold, cost_price, sell_price } = req.body;
  db.prepare(`
    UPDATE products SET name = ?, sku = ?, category = ?, unit = ?, low_stock_threshold = ?,
      cost_price = ?, sell_price = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ?? existing.name,
    sku ?? existing.sku,
    category ?? existing.category,
    unit ?? existing.unit,
    low_stock_threshold ?? existing.low_stock_threshold,
    cost_price ?? existing.cost_price,
    sell_price ?? existing.sell_price,
    req.params.id
  );
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  req.app.get('io').emit('product-updated', withStatus(row));
  res.json(withStatus(row));
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  req.app.get('io').emit('product-deleted', { id: Number(req.params.id) });
  res.status(204).end();
});

// Adjust stock (+/-) — used by manual edit and QR scan workflows
router.post('/:id/stock', (req, res) => {
  const { delta, reason } = req.body;
  const change = Number(delta);
  if (!Number.isInteger(change) || change === 0) {
    return res.status(400).json({ error: 'delta must be a non-zero integer' });
  }
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const newQty = existing.quantity + change;
  if (newQty < 0) return res.status(400).json({ error: 'Stock cannot go below zero' });

  db.prepare("UPDATE products SET quantity = ?, updated_at = datetime('now') WHERE id = ?").run(
    newQty,
    req.params.id
  );
  db.prepare(
    'INSERT INTO stock_movements (product_id, change_qty, reason, user_id) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, change, reason || (change > 0 ? 'restock' : 'sale'), req.user.id);

  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  const payload = withStatus(row);
  req.app.get('io').emit('stock-updated', payload);
  res.json(payload);
});

router.get('/:id/movements', (req, res) => {
  const rows = db
    .prepare(`
      SELECT m.*, u.name as user_name FROM stock_movements m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE product_id = ? ORDER BY m.created_at DESC LIMIT 50
    `)
    .all(req.params.id);
  res.json(rows);
});

export default router;
