import axios from 'axios';
import type {
  User,
  LoginRequest,
  LoginResponse,
  CreateUserRequest,
  ResetPasswordRequest,
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
  AssetType,
  LiabilityType,
  Interest,
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
});

// Interceptor para agregar token a todas las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('user');
      // Solo redirigir si no estamos ya en login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    // El endpoint de login es público, no necesita token
    const response = await axios.post<LoginResponse>(
      `${API_BASE_URL}/auth/login`,
      {
        email: credentials.email,
        password: credentials.password,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Guardar token y userId en localStorage
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('userId', String(response.data.userId));

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Usuario o contraseña incorrectos');
      }
      throw new Error(`Error de conexión con la API: ${error.message}`);
    }
    throw error;
  }
};

export const createUser = async (userData: CreateUserRequest): Promise<User> => {
  try {
    // El endpoint de creación puede requerir autenticación si el backend lo exige
    // Si está público, el interceptor no añadirá token (no existe aún)
    const response = await api.post<User>('/users', {
      name: userData.name,
      email: userData.email,
      password: userData.password,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('No autorizado. Por favor inicia sesión para crear usuarios.');
      }
      const errorMessage = error.response?.data?.message || error.response?.data || error.message;
      throw new Error(`Error al crear el usuario: ${errorMessage}`);
    }
    throw error;
  }
};

export const resetPassword = async (resetData: ResetPasswordRequest): Promise<void> => {
  try {
    // El endpoint de reset password es público, no necesita token
    await axios.post(
      `${API_BASE_URL}/auth/reset-password`,
      {
        email: resetData.email,
        newPassword: resetData.newPassword,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error('Usuario no encontrado');
      }
      if (error.response?.status === 400) {
        throw new Error('Datos inválidos. Por favor verifica el email y la contraseña.');
      }
      const errorMessage = error.response?.data?.message || error.response?.data || error.message;
      throw new Error(`Error al resetear la contraseña: ${errorMessage}`);
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

// Asset Types
export const getAssetTypes = async (): Promise<AssetType[]> => {
  const response = await api.get<AssetType[]>('/asset-types');
  return response.data;
};

// Liability Types
export const getLiabilityTypes = async (): Promise<LiabilityType[]> => {
  const response = await api.get<LiabilityType[]>('/liability-types');
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
  const body = {
    userId: userId,
    categoryId: transaction.categoryId ?? null,
    assetId: transaction.assetId ?? null,
    relatedAssetId: transaction.relatedAssetId ?? null,
    liabilityId: transaction.liabilityId ?? null,
    amount: Math.abs(transaction.amount),
    type: transaction.type ?? null,
    transactionDate: transaction.transactionDate,
    description: transaction.description ?? null,
  };
  const response = await api.post<Transaction>(
    `/users/${userId}/transactions`,
    body
  );
  return response.data;
};

export const updateTransaction = async (
  userId: number,
  transactionId: number,
  transaction: Partial<CreateTransactionRequest>
): Promise<Transaction> => {
  const body = {
    transactionId: transactionId,
    userId: userId,
    categoryId: transaction.categoryId !== undefined ? transaction.categoryId : null,
    assetId: transaction.assetId !== undefined ? transaction.assetId : null,
    relatedAssetId: transaction.relatedAssetId !== undefined ? transaction.relatedAssetId : null,
    liabilityId: transaction.liabilityId !== undefined ? transaction.liabilityId : null,
    amount: transaction.amount !== undefined ? Math.abs(transaction.amount) : 0,
    type: transaction.type !== undefined ? transaction.type : null,
    transactionDate: transaction.transactionDate || null,
    description: transaction.description !== undefined ? (transaction.description || null) : null,
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
// ----- Assets: crear/actualizar/valuación (stubs) -----
export const createAsset = async (
  userId: number,
  payload: { name: string; assetTypeId: number; acquisitionValue?: number; currentValue?: number }
): Promise<Asset> => {
  const response = await api.post<Asset>(`/users/${userId}/assets`, payload);
  return response.data;
};

export const updateAsset = async (
  userId: number,
  assetId: number,
  payload: Partial<{ name: string; assetTypeId?: number; acquisitionValue?: number; currentValue?: number }>
): Promise<Asset> => {
  const response = await api.put<Asset>(`/users/${userId}/assets/${assetId}`, payload);
  return response.data;
};

export const addAssetValuation = async (
  userId: number,
  assetId: number,
  payload: { valuationDate: string; currentValue: number; acquisitionValue?: number }
): Promise<any> => {
  const response = await api.post(`/users/${userId}/assets/${assetId}/valuations`, payload);
  return response.data;
};

// ----- Liabilities: crear/actualizar/snapshot/interests -----
export const createLiability = async (
  userId: number,
  payload: { 
    name: string; 
    liabilityTypeId: number; 
    description?: string; 
    principalAmount?: number; 
    startDate?: string;
  }
): Promise<Liability> => {
  const response = await api.post<Liability>(`/users/${userId}/liabilities`, payload);
  return response.data;
};

export const updateLiability = async (
  userId: number,
  liabilityId: number,
  payload: Partial<{ 
    name: string; 
    liabilityTypeId?: number; 
    description?: string; 
    principalAmount?: number; 
    startDate?: string;
  }>
): Promise<Liability> => {
  const response = await api.put<Liability>(`/users/${userId}/liabilities/${liabilityId}`, payload);
  return response.data;
};

export const addLiabilitySnapshot = async (
  userId: number,
  liabilityId: number,
  payload: { valuationDate: string; outstandingBalance: number; endDate?: string }
): Promise<any> => {
  const response = await api.post(`/users/${userId}/liabilities/${liabilityId}/values`, payload);
  return response.data;
};

export const createLiabilityInterest = async (
  userId: number,
  liabilityId: number,
  payload: { 
    type?: 'fixed' | 'variable' | 'general';
    annualRate?: number;
    startDate: string;
  }
): Promise<Interest> => {
  const response = await api.post<Interest>(`/users/${userId}/liabilities/${liabilityId}/interests`, payload);
  return response.data;
};

export const getLiabilityInterests = async (
  userId: number,
  liabilityId: number
): Promise<Interest[]> => {
  const response = await api.get<Interest[]>(`/users/${userId}/liabilities/${liabilityId}/interests`);
  return response.data;
};

export const updateLiabilityInterest = async (
  userId: number,
  liabilityId: number,
  interestId: number,
  payload: { 
    type?: 'fixed' | 'variable' | 'general';
    annualRate?: number;
    startDate: string;
  }
): Promise<Interest> => {
  const response = await api.put<Interest>(`/users/${userId}/liabilities/${liabilityId}/interests/${interestId}`, payload);
  return response.data;
};

export const deleteLiabilityInterest = async (
  userId: number,
  liabilityId: number,
  interestId: number
): Promise<void> => {
  await api.delete(`/users/${userId}/liabilities/${liabilityId}/interests/${interestId}`);
};

export const deleteLiability = async (
  userId: number,
  liabilityId: number
): Promise<void> => {
  await api.delete(`/users/${userId}/liabilities/${liabilityId}`);
};

export const deleteAsset = async (
  userId: number,
  assetId: number
): Promise<void> => {
  await api.delete(`/users/${userId}/assets/${assetId}`);
};

export default api;
