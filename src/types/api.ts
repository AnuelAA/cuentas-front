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

export interface LoginResponse {
  token: string;
  userId: number;
  email: string;
  name: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  email: string;
  newPassword: string;
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
  isPrimary?: boolean;
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
  type?: 'income' | 'expense';
  parentCategoryId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  budget?: number | null; // Presupuesto mensual para la categoría
}

export interface Budget {
  budgetId: number;
  userId: number;
  categoryId: number;
  amount: number; // Presupuesto mensual
  period: 'monthly' | 'yearly'; // Período del presupuesto
  startDate?: string; // Fecha de inicio (opcional)
  endDate?: string; // Fecha de fin (opcional)
  createdAt?: string;
  updatedAt?: string;
}

export interface BudgetStatus {
  budgetId: number;
  categoryId: number;
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number; // 0-100
  isExceeded: boolean;
  period: 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
}

export interface TransactionTemplate {
  templateId: number;
  userId: number;
  name: string; // Nombre de la plantilla
  categoryId?: number | null;
  categoryName?: string | null;
  type: 'income' | 'expense';
  amount: number;
  assetId?: number | null;
  relatedAssetId?: number | null;
  liabilityId?: number | null;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBudgetRequest {
  categoryId: number;
  amount: number;
  period: 'monthly' | 'yearly';
  startDate?: string;
  endDate?: string;
}

export interface UpdateBudgetRequest {
  amount?: number;
  period?: 'monthly' | 'yearly';
  startDate?: string;
  endDate?: string;
}

export interface CreateTransactionTemplateRequest {
  name: string;
  categoryId?: number | null;
  categoryName?: string | null;
  type: 'income' | 'expense';
  amount: number;
  assetId?: number | null;
  relatedAssetId?: number | null;
  liabilityId?: number | null;
  description?: string | null;
}

export interface UpdateTransactionTemplateRequest {
  name?: string;
  categoryId?: number | null;
  categoryName?: string | null;
  type?: 'income' | 'expense';
  amount?: number;
  assetId?: number | null;
  relatedAssetId?: number | null;
  liabilityId?: number | null;
  description?: string | null;
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

export interface AssetType {
  assetTypeId: number;
  name: string;
  description?: string;
  isCheckingAccount?: boolean; // Indica si este tipo es considerado "cuenta corriente" para el cuadre de caja
}

export interface LiabilityType {
  liabilityTypeId: number;
  name: string;
  description?: string;
}

export interface Interest {
  interestId: number;
  liabilityId: number;
  type: 'fixed' | 'variable' | 'general';
  annualRate: number;
  startDate: string;
  createdAt?: string;
}

// Detail types for new detail pages
export interface CategoryDetail {
  category: Category;
  subcategories: Category[];
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
  recentTransactions: Transaction[];
}

export interface AssetDetail {
  asset: Asset;
  currentValue: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  roiPercentage: number;
  transactionCount: number;
  recentTransactions: Transaction[];
  valueHistory: Array<{
    assetValueId: number;
    valuationDate: string;
    currentValue: number;
  }>;
}

export interface LiabilityDetail {
  liability: Liability;
  currentOutstandingBalance: number;
  principalPaid: number;
  progressPercentage: number;
  transactionCount: number;
  recentTransactions: Transaction[];
  valueHistory: Array<{
    liabilityValueId: number;
    valuationDate: string;
    outstandingBalance: number;
    endDate?: string;
  }>;
  interests: Interest[];
}
