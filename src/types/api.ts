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

export interface CreateUserRequest {
  name: string;
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
  assetValues?: Array<{
    valuationDate: string;
    currentValue: number;
    acquisitionValue?: number;
  }>;
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
  liabilityValues?: Array<{
    valuationDate: string;
    outstandingBalance: number;
    endDate?: string;
  }>;
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
  categoryId?: number | null;
  assetId?: number | null;
  relatedAssetId?: number | null;
  liabilityId?: number | null;
  amount: number;
  transactionDate: string;
  description?: string | null;
  type?: 'income' | 'expense';
  createdAt?: string;
  updatedAt?: string | null;
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
  categoryId?: number | null;
  categoryName?: string; // helper for UI when user types a name that doesn't exist
  assetId?: number | null;
  assetName?: string;
  relatedAssetId?: number | null;
  relatedAssetName?: string;
  liabilityId?: number | null;
  liabilityName?: string;
  type?: 'income' | 'expense' | null;
  amount: number;
  transactionDate: string;
  description?: string | null;
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
