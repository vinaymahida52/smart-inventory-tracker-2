import { useEffect, useState } from 'react';
import { api, type Product } from '../lib/api';

export default function QrModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    api.get<{ sku: string; dataUrl: string }>(`/products/${product.id}/qrcode`).then((r) => setDataUrl(r.dataUrl));
  }, [product.id]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-xs p-6 text-center">
        <h2 className="text-sm font-medium text-gray-300 mb-1">{product.name}</h2>
        <p className="text-xs text-gray-500 mb-4">{product.sku}</p>
        {dataUrl ? (
          <img src={dataUrl} alt={`QR code for ${product.sku}`} className="mx-auto rounded-lg bg-white p-2" />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">Generating…</div>
        )}
        <p className="text-xs text-gray-500 mt-4">
          Print this and stick it on the shelf. Staff can scan it to update stock instantly.
        </p>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg py-2 text-sm text-gray-300 border border-[var(--color-border)] hover:bg-white/5"
        >
          Close
        </button>
      </div>
    </div>
  );
}
