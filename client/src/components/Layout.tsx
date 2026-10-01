import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◧', end: true },
  { to: '/products', label: 'Products', icon: '▤' },
  { to: '/scan', label: 'Scan QR', icon: '▣' },
  { to: '/users', label: 'Team', icon: '◍', adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-r border-[var(--color-border)] flex flex-col p-4">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-emerald-400/10 text-emerald-400 flex items-center justify-center font-bold">
            D
          </div>
          <span className="font-semibold text-white">Dukaan Tracker</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems
            .filter((item) => !item.adminOnly || user?.role === 'admin')
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                    isActive
                      ? 'bg-emerald-400/10 text-emerald-400'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
        </nav>

        <div className="border-t border-[var(--color-border)] pt-4 mt-4">
          <p className="text-sm text-white font-medium truncate">{user?.name}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          <button
            onClick={logout}
            className="mt-3 w-full text-xs text-gray-400 hover:text-red-400 transition text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
