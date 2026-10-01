import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'inventory.sqlite');

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff')) DEFAULT 'staff',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'General',
    unit TEXT NOT NULL DEFAULT 'pcs',
    quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    cost_price REAL NOT NULL DEFAULT 0,
    sell_price REAL NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    change_qty INTEGER NOT NULL,
    reason TEXT NOT NULL DEFAULT 'adjustment',
    user_id INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
`);

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    const insertUser = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    );
    const hash = (pwd) => bcrypt.hashSync(pwd, 10);
    insertUser.run('Admin', 'admin@dukaan.app', hash('admin123'), 'admin');
    insertUser.run('Staff Demo', 'staff@dukaan.app', hash('staff123'), 'staff');
  }

  const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  if (productCount === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (name, sku, category, unit, quantity, low_stock_threshold, cost_price, sell_price, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    const demo = [
      ['Parle-G Biscuit 100g', 'SKU-PG100', 'Snacks', 'pcs', 48, 10, 8, 10],
      ['Amul Taaza Milk 500ml', 'SKU-AT500', 'Dairy', 'pcs', 6, 8, 24, 28],
      ['Tata Salt 1kg', 'SKU-TS1KG', 'Grocery', 'pcs', 30, 5, 18, 22],
      ['Colgate Toothpaste 150g', 'SKU-CT150', 'Personal Care', 'pcs', 3, 6, 55, 68],
      ['Maggi Noodles 70g', 'SKU-MN70', 'Snacks', 'pcs', 60, 15, 12, 14],
      ['Surf Excel 1kg', 'SKU-SE1KG', 'Household', 'pcs', 2, 5, 95, 115],
      ['Britannia Bread', 'SKU-BB400', 'Bakery', 'pcs', 14, 8, 35, 45],
      ['Red Label Tea 250g', 'SKU-RL250', 'Beverages', 'pcs', 22, 6, 60, 75],
    ];
    for (const p of demo) insertProduct.run(...p);
  }
}

seed();
