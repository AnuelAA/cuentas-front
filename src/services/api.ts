import axios from 'axios';
import type {
  User,
  LoginRequest,
  Asset,
  AssetPerformance,
  Liability,
  LiabilityProgress,
  Transaction,
  Category,
  DashboardMetrics,
  CreateTransactionRequest,
  MonthlyRoi,
  AssetRoi,
  DashboardSummary,
} from '@/types/api';

// URL base fija al backend; permite override con VITE_API_URL si se define
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://46.101.144.147:8080/api') as string;

export const createCategory = async (
  userId: number,
  payload: { name: string; type: 'income' | 'expense' }
): Promise<Category> => {
  const response = await api.post<Category>(`/users/${userId}/categories`, payload);
  return response.data;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  // withCredentials: true, // descomenta si tu backend usa cookies de sesión
});

// Auth
export const login = async (credentials: LoginRequest): Promise<User> => {
  try {
    const response = await api.get('/users');
    let users: User[] = [];
    if (Array.isArray(response.data)) {
      users = response.data;
    } else if (response.data && typeof response.data === 'object') {
      const possibleArrays = Object.values(response.data).filter(Array.isArray);
      if (possibleArrays.length > 0) {
        users = possibleArrays[0] as User[];
      }
    }
    if (users.length === 0) {
      throw new Error('No se pudieron cargar los usuarios. Verifica que la API esté devolviendo datos correctamente.');
    }
    const user = users.find(u => u.email === credentials.email && u.password === credentials.password);
    if (user) return user;
    throw new Error('Usuario o contraseña incorrectos');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Error de conexión con la API: ${error.message}`);
    }
    throw error;
  }
};

// Dashboard
export const getDashboard = async (
  userId: number,
  startDate: string,
  endDate: string
): Promise<DashboardMetrics> => {
  const response = await api.get<DashboardMetrics>(
    `/users/${userId}/dashboard`,
    { params: { startDate, endDate } }
  );
  return response.data;
};

// Assets
export const getAssets = async (userId: number): Promise<Asset[]> => {
  const response = await api.get<Asset[]>(`/users/${userId}/assets`);
  return response.data;
};

export const getAsset = async (userId: number, assetId: number): Promise<Asset> => {
  const response = await api.get<Asset>(`/users/${userId}/assets/${assetId}`);
  return response.data;
};

export const getAssetPerformance = async (
  userId: number,
  assetId: number,
  startDate: string,
  endDate: string
): Promise<AssetPerformance> => {
  const response = await api.get<AssetPerformance>(
    `/users/${userId}/dashboard/assets/${assetId}/performance`,
    { params: { startDate, endDate } }
  );
  return response.data;
};

// Liabilities
export const getLiabilities = async (userId: number): Promise<Liability[]> => {
  const response = await api.get<Liability[]>(`/users/${userId}/liabilities`);
  return response.data;
};

export const getLiability = async (userId: number, liabilityId: number): Promise<Liability> => {
  const response = await api.get<Liability>(`/users/${userId}/liabilities/${liabilityId}`);
  return response.data;
};

export const getLiabilityProgress = async (
  userId: number,
  liabilityId: number
): Promise<LiabilityProgress> => {
  const response = await api.get<LiabilityProgress>(
    `/users/${userId}/dashboard/liabilities/${liabilityId}/progress`
  );
  return response.data;
};

// Transactions
export const getTransactions = async (
  userId: number,
  startDate?: string,
  endDate?: string,
  relatedAssetId?: number,
  liabilityId?: number,
  assetId?: number,
  categoryId?: number
): Promise<Transaction[]> => {
  const params: Record<string, any> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (relatedAssetId != null) params.relatedAssetId = relatedAssetId;
  if (liabilityId != null) params.liabilityId = liabilityId;
  if (assetId != null) params.assetId = assetId;
  if (categoryId != null) params.categoryId = categoryId;

  const response = await api.get<Transaction[]>(`/users/${userId}/transactions`, {
    params,
  });
  return response.data;
};

export const createTransaction = async (
  userId: number,
  transaction: CreateTransactionRequest
): Promise<Transaction> => {
  const body = { ...transaction, amount: Math.abs(transaction.amount) }; // asegurar positivo
  const response = await api.post<Transaction>(
    `/users/${userId}/transactions`,
    body
  );
  return response.data;
};

export const updateTransaction = async (
  userId: number,
  transactionId: number,
  transaction: Partial<CreateTransactionRequest> & { transactionId?: number; userId?: number }
): Promise<Transaction> => {
  const body = {
    transactionId: transactionId,
    userId: userId,
    categoryId: transaction.categoryId ?? null,
    assetId: transaction.assetId ?? null,
    relatedAssetId: transaction.relatedAssetId ?? null,
    liabilityId: transaction.liabilityId ?? null,
    amount: Math.abs(transaction.amount ?? 0),
    type: transaction.type ?? null,
    transactionDate: transaction.transactionDate ?? null,
    description: transaction.description ?? null,
  };

  const response = await api.put<Transaction>(`/users/${userId}/transactions/${transactionId}`, body);
  return response.data;
};

export const deleteTransaction = async (
  userId: number,
  transactionId: number
): Promise<void> => {
  await api.delete(`/users/${userId}/transactions/${transactionId}`);
};

// Batch create: crea una por una y devuelve resumen { successes, failures }
export const createTransactionsBatch = async (
  userId: number,
  transactions: CreateTransactionRequest[]
): Promise<{
  successes: Transaction[];
  failures: { transaction: CreateTransactionRequest; error: any }[];
}> => {
  const successes: Transaction[] = [];
  const failures: { transaction: CreateTransactionRequest; error: any }[] = [];

  for (const t of transactions) {
    try {
      const created = await createTransaction(userId, t);
      successes.push(created);
    } catch (error) {
      failures.push({ transaction: t, error: axios.isAxiosError(error) ? error.response?.data ?? error.message : String(error) });
    }
  }

  return { successes, failures };
};

// Categories
export const getCategories = async (userId: number): Promise<Category[]> => {
  const response = await api.get<Category[]>(`/users/${userId}/categories`);
  return response.data;
};

// Asset ROI
export const getAssetMonthlyRoi = async (
  userId: number,
  assetId: number,
  year: number
): Promise<MonthlyRoi[]> => {
  const response = await api.get<MonthlyRoi[]>(
    `/users/${userId}/assets/${assetId}/roi/monthly`,
    { params: { year } }
  );
  return response.data;
};

export const getAssetRoi = async (
  userId: number,
  assetId: number,
  startDate: string,
  endDate: string
): Promise<AssetRoi> => {
  const response = await api.get<AssetRoi>(
    `/users/${userId}/assets/${assetId}/roi`,
    { params: { startDate, endDate } }
  );
  return response.data;
};

// Dashboard Summary
export const getDashboardSummary = async (
  userId: number,
  period: 'year' | 'lastMonth'
): Promise<DashboardSummary> => {
  const response = await api.get<DashboardSummary>(
    `/users/${userId}/dashboard/summary`,
    { params: { period } }
  );
  return response.data;
};

export const importExcel = async (
  userId: number,
  file: File,
  year?: number
): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);

  const params: Record<string, any> = {};
  if (year != null) params.year = year;

  const response = await api.post(`/users/${userId}/excel/importNew`, formData, {
    params,
    headers: {
      // axios detecta multipart automáticamente, pero es seguro dejarlo
      'Content-Type': 'multipart/form-data',
    },
    // timeout opcional más alto si los ficheros son grandes
    timeout: 60000,
  });

  return response.data;
};

export const exportExcel = async (
  userId: number,
  year?: number
): Promise<{ blob: Blob; filename: string }> => {
  const params: Record<string, any> = {};
  if (year != null) params.year = year;

  const response = await api.get(`/users/${userId}/excel/exportNew`, {
    params,
    responseType: 'blob',
    timeout: 60000,
    withCredentials: true,
  });

  const cd = response.headers['content-disposition'] || response.headers['Content-Disposition'] || '';
  let filename = `cuentas-New_${year ?? new Date().getFullYear()}.xlsx`;
  const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^;"']+)/i);
  if (m && m[1]) filename = decodeURIComponent(m[1].replace(/["']/g, ''));

  return { blob: response.data as Blob, filename };
};

export default api;
