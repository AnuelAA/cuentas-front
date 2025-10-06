export interface User {
  userId: number;
  name: string;
  email: string;
  password?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Asset {
  assetId: number;
  userId: number;
  assetTypeId: number;
  name: string;
  description?: string;
  acquisitionDate?: string;
  acquisitionValue: number;
  currentValue: number;
}

export interface AssetPerformance {
  assetId: number;
  initialValue: number;
  currentValue: number;
  roi: number;
}

export interface Liability {
  liabilityId: number;
  userId: number;
  liabilityTypeId: number;
  name: string;
  description?: string;
  principalAmount: number;
  interestRate?: number;
  startDate?: string;
  endDate?: string;
  outstandingBalance: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LiabilityProgress {
  liabilityId: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
  progressPercentage: number;
}

export interface Transaction {
  transactionId: number;
  userId: number;
  categoryId?: number;
  assetId?: number;
  liabilityId?: number;
  amount: number;
  transactionDate: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  categoryId: number;
  userId: number;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardMetrics {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  bestAsset?: Asset;
  worstAsset?: Asset;
}

export interface CreateTransactionRequest {
  userId?: number;
  categoryId?: number;
  assetId?: number;
  liabilityId?: number;
  amount: number;
  transactionDate: string;
  description: string;
}
