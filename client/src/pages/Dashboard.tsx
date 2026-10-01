import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, type AnalyticsSummary } from '../lib/api';
import { socket } from '../lib/socket';
import StatCard from '../components/StatCard';

const currency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function Dashboard() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  function load() {
    api.get<AnalyticsSummary>('/analytics/summary').then(setData);
  }

  useEffect(() => {
    load();
    socket.on('stock-updated', load);
    socket.on('product-created', load);
    socket.on('product-deleted', load);
    return () => {
      socket.off('stock-updated', load);
      socket.off('product-created', load);
      socket.off('product-deleted', load);
    };
  }, []);

  if (!data) return <p className="text-gray-400">Loading dashboard…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Live snapshot of your shop's inventory</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Products" value={String(data.totalProducts)} hint={`${data.totalUnits} units in stock`} />
        <StatCard label="Inventory Value" value={currency(data.inventoryValue)} hint="at cost price" />
        <StatCard label="Potential Revenue" value={currency(data.potentialRevenue)} hint="at sell price" />
        <StatCard
          label="Low Stock"
          value={String(data.lowStockCount + data.outOfStockCount)}
          hint={`${data.outOfStockCount} out of stock`}
          tone={data.lowStockCount + data.outOfStockCount > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        <div className="card p-5 md:col-span-3">
          <h2 className="text-sm font-medium text-gray-300 mb-4">Stock movement — last 7 days</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.movementsLast7Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232d3d" />
              <XAxis dataKey="day" stroke="#6b7280" fontSize={12} tickFormatter={(d) => d.slice(5)} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#121821', border: '1px solid #232d3d', borderRadius: 8 }}
                labelStyle={{ color: '#e5e9f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="restocked" fill="#34d399" radius={[4, 4, 0, 0]} name="Restocked" />
              <Bar dataKey="sold" fill="#f87171" radius={[4, 4, 0, 0]} name="Sold" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-300">Low stock alerts</h2>
            <Link to="/products" className="text-xs text-emerald-400 hover:underline">
              View all
            </Link>
          </div>
          {data.lowStockItems.length === 0 ? (
            <p className="text-sm text-gray-500">All products are well stocked. 🎉</p>
          ) : (
            <ul className="space-y-3">
              {data.lowStockItems.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.sku}</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                      p.status === 'out'
                        ? 'bg-red-400/10 text-red-400'
                        : 'bg-amber-400/10 text-amber-400'
                    }`}
                  >
                    {p.quantity} {p.unit} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-gray-300 mb-4">Recent activity</h2>
        {data.recentMovements.length === 0 ? (
          <p className="text-sm text-gray-500">No stock movements yet.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {data.recentMovements.map((m) => (
              <div key={m.id} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <span className="text-white">{m.product_name}</span>
                  <span className="text-gray-500"> · {m.reason}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={m.change_qty > 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {m.change_qty > 0 ? '+' : ''}
                    {m.change_qty}
                  </span>
                  <span className="text-xs text-gray-500">{m.user_name || 'system'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
