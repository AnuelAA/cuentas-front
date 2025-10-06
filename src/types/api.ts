export interface User {
  id: number;
  email: string;
  name?: string;
  password?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Asset {
  id: number;
  name: string;
  type: string;
  acquisitionValue: number;
  currentValue: number;
  profitability: number;
  acquisitionDate?: string;
}

export interface AssetPerformance {
  assetId: number;
  assetName: string;
  profitability: number;
  totalValue: number;
  investedCapital: number;
  absoluteProfit: number;
}

export interface Liability {
  id: number;
  name: string;
  type: string;
  totalAmount: number;
  remainingBalance: number;
  interestRate?: number;
  startDate?: string;
  endDate?: string;
}

export interface LiabilityProgress {
  liabilityId: number;
  liabilityName: string;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
  percentageAmortized: number;
}

export interface Transaction {
  id: number;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  date: string;
  categoryId?: number;
  categoryName?: string;
  assetId?: number;
  assetName?: string;
  liabilityId?: number;
  liabilityName?: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  description?: string;
}

export interface DashboardMetrics {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  incomeByPeriod?: Record<string, number>;
  expensesByPeriod?: Record<string, number>;
  bestAsset?: {
    id: number;
    name: string;
    profitability: number;
  };
  worstAsset?: {
    id: number;
    name: string;
    profitability: number;
  };
}

export interface CreateTransactionRequest {
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  date: string;
  categoryId?: number;
  assetId?: number;
  liabilityId?: number;
}
