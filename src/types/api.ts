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
  relatedAssetId?: number;
  liabilityId?: number;
  amount: number;
  transactionDate: string;
  description: string;
  type?: 'income' | 'expense';
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  categoryId: number;
  userId: number;
  name: string;
  description?: string;
  type: 'income' | 'expense';
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
  categoryName?: string; // helper for UI when user types a name that doesn't exist
  assetId?: number;
  assetName?: string;
  relatedAssetId?: number;
  relatedAssetName?: string;
  liabilityId?: number;
  liabilityName?: string;
  type?: 'income' | 'expense';
  amount: number;
  transactionDate: string;
  description: string;
}

export interface MonthlyRoi {
  month: string;
  income: number;
  expenses: number;
  netProfit: number;
  roiPercentage: number;
}

export interface AssetRoi {
  assetId: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  roiPercentage: number;
}

export interface DashboardSummary {
  period: 'year' | 'lastMonth';
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}
