import type { Asset, Transaction, AssetType } from '@/types/api';
import { parseISO, startOfMonth, endOfMonth, subMonths, isValid, subDays } from 'date-fns';

/**
 * Identifica si un activo es una cuenta corriente basándose en su assetTypeId
 * Compara con los tipos de activos que tienen isCheckingAccount = true
 */
export const isCheckingAccount = (asset: Asset, assetTypes: AssetType[]): boolean => {
  const assetType = assetTypes.find(type => type.assetTypeId === asset.assetTypeId);
  return assetType?.isCheckingAccount === true;
};

/**
 * Obtiene el valor de un activo para un instante (usa la última valoración <= fecha)
 */
const getAssetValueAtDate = (asset: Asset, at: Date): number => {
  if (!Array.isArray(asset.assetValues) || asset.assetValues.length === 0) {
    return Number(asset.currentValue ?? 0);
  }
  
  const targetEnd = at.getTime();
  const candidates = asset.assetValues
    .map(av => ({ ...av, _date: parseISO(av.valuationDate) }))
    .filter(av => isValid(av._date) && av._date.getTime() <= targetEnd)
    .sort((a, b) => b._date.getTime() - a._date.getTime());
    
  if (candidates.length === 0) {
    return Number(asset.currentValue ?? 0);
  }
  
  const chosen = candidates[0];
  return Number(chosen.currentValue ?? 0);
};

/**
 * Alias para compatibilidad con cálculo mensual (usa fin de mes)
 */
const getAssetValueForMonth = (asset: Asset, monthEnd: Date): number => {
  return getAssetValueAtDate(asset, monthEnd);
};

/**
 * Resultado del cálculo de cuadre de caja
 */
export interface CashReconciliationResult {
  month: Date;
  checkingAccounts: Asset[];
  initialBalance: number; // Balance al final del mes anterior
  expectedBalance: number; // Balance inicial + ingresos - gastos
  actualBalance: number; // Balance real al final del mes actual
  difference: number; // expectedBalance - actualBalance
  income: number;
  expenses: number;
  isBalanced: boolean; // true si la diferencia es muy pequeña (menos de 0.01€)
}

/**
 * Calcula el cuadre de caja para un mes específico
 */
export const calculateCashReconciliation = (
  assets: Asset[],
  transactions: Transaction[],
  assetTypes: AssetType[],
  month: Date
): CashReconciliationResult => {
  // Filtrar solo cuentas corrientes
  const checkingAccounts = assets.filter(asset => isCheckingAccount(asset, assetTypes));
  
  // Obtener fechas relevantes
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const previousMonthEnd = endOfMonth(subMonths(month, 1));
  
  // Calcular balance inicial (al final del mes anterior)
  const initialBalance = checkingAccounts.reduce((sum, asset) => {
    return sum + getAssetValueForMonth(asset, previousMonthEnd);
  }, 0);
  
  // Calcular balance real (al final del mes actual)
  const actualBalance = checkingAccounts.reduce((sum, asset) => {
    return sum + getAssetValueForMonth(asset, monthEnd);
  }, 0);
  
  // Filtrar transacciones del mes
  const monthTransactions = transactions.filter(t => {
    try {
      const txDate = parseISO(t.transactionDate);
      return txDate >= monthStart && txDate <= monthEnd;
    } catch {
      return false;
    }
  });
  
  // Calcular ingresos y gastos del mes
  const income = monthTransactions
    .filter(t => String(t.type ?? '').toLowerCase() === 'income')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
    
  const expenses = monthTransactions
    .filter(t => String(t.type ?? '').toLowerCase() === 'expense')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
  
  // Calcular balance esperado
  const expectedBalance = initialBalance + income - expenses;
  
  // Calcular diferencia
  const difference = expectedBalance - actualBalance;
  
  // Considerar que cuadra si la diferencia es menor a 0.01€ (por errores de redondeo)
  const isBalanced = Math.abs(difference) < 0.01;
  
  return {
    month,
    checkingAccounts,
    initialBalance,
    expectedBalance,
    actualBalance,
    difference,
    income,
    expenses,
    isBalanced,
  };
};

/**
 * Resultado para rango arbitrario (X-1 frente a Y)
 */
export interface CashReconciliationRangeResult {
  fromDate: Date; // X-1
  toDate: Date;   // Y
  checkingAccounts: Asset[];
  initialBalance: number; // saldo en X-1
  expectedBalance: number; // initial + ingresos - gastos (en X..Y)
  actualBalance: number; // saldo en Y
  difference: number; // expected - actual
  income: number;
  expenses: number;
  isBalanced: boolean;
}

/**
 * Calcula cuadre de caja en un rango [startDate, endDate], comparando saldo en (startDate-1 día) con saldo en endDate
 */
export const calculateCashReconciliationRange = (
  assets: Asset[],
  transactions: Transaction[],
  assetTypes: AssetType[],
  startDate: Date,
  endDate: Date
): CashReconciliationRangeResult => {
  const checkingAccounts = assets.filter(asset => isCheckingAccount(asset, assetTypes));
  const fromDate = subDays(startDate, 1);
  const toDate = endDate;

  const initialBalance = checkingAccounts.reduce((sum, asset) => sum + getAssetValueAtDate(asset, fromDate), 0);
  const actualBalance = checkingAccounts.reduce((sum, asset) => sum + getAssetValueAtDate(asset, toDate), 0);

  const income = transactions
    .filter(t => {
      try {
        const d = parseISO(t.transactionDate);
        return d >= startDate && d <= endDate && String(t.type ?? '').toLowerCase() === 'income';
      } catch { return false; }
    })
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

  const expenses = transactions
    .filter(t => {
      try {
        const d = parseISO(t.transactionDate);
        return d >= startDate && d <= endDate && String(t.type ?? '').toLowerCase() === 'expense';
      } catch { return false; }
    })
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

  const expectedBalance = initialBalance + income - expenses;
  const difference = expectedBalance - actualBalance;
  const isBalanced = Math.abs(difference) < 0.01;

  return {
    fromDate,
    toDate,
    checkingAccounts,
    initialBalance,
    expectedBalance,
    actualBalance,
    difference,
    income,
    expenses,
    isBalanced,
  };
};

