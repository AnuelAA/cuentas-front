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

// Cambia la baseURL según el entorno
const API_BASE_URL =
  import.meta.env.PROD
    ? 'https://cuentas-springboot.onrender.com/api'
    : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth
export const login = async (credentials: LoginRequest): Promise<User> => {
  // Usuario hardcodeado - en el futuro usar GET /users
  const hardcodedUser: User = {
    userId: 1,
    name: "jose",
    email: "jose@hotmail.com",
    password: "1234"
  };
  
  if (credentials.email === hardcodedUser.email && credentials.password === hardcodedUser.password) {
    return hardcodedUser;
  }
  
  throw new Error('Usuario o contraseña incorrectos');
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
  endDate?: string
): Promise<Transaction[]> => {
  const response = await api.get<Transaction[]>(`/users/${userId}/transactions`, {
    params: { startDate, endDate },
  });
  return response.data;
};

export const createTransaction = async (
  userId: number,
  transaction: CreateTransactionRequest
): Promise<Transaction> => {
  const response = await api.post<Transaction>(
    `/users/${userId}/transactions`,
    transaction
  );
  return response.data;
};

export const deleteTransaction = async (
  userId: number,
  transactionId: number
): Promise<void> => {
  await api.delete(`/users/${userId}/transactions/${transactionId}`);
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

export default api;
