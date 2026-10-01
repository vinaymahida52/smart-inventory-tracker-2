import { Router } from 'express';
import { db } from '../db/init.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', (req, res) => {
  const products = db.prepare('SELECT * FROM products').all();
  const totalProducts = products.length;
  const totalUnits = products.reduce((s, p) => s + p.quantity, 0);
  const inventoryValue = products.reduce((s, p) => s + p.quantity * p.cost_price, 0);
  const potentialRevenue = products.reduce((s, p) => s + p.quantity * p.sell_price, 0);
  const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= p.low_stock_threshold);
  const outOfStock = products.filter((p) => p.quantity <= 0);

  const byCategory = {};
  for (const p of products) {
    byCategory[p.category] = byCategory[p.category] || { category: p.category, units: 0, value: 0 };
    byCategory[p.category].units += p.quantity;
    byCategory[p.category].value += p.quantity * p.cost_price;
  }

  const recentMovements = db
    .prepare(`
      SELECT m.*, p.name as product_name, u.name as user_name
      FROM stock_movements m
      JOIN products p ON p.id = m.product_id
      LEFT JOIN users u ON u.id = m.user_id
      ORDER BY m.created_at DESC LIMIT 10
    `)
    .all();

  const movementsLast7Days = db
    .prepare(`
      SELECT date(created_at) as day,
        SUM(CASE WHEN change_qty > 0 THEN change_qty ELSE 0 END) as restocked,
        SUM(CASE WHEN change_qty < 0 THEN -change_qty ELSE 0 END) as sold
      FROM stock_movements
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY day ORDER BY day
    `)
    .all();

  res.json({
    totalProducts,
    totalUnits,
    inventoryValue,
    potentialRevenue,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    lowStockItems: lowStock.slice(0, 20),
    byCategory: Object.values(byCategory),
    recentMovements,
    movementsLast7Days,
  });
});

export default router;
