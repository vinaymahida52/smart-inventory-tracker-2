import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api, ApiError, type Product } from '../lib/api';

const SCANNER_ID = 'qr-reader';

export default function Scan() {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  async function lookup(code: string) {
    setError('');
    setResult(null);
    try {
      const product = await api.get<Product>(`/products/scan/${encodeURIComponent(code)}`);
      setResult(product);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Lookup failed');
    }
  }

  async function startScanning() {
    setError('');
    setScanning(true);
    try {
      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (decodedText) => {
          lookup(decodedText);
          stopScanning();
        },
        () => {}
      );
    } catch {
      setError('Could not access camera. Use manual code entry below instead.');
      setScanning(false);
    }
  }

  function stopScanning() {
    const scanner = scannerRef.current;
    if (scanner) {
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => () => stopScanning(), []);

  async function adjustStock(delta: number) {
    if (!result) return;
    try {
      const updated = await api.post<Product>(`/products/${result.id}/stock`, {
        delta,
        reason: delta > 0 ? 'restock' : 'sale',
      });
      setResult(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to update stock');
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Scan QR</h1>
        <p className="text-sm text-gray-400 mt-1">
          Scan a shelf QR code to instantly look up and update stock.
        </p>
      </div>

      <div className="card p-5">
        {!scanning ? (
          <button
            onClick={startScanning}
            className="w-full rounded-lg bg-emerald-400 text-gray-900 font-medium py-2.5 text-sm hover:bg-emerald-300"
          >
            Start camera scan
          </button>
        ) : (
          <div className="space-y-3">
            <div id={SCANNER_ID} className="rounded-lg overflow-hidden" />
            <button
              onClick={stopScanning}
              className="w-full rounded-lg border border-[var(--color-border)] text-gray-300 py-2 text-sm hover:bg-white/5"
            >
              Stop camera
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 my-4">
          <div className="h-px bg-[var(--color-border)] flex-1" />
          <span className="text-xs text-gray-500">or type SKU</span>
          <div className="h-px bg-[var(--color-border)] flex-1" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualCode.trim()) lookup(manualCode.trim());
          }}
          className="flex gap-2"
        >
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="e.g. SKU-PG100"
            className="flex-1 rounded-lg px-3 py-2 text-sm"
          />
          <button className="rounded-lg px-4 py-2 text-sm border border-[var(--color-border)] text-gray-300 hover:bg-white/5">
            Look up
          </button>
        </form>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && (
        <div className="card p-5">
          <p className="text-xs text-gray-500">{result.sku}</p>
          <h2 className="text-lg font-semibold text-white">{result.name}</h2>
          <p className="text-sm text-gray-400 mt-1">
            {result.quantity} {result.unit} in stock · ₹{result.sell_price} each
          </p>
          {result.status !== 'ok' && (
            <p className="text-sm text-amber-400 mt-1">
              {result.status === 'out' ? 'Out of stock!' : 'Running low — consider restocking.'}
            </p>
          )}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => adjustStock(-1)}
              className="flex-1 rounded-lg border border-[var(--color-border)] text-gray-300 py-2 text-sm hover:bg-white/5"
            >
              − Sell 1
            </button>
            <button
              onClick={() => adjustStock(1)}
              className="flex-1 rounded-lg bg-emerald-400 text-gray-900 font-medium py-2 text-sm hover:bg-emerald-300"
            >
              + Restock 1
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
