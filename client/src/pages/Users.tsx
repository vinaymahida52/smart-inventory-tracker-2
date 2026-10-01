import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, type User } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get<User[]>('/auth/users').then(setUsers);
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/auth/users', form);
      setForm({ name: '', email: '', password: '', role: 'staff' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create user');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Remove this team member?')) return;
    await api.del(`/auth/users/${id}`);
    load();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Team</h1>
        <p className="text-sm text-gray-400 mt-1">Manage who can access your shop's dashboard</p>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-gray-300 mb-3">Add team member</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <input
            placeholder="Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="rounded-lg px-3 py-2 text-sm"
          >
            <option value="staff">Staff — scan & sell</option>
            <option value="manager">Manager — manage products</option>
            <option value="admin">Admin — full access</option>
          </select>
          {error && <p className="col-span-2 text-sm text-red-400">{error}</p>}
          <button
            disabled={busy}
            className="col-span-2 rounded-lg bg-emerald-400 text-gray-900 font-medium py-2 text-sm hover:bg-emerald-300 disabled:opacity-50"
          >
            {busy ? 'Adding…' : 'Add member'}
          </button>
        </form>
      </div>

      <div className="card divide-y divide-[var(--color-border)]">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-sm text-white">{u.name}</p>
              <p className="text-xs text-gray-500">{u.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs capitalize text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                {u.role}
              </span>
              {u.id !== currentUser?.id && (
                <button
                  onClick={() => remove(u.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
