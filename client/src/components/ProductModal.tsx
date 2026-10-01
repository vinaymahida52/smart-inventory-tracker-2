import { useState, type FormEvent } from 'react';
import { api, type Product } from '../lib/api';

interface Props {
  product?: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProductModal({ product, onClose, onSaved }: Props) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    category: product?.category || 'General',
    unit: product?.unit || 'pcs',
    quantity: product?.quantity ?? 0,
    low_stock_threshold: product?.low_stock_threshold ?? 5,
    cost_price: product?.cost_price ?? 0,
    sell_price: product?.sell_price ?? 0,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isEdit && product) {
        await api.put(`/products/${product.id}`, form);
      } else {
        await api.post('/products', form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setBusy(false);
    }
  }

  function field<K extends keyof typeof form>(key: K) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({
          ...f,
          [key]: e.target.type === 'number' ? Number(e.target.value) : e.target.value,
        })),
    };
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          {isEdit ? 'Edit product' : 'Add product'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Product name</label>
            <input required className="w-full rounded-lg px-3 py-2 text-sm" {...field('name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">SKU / barcode</label>
              <input required className="w-full rounded-lg px-3 py-2 text-sm" {...field('sku')} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Category</label>
              <input className="w-full rounded-lg px-3 py-2 text-sm" {...field('category')} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Unit</label>
              <input className="w-full rounded-lg px-3 py-2 text-sm" {...field('unit')} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                {isEdit ? 'Qty (use stock +/-)' : 'Opening qty'}
              </label>
              <input
                type="number"
                disabled={isEdit}
                className="w-full rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                {...field('quantity')}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Low stock at</label>
              <input type="number" className="w-full rounded-lg px-3 py-2 text-sm" {...field('low_stock_threshold')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cost price (₹)</label>
              <input type="number" step="0.01" className="w-full rounded-lg px-3 py-2 text-sm" {...field('cost_price')} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Sell price (₹)</label>
              <input type="number" step="0.01" className="w-full rounded-lg px-3 py-2 text-sm" {...field('sell_price')} />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg py-2 text-sm text-gray-300 border border-[var(--color-border)] hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-lg py-2 text-sm font-medium bg-emerald-400 text-gray-900 hover:bg-emerald-300 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
