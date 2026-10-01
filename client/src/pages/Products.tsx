import { useEffect, useMemo, useState } from 'react';
import { api, type Product } from '../lib/api';
import { socket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';
import ProductModal from '../components/ProductModal';
import QrModal from '../components/QrModal';

const statusStyles: Record<Product['status'], string> = {
  ok: 'bg-emerald-400/10 text-emerald-400',
  low: 'bg-amber-400/10 text-amber-400',
  out: 'bg-red-400/10 text-red-400',
};

export default function Products() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [qrFor, setQrFor] = useState<Product | null>(null);

  function load() {
    api.get<Product[]>('/products').then(setProducts);
  }

  useEffect(() => {
    load();
    socket.on('stock-updated', load);
    socket.on('product-created', load);
    socket.on('product-updated', load);
    socket.on('product-deleted', load);
    return () => {
      socket.off('stock-updated', load);
      socket.off('product-created', load);
      socket.off('product-updated', load);
      socket.off('product-deleted', load);
    };
  }, []);

  const categories = useMemo(
    () => ['all', ...new Set(products.map((p) => p.category))],
    [products]
  );

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || p.category === category;
    return matchesSearch && matchesCategory;
  });

  async function adjustStock(p: Product, delta: number) {
    try {
      await api.post(`/products/${p.id}/stock`, { delta, reason: delta > 0 ? 'restock' : 'sale' });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update stock');
    }
  }

  async function deleteProduct(p: Product) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    await api.del(`/products/${p.id}`);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Products</h1>
          <p className="text-sm text-gray-400 mt-1">{filtered.length} of {products.length} items</p>
        </div>
        {canManage && (
          <button
            onClick={() => setEditing(null)}
            className="rounded-lg bg-emerald-400 text-gray-900 font-medium px-4 py-2 text-sm hover:bg-emerald-300"
          >
            + Add product
          </button>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          placeholder="Search by name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg px-3 py-2 text-sm">
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? 'All categories' : c}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-[var(--color-border)]">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Sell price</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="px-4 py-3">
                  <p className="text-white">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.sku}</p>
                </td>
                <td className="px-4 py-3 text-gray-300">{p.category}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[p.status]}`}>
                    {p.quantity} {p.unit}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300">₹{p.sell_price}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <button
                      onClick={() => adjustStock(p, -1)}
                      title="Sell one unit"
                      className="h-7 w-7 rounded-md border border-[var(--color-border)] text-gray-300 hover:bg-white/5"
                    >
                      −
                    </button>
                    <button
                      onClick={() => adjustStock(p, 1)}
                      title="Restock one unit"
                      className="h-7 w-7 rounded-md border border-[var(--color-border)] text-gray-300 hover:bg-white/5"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setQrFor(p)}
                      className="text-xs px-2 py-1 rounded-md border border-[var(--color-border)] text-gray-300 hover:bg-white/5"
                    >
                      QR
                    </button>
                    {canManage && (
                      <button
                        onClick={() => setEditing(p)}
                        className="text-xs px-2 py-1 rounded-md border border-[var(--color-border)] text-gray-300 hover:bg-white/5"
                      >
                        Edit
                      </button>
                    )}
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => deleteProduct(p)}
                        className="text-xs px-2 py-1 rounded-md border border-[var(--color-border)] text-red-400 hover:bg-red-400/10"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  No products match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <ProductModal product={editing} onClose={() => setEditing(undefined)} onSaved={load} />
      )}
      {qrFor && <QrModal product={qrFor} onClose={() => setQrFor(null)} />}
    </div>
  );
}
