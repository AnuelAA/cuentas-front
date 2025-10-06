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
} from '@/types/api';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth
export const login = async (credentials: LoginRequest): Promise<User> => {
  const response = await api.get<User[]>('/users');
  const user = response.data.find(
    u => u.email === credentials.email && u.password === credentials.password
  );
  
  if (!user) {
    throw new Error('Usuario o contraseña incorrectos');
  }
  
  return user;
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
  assetId: number
): Promise<AssetPerformance> => {
  const response = await api.get<AssetPerformance>(
    `/users/${userId}/dashboard/assets/${assetId}/performance`
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

export default api;
