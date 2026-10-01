const TOKEN_KEY = 'dukaan_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || 'Request failed', res.status);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit: string;
  quantity: number;
  low_stock_threshold: number;
  cost_price: number;
  sell_price: number;
  status: 'ok' | 'low' | 'out';
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  created_at?: string;
}

export interface AnalyticsSummary {
  totalProducts: number;
  totalUnits: number;
  inventoryValue: number;
  potentialRevenue: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockItems: Product[];
  byCategory: { category: string; units: number; value: number }[];
  recentMovements: {
    id: number;
    product_name: string;
    change_qty: number;
    reason: string;
    user_name: string | null;
    created_at: string;
  }[];
  movementsLast7Days: { day: string; restocked: number; sold: number }[];
}
