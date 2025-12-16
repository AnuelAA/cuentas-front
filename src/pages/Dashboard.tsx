import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDashboard,
  getDashboardSummary,
  getAssets,
  getLiabilities,
  getTransactions,
  getCategories,
  getAssetTypes
} from '@/services/api';
import type { DashboardMetrics, DashboardSummary, Asset, Liability, AssetType, Category } from '@/types/api';
import { calculateCashReconciliation, calculateCashReconciliationRange, isCheckingAccount } from '@/lib/cashReconciliation';
import { Layout } from '@/components/Layout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Calendar, LineChart as LineChartIcon, Euro, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import {
  format,
  subMonths,
  endOfMonth,
  startOfMonth,
  parseISO,
  addMonths,
  startOfYear,
  endOfYear,
  subYears,
  subDays,
  isValid
} from 'date-fns';
import { toast } from 'sonner';

const TOP_N = 10;
const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#FFC107', '#8BC34A'];

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Estado principal
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);

    // Rango por defecto: mes actual
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Selección para series (activos/pasivos)
  const [selectedKeys, setSelectedKeys] = useState<Record<string, boolean>>({});
  const [selectedLiabilityKeys, setSelectedLiabilityKeys] = useState<Record<string, boolean>>({});
  const [groupByParent, setGroupByParent] = useState(false); // Toggle para agrupar por categoría padre

  // --- Helpers de rango (UI) ---
  const setYearRange = (offset: number) => {
    const start = startOfYear(subYears(new Date(), offset));
    const end = endOfYear(subYears(new Date(), offset));
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };
  const setLastMonths = (months: number) => {
    const today = new Date();
    const start = startOfMonth(subMonths(today, months - 1));
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(today, 'yyyy-MM-dd'));
  };
  const setAllTime = () => {
    setStartDate('2021-11-01');
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
  };

  // --- Filtros rápidos predefinidos ---
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  
  const setThisMonth = () => {
    const today = new Date();
    setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
    setActiveQuickFilter('thisMonth');
  };

  const setLast3Months = () => {
    const today = new Date();
    setStartDate(format(startOfMonth(subMonths(today, 2)), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
    setActiveQuickFilter('last3Months');
  };

  const setLast6Months = () => {
    const today = new Date();
    setStartDate(format(startOfMonth(subMonths(today, 5)), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
    setActiveQuickFilter('last6Months');
  };

  const setThisYear = () => {
    const today = new Date();
    setStartDate(format(startOfYear(today), 'yyyy-MM-dd'));
    setEndDate(format(endOfYear(today), 'yyyy-MM-dd'));
    setActiveQuickFilter('thisYear');
  };

  const setLastYear = () => {
    const today = new Date();
    setStartDate(format(startOfYear(subYears(today, 1)), 'yyyy-MM-dd'));
    setEndDate(format(endOfYear(subYears(today, 1)), 'yyyy-MM-dd'));
    setActiveQuickFilter('lastYear');
  };

  const setLast12Months = () => {
    const today = new Date();
    setStartDate(format(startOfMonth(subMonths(today, 11)), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
    setActiveQuickFilter('last12Months');
  };

  const setPreviousMonth = () => {
    const currentStart = parseISO(startDate);
    const prevMonth = subMonths(currentStart, 1);
    setStartDate(format(startOfMonth(prevMonth), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(prevMonth), 'yyyy-MM-dd'));
    setActiveQuickFilter('previousMonth');
  };

  const setNextMonth = () => {
    const currentStart = parseISO(startDate);
    const nextMonth = addMonths(currentStart, 1);
    setStartDate(format(startOfMonth(nextMonth), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(nextMonth), 'yyyy-MM-dd'));
    setActiveQuickFilter('nextMonth');
  };

  // --- Fetch de datos ---
  const fetchDashboard = async () => {
    if (!user?.userId) return;
    setLoading(true);
    try {
      const [
        metricsData,
        yearData,
        monthData,
        assetsData,
        liabilitiesData,
        txsData,
        catsData,
        assetTypesData
      ] = await Promise.all([
        getDashboard(user.userId, startDate, endDate),
        getDashboardSummary(user.userId, 'year'),
        getDashboardSummary(user.userId, 'lastMonth'),
        getAssets(user.userId),
        getLiabilities(user.userId),
        getTransactions(user.userId, startDate, endDate),
        getCategories(user.userId),
        getAssetTypes()
      ]);

      setMetrics(metricsData);
      setAssets(assetsData);
      setLiabilities(liabilitiesData);
      setTransactions(txsData);
      setCategories(catsData);
      setAssetTypes(assetTypesData);

      // Inicializar seleccion de series
      const initAssets: Record<string, boolean> = {};
      (assetsData || []).forEach(a => { initAssets[`asset_${a.assetId}`] = true; });
      setSelectedKeys(initAssets);

      const initLiabs: Record<string, boolean> = {};
      (liabilitiesData || []).forEach(l => {
        const id = (l as any).liabilityId ?? (l as any).id;
        initLiabs[`liab_${id}`] = true;
      });
      setSelectedLiabilityKeys(initLiabs);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Ejecutar fetch cuando cambian user / fechas
  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, startDate, endDate]);

  // Cuadre de caja en el rango visible: compara (startDate - 1 día) con endDate
  const cashReconciliationRange = useMemo(() => {
    if (!assets.length || !transactions.length || !assetTypes.length) return null;
    try {
      const s = parseISO(startDate);
      const e = parseISO(endDate);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
      return calculateCashReconciliationRange(assets, transactions, assetTypes, s, e);
    } catch {
      return null;
    }
  }, [assets, transactions, assetTypes, startDate, endDate]);

  // --- Utilidades de formato ---
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  const formatCurrencyNoCents = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

  // Helper: obtener categoría padre o la misma si no tiene padre
  const getParentCategory = (categoryId: number): Category | null => {
    const cat = categories.find(c => c.categoryId === categoryId);
    if (!cat || !cat.parentCategoryId) return cat;
    return categories.find(c => c.categoryId === cat.parentCategoryId) || cat;
  };

  // Helper: obtener todas las subcategorías de una categoría padre
  const getSubcategories = (parentId: number): Category[] => {
    return categories.filter(c => c.parentCategoryId === parentId);
  };

  // --- Transformaciones: breakdown por categoría (individual o por padre) ---
  const incomeByCategory = useMemo(() => {
    const map: Record<number, number> = {};
    (transactions || [])
      .filter(t => String(t.type ?? '').toLowerCase() === 'income')
      .forEach(t => {
        const amt = Number(t.amount) || 0;
        const cat = Number(t.categoryId);
        if (!isNaN(cat)) {
          if (groupByParent) {
            // Agrupar por categoría padre
            const parent = getParentCategory(cat);
            if (parent) {
              map[parent.categoryId] = (map[parent.categoryId] || 0) + amt;
            }
          } else {
            // Agrupar por categoría individual
            map[cat] = (map[cat] || 0) + amt;
          }
        }
      });

    if (groupByParent) {
      // Solo mostrar categorías padre (sin parentCategoryId)
      return (categories || [])
        .filter(c => !c.parentCategoryId) // Solo categorías raíz
        .map((c, i) => ({ 
          name: c.name, 
          value: map[c.categoryId] ?? 0, 
          color: c.color ?? COLORS[i % COLORS.length],
          categoryId: c.categoryId,
          subcategories: getSubcategories(c.categoryId).map(sub => ({
            name: sub.name,
            value: (transactions || [])
              .filter(t => String(t.type ?? '').toLowerCase() === 'income' && Number(t.categoryId) === sub.categoryId)
              .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
          })).filter(sub => sub.value > 0)
        }))
        .filter(d => d.value > 0);
    } else {
      // Mostrar todas las categorías individuales
      return (categories || [])
        .map((c, i) => ({ 
          name: c.name, 
          value: map[c.categoryId] ?? 0, 
          color: c.color ?? COLORS[i % COLORS.length],
          categoryId: c.categoryId
        }))
        .filter(d => d.value > 0);
    }
  }, [transactions, categories, groupByParent]);

  const expenseByCategory = useMemo(() => {
    const map: Record<number, number> = {};
    (transactions || [])
      .filter(t => String(t.type ?? '').toLowerCase() === 'expense')
      .forEach(t => {
        const amt = Math.abs(Number(t.amount) || 0);
        const cat = Number(t.categoryId);
        if (!isNaN(cat)) {
          if (groupByParent) {
            // Agrupar por categoría padre
            const parent = getParentCategory(cat);
            if (parent) {
              map[parent.categoryId] = (map[parent.categoryId] || 0) + amt;
            }
          } else {
            // Agrupar por categoría individual
            map[cat] = (map[cat] || 0) + amt;
          }
        }
      });

    if (groupByParent) {
      // Solo mostrar categorías padre (sin parentCategoryId)
      return (categories || [])
        .filter(c => !c.parentCategoryId) // Solo categorías raíz
        .map((c, i) => ({ 
          name: c.name, 
          value: map[c.categoryId] ?? 0, 
          color: c.color ?? COLORS[i % COLORS.length],
          categoryId: c.categoryId,
          subcategories: getSubcategories(c.categoryId).map(sub => ({
            name: sub.name,
            value: Math.abs((transactions || [])
              .filter(t => String(t.type ?? '').toLowerCase() === 'expense' && Number(t.categoryId) === sub.categoryId)
              .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0))
          })).filter(sub => sub.value > 0)
        }))
        .filter(d => d.value > 0);
    } else {
      // Mostrar todas las categorías individuales
      return (categories || [])
        .map((c, i) => ({ 
          name: c.name, 
          value: map[c.categoryId] ?? 0, 
          color: c.color ?? COLORS[i % COLORS.length],
          categoryId: c.categoryId
        }))
        .filter(d => d.value > 0);
    }
  }, [transactions, categories, groupByParent]);

  // Totales (fallback a metrics si vienen)
  const incomeTotal = useMemo(() => {
    if (metrics?.totalIncome != null) return metrics.totalIncome;
    return (transactions || []).filter(t => String(t.type ?? '').toLowerCase() === 'income')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }, [metrics, transactions]);

  const expenseTotal = useMemo(() => {
    if (metrics?.totalExpenses != null) return metrics.totalExpenses;
    return (transactions || []).filter(t => String(t.type ?? '').toLowerCase() === 'expense')
      .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
  }, [metrics, transactions]);

  // --- Cálculo de tendencias (comparación con período anterior) ---
  const [previousPeriodData, setPreviousPeriodData] = useState<{
    income: number;
    expenses: number;
    balance: number;
  } | null>(null);

  useEffect(() => {
    const calculatePreviousPeriod = async () => {
      if (!user?.userId || !startDate || !endDate) return;
      
      try {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        
        const prevEnd = subDays(start, 1);
        const prevStart = subDays(prevEnd, periodDays);
        
        const prevStartStr = format(prevStart, 'yyyy-MM-dd');
        const prevEndStr = format(prevEnd, 'yyyy-MM-dd');
        
        const prevTransactions = await getTransactions(user.userId, prevStartStr, prevEndStr);
        
        const prevIncome = prevTransactions
          .filter(t => String(t.type ?? '').toLowerCase() === 'income')
          .reduce((s, t) => s + (Number(t.amount) || 0), 0);
        
        const prevExpenses = prevTransactions
          .filter(t => String(t.type ?? '').toLowerCase() === 'expense')
          .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
        
        const prevBalance = prevIncome - prevExpenses;
        
        setPreviousPeriodData({ income: prevIncome, expenses: prevExpenses, balance: prevBalance });
      } catch (error) {
        console.error('Error calculating previous period:', error);
        setPreviousPeriodData(null);
      }
    };
    
    calculatePreviousPeriod();
  }, [user, startDate, endDate]);

  // Helper para calcular tendencia
  const calculateTrend = (current: number, previous: number): { value: number; isPositive: boolean } | undefined => {
    if (!previousPeriodData || previous === 0) return undefined;
    const change = ((current - previous) / Math.abs(previous)) * 100;
    return {
      value: Math.round(change * 10) / 10, // Redondear a 1 decimal
      isPositive: change >= 0
    };
  };

  const incomeTrend = useMemo(() => {
    if (!previousPeriodData) return undefined;
    return calculateTrend(incomeTotal, previousPeriodData.income);
  }, [incomeTotal, previousPeriodData]);

  const expenseTrend = useMemo(() => {
    if (!previousPeriodData) return undefined;
    // Para gastos, positivo es malo (aumenta), negativo es bueno (disminuye)
    const trend = calculateTrend(expenseTotal, previousPeriodData.expenses);
    if (!trend) return undefined;
    return { ...trend, isPositive: !trend.isPositive }; // Invertir lógica
  }, [expenseTotal, previousPeriodData]);

  const balanceTrend = useMemo(() => {
    if (!previousPeriodData) return undefined;
    const currentBalance = incomeTotal - expenseTotal;
    return calculateTrend(currentBalance, previousPeriodData.balance);
  }, [incomeTotal, expenseTotal, previousPeriodData]);

  // Helper para obtener valor de activo en un mes
  const getAssetValueForMonth = (asset: Asset, month: Date): { value: number } => {
    if (!asset.assetValues || asset.assetValues.length === 0) {
      return { value: Number(asset.currentValue || 0) };
    }
    const targetEnd = endOfMonth(month).getTime();
    const candidates = asset.assetValues
      .map((av: any) => ({ ...av, _date: parseISO(av.valuationDate) }))
      .filter((av: any) => isValid(av._date) && av._date.getTime() <= targetEnd)
      .sort((a: any, b: any) => b._date.getTime() - a._date.getTime());
    
    if (candidates.length === 0) {
      return { value: Number(asset.currentValue || 0) };
    }
    return { value: Number(candidates[0].currentValue || 0) };
  };

  // Helper para obtener snapshot de pasivo en un mes
  const getLiabilitySnapshotForMonth = (liability: Liability, month: Date) => {
    if (!liability.liabilityValues || liability.liabilityValues.length === 0) {
      return { outstandingBalance: Number(liability.outstandingBalance || 0) };
    }
    const targetEnd = endOfMonth(month).getTime();
    const candidates = liability.liabilityValues
      .map((lv: any) => ({ ...lv, _date: parseISO(lv.valuationDate) }))
      .filter((lv: any) => isValid(lv._date) && lv._date.getTime() <= targetEnd)
      .sort((a: any, b: any) => b._date.getTime() - a._date.getTime());
    
    if (candidates.length === 0) {
      return { outstandingBalance: Number(liability.outstandingBalance || 0) };
    }
    return { outstandingBalance: Number(candidates[0].outstandingBalance || 0) };
  };

  // --- Gráfico de evolución de patrimonio neto ---
  const netWorthEvolution = useMemo(() => {
    if (!assets.length && !liabilities.length) return [];
    
    // Obtener todas las fechas únicas de valoraciones
    const allDates = new Set<string>();
    
    assets.forEach(asset => {
      if (asset.assetValues) {
        asset.assetValues.forEach((av: any) => {
          if (av.valuationDate) {
            const date = parseISO(av.valuationDate);
            if (isValid(date)) {
              allDates.add(format(startOfMonth(date), 'yyyy-MM-dd'));
            }
          }
        });
      }
    });
    
    liabilities.forEach(liability => {
      if (liability.liabilityValues) {
        liability.liabilityValues.forEach((lv: any) => {
          if (lv.valuationDate) {
            const date = parseISO(lv.valuationDate);
            if (isValid(date)) {
              allDates.add(format(startOfMonth(date), 'yyyy-MM-dd'));
            }
          }
        });
      }
    });
    
    // Ordenar fechas
    const sortedDates = Array.from(allDates).sort();
    
    return sortedDates.map(dateStr => {
      const date = parseISO(dateStr);
      
      // Calcular total de activos para este mes
      let totalAssets = 0;
      assets.forEach(asset => {
        const value = getAssetValueForMonth(asset, date);
        totalAssets += value.value;
      });
      
      // Calcular total de pasivos para este mes
      let totalLiabilities = 0;
      liabilities.forEach(liability => {
        const snapshot = getLiabilitySnapshotForMonth(liability, date);
        totalLiabilities += snapshot.outstandingBalance;
      });
      
      return {
        month: format(date, 'MMM yyyy'),
        date: dateStr,
        assets: totalAssets,
        liabilities: totalLiabilities,
        netWorth: totalAssets - totalLiabilities
      };
    });
  }, [assets, liabilities]);


  const incomeVsExpense = [
    { name: 'Ingresos', value: incomeTotal ?? 0, color: '#4CAF50' },
    { name: 'Gastos', value: expenseTotal ?? 0, color: '#F44336' }
  ];

  // Colapsa categorías (Top N + "Otros")
  const collapseTop = (data: { name: string; value: number; color?: string }[], topN = TOP_N) => {
    if (!data || data.length === 0) return [];
    const sorted = [...data].sort((a, b) => b.value - a.value);
    if (sorted.length <= topN) return sorted;
    const top = sorted.slice(0, topN);
    const othersValue = sorted.slice(topN).reduce((s, d) => s + d.value, 0);
    top.push({ name: 'Otros', value: othersValue, color: '#d1d5db' });
    return top;
  };

  const incomeByCategoryTop = useMemo(() => collapseTop(incomeByCategory, TOP_N), [incomeByCategory]);
  const expenseByCategoryTop = useMemo(() => collapseTop(expenseByCategory, TOP_N), [expenseByCategory]);

  // Inversiones: invertido neto (rango) vs valor actual (Y)
  const investmentsSummary = useMemo(() => {
    if (!assets.length || !transactions.length || !assetTypes.length) return null;

    const tryParse = (iso?: string | null) => {
      if (!iso) return null;
      try { return parseISO(iso); } catch { return null; }
    };
    const s = tryParse(startDate);
    const e = tryParse(endDate);
    if (!s || !e) return null;
    const sMinus1 = subDays(s, 1);

    const type2Assets = assets.filter(a => a.assetTypeId === 2);
    const isType2Related = (relatedAssetId?: number | null) => {
      if (!relatedAssetId) return false;
      const ra = assets.find(a => a.assetId === relatedAssetId);
      return !!ra && ra.assetTypeId === 2;
    };

    // Neto invertido en el rango X..Y: ingresos (aportaciones) menos gastos (retiradas) donde hay activo relacionado no corriente
    let investedNet = 0;
    transactions.forEach(t => {
      const d = tryParse(t.transactionDate);
      if (!d || d < s || d > e) return;
      if (!isType2Related(t.relatedAssetId ?? null)) return;
      const amt = Math.abs(Number(t.amount) || 0);
      const type = String(t.type ?? '').toLowerCase();
      // Según tu regla: gasto = aportación; ingreso = retirada
      if (type === 'expense') investedNet += amt;
      else if (type === 'income') investedNet -= amt;
    });

    // Valor actual de inversiones a Y (última valoración <= Y)
    const getAt = (asset: any, at: Date) => {
      const vals = (asset.assetValues ?? []).map((v: any) => ({ d: tryParse(v.valuationDate), v: Number(v.currentValue ?? v.outstandingBalance ?? 0) }))
        .filter(x => x.d && x.d.getTime() <= at.getTime())
        .sort((a, b) => (b.d!.getTime() - a.d!.getTime()));
      if (vals.length > 0) return vals[0].v;
      return Number(asset.currentValue ?? 0);
    };
    const currentValue = type2Assets.reduce((suma, a) => suma + getAt(a, e), 0);
    const startValue = type2Assets.reduce((suma, a) => suma + getAt(a, sMinus1), 0);
    const deltaInvestments = currentValue - startValue; // variación bruta de valor
    const netPerformance = deltaInvestments - investedNet; // variación neta tras aportaciones/retiros

    return { investedNet, currentValue, deltaInvestments, netPerformance };
  }, [assets, transactions, assetTypes, startDate, endDate]);

  // Variación de pasivos en el rango (X-1 -> Y). Efecto positivo si bajan
  const liabilitiesDeltaSummary = useMemo(() => {
    if (!liabilities.length) return null;
    const tryParse = (iso?: string | null) => {
      if (!iso) return null;
      try { return parseISO(iso); } catch { return null; }
    };
    const s = tryParse(startDate);
    const e = tryParse(endDate);
    if (!s || !e) return null;
    const sMinus1 = subDays(s, 1);

    const getLiabAt = (liab: any, at: Date) => {
      const arr = (liab.liabilityValues ?? liab.progress ?? []).map((v: any) => ({ d: tryParse(v.valuationDate ?? v.date), v: Number(v.outstandingBalance ?? v.currentValue ?? v.amount ?? 0) }))
        .filter(x => x.d && x.d.getTime() <= at.getTime())
        .sort((a, b) => (b.d!.getTime() - a.d!.getTime()));
      if (arr.length > 0) return arr[0].v;
      return Number(liab.outstandingBalance ?? 0);
    };

    const startSum = liabilities.reduce((sum, l) => sum + getLiabAt(l, sMinus1), 0);
    const endSum = liabilities.reduce((sum, l) => sum + getLiabAt(l, e), 0);
    const effect = startSum - endSum; // si bajan pasivos, effect positivo
    return { startSum, endSum, effect };
  }, [liabilities, startDate, endDate]);

  // --- Leyenda ordenada renderizada externamente (evita solapado en Recharts) ---
  const renderSortedLegend = (data: { name: string; value: number; color?: string; subcategories?: Array<{ name: string; value: number }> }[], total: number) => {
    const items = [...(data || [])].sort((a, b) => b.value - a.value);
    return (
      <div className="w-full mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it, idx) => (
            <div key={idx} className="p-3 rounded-md bg-muted/30 border">
              <div className="flex items-center gap-2 mb-2">
                <span 
                  style={{ 
                    width: 14, 
                    height: 14, 
                    background: it.color ?? COLORS[idx % COLORS.length], 
                    display: 'inline-block', 
                    borderRadius: 3,
                    flexShrink: 0
                  }} 
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{it.name}</div>
                  <div className="text-xs font-medium text-primary">
                    {formatCurrency(it.value)} ({Math.round((it.value / (total || 1)) * 100)}%)
                  </div>
                </div>
              </div>
              {/* Mostrar subcategorías si existen y estamos agrupando por padre */}
              {groupByParent && it.subcategories && it.subcategories.length > 0 && (
                <div className="ml-6 mt-2 space-y-1 border-l-2 border-muted pl-2">
                  {it.subcategories.map((sub, subIdx) => (
                    <div key={subIdx} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate flex-1">{sub.name}</span>
                      <span className="ml-2 font-medium">{formatCurrency(sub.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- Cálculo de meses y series para Activos/Pasivos (similar para ambos) ---
  const buildMonthsSeries = (
    items: any[],
    getValues: (item: any) => { date: Date; value: number }[],
    colorOffset = 0
  ) => {
    // Build months between startDate..endDate (o fallback a últimos 12 meses)
    const tryParse = (iso?: string | null) => {
      if (!iso) return null;
      try { return parseISO(iso); } catch { return null; }
    };
    const parsedStart = tryParse(startDate);
    const parsedEnd = tryParse(endDate);
    const monthsInfo: { label: string; monthEnd: Date }[] = [];

    if (parsedStart && parsedEnd) {
      let cur = startOfMonth(parsedStart);
      const last = endOfMonth(parsedEnd);
      while (cur.getTime() <= last.getTime()) {
        monthsInfo.push({ label: format(cur, 'MMM yyyy'), monthEnd: endOfMonth(cur) });
        cur = addMonths(cur, 1);
      }
    } else {
      const anchor = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(anchor, i);
        monthsInfo.push({ label: format(d, 'MMM yyyy'), monthEnd: endOfMonth(d) });
      }
    }

    const months = monthsInfo.map(m => ({ month: m.label } as Record<string, any>));
    const infos = items.map((it, idx) => {
      const key = it.key;
      const name = it.name;
      const getColor = (i: number) => `hsl(${(i * 57 + colorOffset) % 360} 70% 50%)`;
      const values = (getValues(it) || [])
        .filter(v => v.date instanceof Date && !isNaN(v.date.getTime()))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      // inicializar meses
      months.forEach(m => { m[key] = 0; });

      let idxValue = 0;
      let lastKnown: number | null = null;
      monthsInfo.forEach((mInfo, mi) => {
        while (idxValue < values.length && values[idxValue].date.getTime() <= mInfo.monthEnd.getTime()) {
          lastKnown = values[idxValue].value;
          idxValue++;
        }
        months[mi][key] = lastKnown ?? 0;
      });

      return { id: it.id ?? idx, key, name, color: getColor(idx) };
    });

    return { months, infos };
  };

  // Assets series
    const { months: chartMonths, infos: assetsInfo } = useMemo(() => {
      const items = (assets || []).map(a => ({ ...a, key: `asset_${a.assetId}`, id: a.assetId, name: a.name }));
      const getValues = (asset: any) =>
        (asset.assetValues ?? []).map((v: any) => ({
          date: parseISO(v.valuationDate),
          value: Number(v.currentValue ?? v.outstandingBalance ?? 0)
        }));
      return buildMonthsSeries(items, getValues, 0);
    }, [assets, metrics, startDate, endDate]);

  // Liabilities series
  const { months: liabChartMonths, infos: liabilitiesInfo } = useMemo(() => {
    const items = (liabilities || []).map(l => {
      const id = (l as any).liabilityId ?? (l as any).id;
      return { ...l, key: `liab_${id}`, id, name: (l as any).name ?? `#${id}` };
    });
    const getValues = (liab: any) => (liab.liabilityValues ?? liab.progress ?? []).map((v: any) => {
      const dateStr = v.valuationDate ?? v.date;
      return { date: parseISO(dateStr), value: Number(v.outstandingBalance ?? v.currentValue ?? v.amount ?? 0) };
    });
    return buildMonthsSeries(items, getValues, 120);
  }, [liabilities, metrics, startDate, endDate]);

  // Mapas para tooltips
  const assetNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    (assetsInfo || []).forEach(ai => { m[ai.key] = ai.name; });
    return m;
  }, [assetsInfo]);
  const liabilityNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    (liabilitiesInfo || []).forEach(li => { m[li.key] = li.name; });
    return m;
  }, [liabilitiesInfo]);

  // Custom tooltip para líneas (activos/pasivos)
  const CustomTooltipAssets: React.FC<any> = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="bg-white p-3 border rounded shadow-sm">
        <div className="font-medium mb-2">{label}</div>
        {payload.map((p: any) => {
          const key = p.dataKey ?? p.name;
          const name = assetNameMap[key] ?? String(key);
          const value = Number(p.value ?? 0);
          const color = p.stroke ?? p.color ?? '#000';
          return (
            <div key={key} className="flex items-center gap-2 text-sm" style={{ color }}>
              <span style={{ width: 10, height: 10, background: color, display: 'inline-block', borderRadius: 2 }} />
              <div>{name} : {formatCurrency(value)}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const CustomTooltipLiabilities: React.FC<any> = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="bg-white p-3 border rounded shadow-sm">
        <div className="font-medium mb-2">{label}</div>
        {payload.map((p: any) => {
          const key = p.dataKey ?? p.name;
          const name = liabilityNameMap[key] ?? String(key);
          const value = Number(p.value ?? 0);
          const color = p.stroke ?? p.color ?? '#000';
          return (
            <div key={key} className="flex items-center gap-2 text-sm" style={{ color }}>
              <span style={{ width: 10, height: 10, background: color, display: 'inline-block', borderRadius: 2 }} />
              <div>{name} : {formatCurrency(value)}</div>
            </div>
          );
        })}
      </div>
    );
  };

  // Helpers para seleccionar/deseleccionar series
  const toggleKey = (key: string) => setSelectedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleLiabilityKey = (key: string) => setSelectedLiabilityKeys(prev => ({ ...prev, [key]: !prev[key] }));

  const selectAll = () => {
    const all: Record<string, boolean> = {};
    (assetsInfo || []).forEach(a => { all[a.key] = true; });
    setSelectedKeys(all);
  };
  const deselectAll = () => {
    const none: Record<string, boolean> = {};
    (assetsInfo || []).forEach(a => { none[a.key] = false; });
    setSelectedKeys(none);
  };
  const selectAllLiabilities = () => {
    const all: Record<string, boolean> = {};
    (liabilitiesInfo || []).forEach(l => { all[l.key] = true; });
    setSelectedLiabilityKeys(all);
  };
  const deselectAllLiabilities = () => {
    const none: Record<string, boolean> = {};
    (liabilitiesInfo || []).forEach(l => { none[l.key] = false; });
    setSelectedLiabilityKeys(none);
  };

  // Dominios para ejes Y
  const buildDomain = (maxValue: number) => {
    if (!isFinite(maxValue) || maxValue <= 0) return [0, 100];
    const candidate = Math.ceil(maxValue * 1.05);
    return [0, candidate];
  };

  // Máximos para Y
  const assetsMax = useMemo(() => {
    let max = 0;
    (chartMonths || []).forEach(m => {
      (assetsInfo || []).forEach(a => {
        if (!selectedKeys[a.key]) return;
        const v = Number(m[a.key] ?? 0);
        if (!isNaN(v) && v > max) max = v;
      });
    });
    return max;
  }, [chartMonths, assetsInfo, selectedKeys]);

  const liabilitiesMax = useMemo(() => {
    let max = 0;
    (liabChartMonths || []).forEach(m => {
      (liabilitiesInfo || []).forEach(l => {
        if (!selectedLiabilityKeys[l.key]) return;
        const v = Number(m[l.key] ?? 0);
        if (!isNaN(v) && v > max) max = v;
      });
    });
    return max;
  }, [liabChartMonths, liabilitiesInfo, selectedLiabilityKeys]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  // --- Render ---
  return (
    <Layout>
      <div className="space-y-6 px-2 sm:px-0">
        {/* Header: título + filtros de rango */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard Financiero</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActiveQuickFilter(null);
                }} 
                className="rounded-md border border-input bg-background px-2 sm:px-3 py-1 text-sm w-full sm:w-auto" 
              />
              <span className="text-sm text-muted-foreground hidden sm:inline">-</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActiveQuickFilter(null);
                }} 
                className="rounded-md border border-input bg-background px-2 sm:px-3 py-1 text-sm w-full sm:w-auto" 
              />
              <Button onClick={fetchDashboard} size="sm" className="w-full sm:w-auto">Actualizar</Button>
            </div>

            {/* Filtros rápidos predefinidos */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground hidden sm:inline">Rápido:</span>
              <Button 
                size="sm" 
                variant={activeQuickFilter === 'previousMonth' ? 'default' : 'outline'} 
                onClick={setPreviousMonth} 
                className="text-xs sm:text-sm"
                title="Mes anterior"
              >
                ← Mes anterior
              </Button>
              <Button 
                size="sm" 
                variant={activeQuickFilter === 'thisMonth' ? 'default' : 'outline'} 
                onClick={setThisMonth} 
                className="text-xs sm:text-sm"
              >
                Este mes
              </Button>
              <Button 
                size="sm" 
                variant={activeQuickFilter === 'nextMonth' ? 'default' : 'outline'} 
                onClick={setNextMonth} 
                className="text-xs sm:text-sm"
                title="Mes siguiente"
              >
                Mes siguiente →
              </Button>
              <Button 
                size="sm" 
                variant={activeQuickFilter === 'last3Months' ? 'default' : 'outline'} 
                onClick={setLast3Months} 
                className="text-xs sm:text-sm"
              >
                3 meses
              </Button>
              <Button 
                size="sm" 
                variant={activeQuickFilter === 'last6Months' ? 'default' : 'outline'} 
                onClick={setLast6Months} 
                className="text-xs sm:text-sm"
              >
                6 meses
              </Button>
              <Button 
                size="sm" 
                variant={activeQuickFilter === 'thisYear' ? 'default' : 'outline'} 
                onClick={setThisYear} 
                className="text-xs sm:text-sm"
              >
                Este año
              </Button>
              <Button 
                size="sm" 
                variant={activeQuickFilter === 'lastYear' ? 'default' : 'outline'} 
                onClick={setLastYear} 
                className="text-xs sm:text-sm"
              >
                Año pasado
              </Button>
              <Button 
                size="sm" 
                variant={activeQuickFilter === 'last12Months' ? 'default' : 'outline'} 
                onClick={setLast12Months} 
                className="text-xs sm:text-sm"
              >
                12 meses
              </Button>
            </div>
          </div>
        </div>

        {/* Resumen Ejecutivo */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Resumen Ejecutivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Patrimonio Neto</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    (assets.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0)) -
                    (liabilities.reduce((sum, l) => {
                      const latest = (l.liabilityValues || []).sort((a: any, b: any) => 
                        new Date(b.valuationDate).getTime() - new Date(a.valuationDate).getTime()
                      )[0];
                      return sum + (Number(latest?.outstandingBalance || l.outstandingBalance || 0));
                    }, 0))
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Ingresos</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(incomeTotal)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(startDate), 'dd/MM/yyyy')} - {format(parseISO(endDate), 'dd/MM/yyyy')}
                </p>
                {incomeTrend && (
                  <p className={`text-xs flex items-center gap-1 ${incomeTrend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {incomeTrend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {incomeTrend.isPositive ? '+' : ''}{incomeTrend.value}% vs período anterior
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gastos</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(expenseTotal)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(startDate), 'dd/MM/yyyy')} - {format(parseISO(endDate), 'dd/MM/yyyy')}
                </p>
                {expenseTrend && (
                  <p className={`text-xs flex items-center gap-1 ${expenseTrend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {expenseTrend.isPositive ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    {expenseTrend.isPositive ? '-' : '+'}{Math.abs(expenseTrend.value)}% vs período anterior
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Resultado</p>
                <p className={`text-2xl font-bold ${(incomeTotal - expenseTotal) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(incomeTotal - expenseTotal) >= 0 ? '+' : ''}{formatCurrency(incomeTotal - expenseTotal)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {incomeTotal > 0 ? `Ahorro: ${Math.round(((incomeTotal - expenseTotal) / incomeTotal) * 100)}%` : 'Sin ingresos'}
                </p>
                {balanceTrend && (
                  <p className={`text-xs flex items-center gap-1 ${balanceTrend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {balanceTrend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {balanceTrend.isPositive ? '+' : ''}{balanceTrend.value}% vs período anterior
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 1) Líquido */}
        <h3 className="text-base font-semibold text-muted-foreground">Líquido</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0">
            <StatCard 
              title="Ingresos Totales" 
              value={formatCurrency(metrics?.totalIncome || 0)} 
              icon={TrendingUp} 
              className="border-l-4 border-l-success"
              trend={incomeTrend}
            />
          </div>
          <div className="min-w-0">
            <StatCard 
              title="Gastos Totales" 
              value={formatCurrency(metrics?.totalExpenses || 0)} 
              icon={TrendingDown} 
              className="border-l-4 border-l-destructive"
              trend={expenseTrend}
            />
          </div>
          <div className="min-w-0">
            <StatCard 
              title="Balance Neto" 
              value={formatCurrency(metrics?.netBalance || 0)} 
              icon={Euro} 
              className="border-l-4 border-l-primary"
              trend={balanceTrend}
            />
          </div>
        </div>

        {/* 2) Líquido + Invertido */}
        {investmentsSummary && liabilitiesDeltaSummary && (
          <Card>
            <CardHeader>
              <CardTitle>Líquido + Invertido</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const liquidNet = (metrics?.totalIncome || 0) - (metrics?.totalExpenses || 0);
                const investedPlusMove = investmentsSummary.investedNet + investmentsSummary.netPerformance; // = delta valor
                const combined = liquidNet + investedPlusMove + liabilitiesDeltaSummary.effect;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Líquido (Ingresos − Gastos)</p>
                      <p className={`text-xl font-semibold ${liquidNet >= 0 ? 'text-green-700' : 'text-red-700'}`}>{liquidNet >= 0 ? '+' : ''}{formatCurrency(liquidNet)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Invertido + movimiento inversiones</p>
                      <p className={`text-xl font-semibold ${investedPlusMove >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {investedPlusMove >= 0 ? '+' : ''}{formatCurrency(investedPlusMove)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total</p>
                      <p className="text-2xl font-bold">{formatCurrency(combined)}</p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* 3) Invertido */}
        {investmentsSummary && (
          <Card>
            <CardHeader>
              <CardTitle>Invertido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Invertido neto (rango)</p>
                  <p className="text-xl font-semibold text-blue-700">{formatCurrency(investmentsSummary.investedNet)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Variación neta inversiones</p>
                  <p className={`text-xl font-semibold ${investmentsSummary.netPerformance >= 0 ? 'text-green-700' : 'text-red-700'}`}>{investmentsSummary.netPerformance >= 0 ? '+' : ''}{formatCurrency(investmentsSummary.netPerformance)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Valor actual</p>
                  <p className="text-xl font-semibold">{formatCurrency(investmentsSummary.currentValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cuadre de Caja (rango: X-1 vs Y) */}
        {cashReconciliationRange && (
          <Card className={cashReconciliationRange.isBalanced ? 'border-green-200 bg-gradient-to-br from-green-50 to-green-50/50' : 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-50/50'}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {cashReconciliationRange.isBalanced ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <CardTitle>
                  Cuadre de Caja
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Balance Inicial</p>
                    <p className="text-lg font-semibold">{formatCurrency(cashReconciliationRange.initialBalance)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Ingresos (rango)</p>
                    <p className="text-lg font-semibold text-green-700">+{formatCurrency(cashReconciliationRange.income)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Gastos (rango)</p>
                    <p className="text-lg font-semibold text-red-700">-{formatCurrency(cashReconciliationRange.expenses)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Balance Esperado</p>
                    <p className="text-lg font-semibold">{formatCurrency(cashReconciliationRange.expectedBalance)}</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Balance Real</p>
                      <p className="text-2xl font-bold">{formatCurrency(cashReconciliationRange.actualBalance)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ({cashReconciliationRange.checkingAccounts.length} {cashReconciliationRange.checkingAccounts.length === 1 ? 'cuenta corriente' : 'cuentas corrientes'})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">Diferencia</p>
                      <p className={`text-2xl font-bold ${cashReconciliationRange.isBalanced ? 'text-green-700' : Math.abs(cashReconciliationRange.difference) > 100 ? 'text-red-700' : 'text-yellow-700'}`}>
                        {cashReconciliationRange.difference >= 0 ? '+' : ''}{formatCurrency(cashReconciliationRange.difference)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {!cashReconciliationRange.isBalanced && (
                  <div className={`rounded-lg p-3 ${Math.abs(cashReconciliationRange.difference) > 100 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    <p className="text-sm font-medium">
                      {cashReconciliationRange.difference > 0 
                        ? `⚠️ Hay ${formatCurrency(Math.abs(cashReconciliationRange.difference))} más en las cuentas de lo esperado. Podría faltar registrar alguna transacción de gasto en el rango.`
                        : `⚠️ Hay ${formatCurrency(Math.abs(cashReconciliationRange.difference))} menos en las cuentas de lo esperado. Podría faltar registrar alguna transacción de ingreso en el rango.`
                      }
                    </p>
                  </div>
                )}
                
                {cashReconciliationRange.isBalanced && (
                  <div className="rounded-lg p-3 bg-green-100 text-green-800">
                    <p className="text-sm font-medium">
                      ✓ La caja cuadra correctamente. Todas las transacciones están registradas.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gráfico de evolución de patrimonio neto */}
        {netWorthEvolution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Evolución del Patrimonio Neto</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLineChart data={netWorthEvolution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(value)}
                    labelFormatter={(label) => `Mes: ${label}`}
                  />
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
                  <Line 
                    type="monotone" 
                    dataKey="netWorth" 
                    stroke="#4CAF50" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Patrimonio Neto"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="assets" 
                    stroke="#2196F3" 
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Activos"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="liabilities" 
                    stroke="#F44336" 
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Pasivos"
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Gráficos: Ingresos vs Gastos + breakdowns */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 mb-4">
          {/* Ingresos vs Gastos */}
          <Card>
            <CardHeader><CardTitle>Ingresos vs Gastos</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center pt-6">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={incomeVsExpense} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={36} outerRadius={64} labelLine={false} label={false}>
                    {incomeVsExpense.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ingresos por categoría (Top N) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ingresos por categoría (Top {TOP_N})</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGroupByParent(!groupByParent)}
                  className="text-xs"
                >
                  {groupByParent ? 'Ver individuales' : 'Agrupar por padre'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {incomeByCategoryTop.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">No hay ingresos en el periodo</div>
              ) : (
                <>
                  <div className="flex items-center justify-center pt-6">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={incomeByCategoryTop} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={34} outerRadius={68} label={false} labelLine={false}>
                          {incomeByCategoryTop.map((entry, idx) => <Cell key={idx} fill={entry.color ?? COLORS[idx % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => `${Math.round((v / (incomeTotal || 1)) * 100)}% — ${formatCurrency(Number(v))}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {renderSortedLegend(incomeByCategoryTop, incomeTotal)}
                </>
              )}
            </CardContent>
          </Card>

          {/* Gastos por categoría (Top N) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Gastos por categoría (Top {TOP_N})</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGroupByParent(!groupByParent)}
                  className="text-xs"
                >
                  {groupByParent ? 'Ver individuales' : 'Agrupar por padre'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {expenseByCategoryTop.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">No hay gastos en el periodo</div>
              ) : (
                <>
                  <div className="flex items-center justify-center pt-6">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={expenseByCategoryTop} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={34} outerRadius={68} label={false} labelLine={false}>
                          {expenseByCategoryTop.map((entry, idx) => <Cell key={idx} fill={entry.color ?? COLORS[idx % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => `${Math.round((v / (expenseTotal || 1)) * 100)}% — ${formatCurrency(Number(v))}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {renderSortedLegend(expenseByCategoryTop, expenseTotal)}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Inversiones: invertido (neto en rango) vs valor actual */}
        {investmentsSummary && (
          <Card>
            <CardHeader>
              <CardTitle>Inversiones — Invertido vs Valor actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Invertido neto (rango)</p>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(investmentsSummary.investedNet)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Valor actual (fin del rango)</p>
                  <p className="text-2xl font-bold">{formatCurrency(investmentsSummary.currentValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evolución de Activos */}
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5" />
              Evolución de Activos (por activo)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            <div className="mb-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAll} className="text-xs">Todo</Button>
                <Button size="sm" variant="outline" onClick={deselectAll} className="text-xs">Ninguno</Button>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {(assetsInfo || []).map(info => (
                  <label key={info.key} className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!selectedKeys[info.key]} onChange={() => toggleKey(info.key)} />
                    <span style={{ width: 10, height: 10, background: info.color, display: 'inline-block', borderRadius: 2 }} />
                    <span className="max-w-xs truncate">{info.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="h-[300px] sm:h-[420px] overflow-visible -ml-2 sm:-ml-8">
              <ResponsiveContainer width="100%" height="100%" style={{ overflow: 'visible' }}>
                <RechartsLineChart data={chartMonths} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis type="number" domain={buildDomain(assetsMax)} tickFormatter={(v) => formatCurrencyNoCents(Number(v))} tick={{ fontSize: 12 }} />
                  <Tooltip content={CustomTooltipAssets} />
                  {(assetsInfo || []).map(info =>
                    selectedKeys[info.key] ? (
                      <Line key={info.key} type="monotone" dataKey={info.key} name={info.name} stroke={info.color} dot={false} strokeWidth={2} />
                    ) : null
                  )}
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Evolución de Pasivos */}
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5" />
              Evolución de Pasivos (por pasivo)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            <div className="mb-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selectAllLiabilities} className="text-xs">Todo</Button>
                <Button size="sm" variant="outline" onClick={deselectAllLiabilities} className="text-xs">Ninguno</Button>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {(liabilitiesInfo || []).map(info => (
                  <label key={info.key} className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!selectedLiabilityKeys[info.key]} onChange={() => toggleLiabilityKey(info.key)} />
                    <span style={{ width: 10, height: 10, background: info.color, display: 'inline-block', borderRadius: 2 }} />
                    <span className="max-w-xs truncate">{info.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="h-[300px] sm:h-[420px] overflow-visible -ml-2 sm:-ml-8">
              <ResponsiveContainer width="100%" height="100%" style={{ overflow: 'visible' }}>
                <RechartsLineChart data={liabChartMonths} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis type="number" domain={buildDomain(liabilitiesMax)} tickFormatter={(v) => formatCurrencyNoCents(Number(v))} tick={{ fontSize: 12 }} />
                  <Tooltip content={CustomTooltipLiabilities} />
                  {(liabilitiesInfo || []).map(info =>
                    selectedLiabilityKeys[info.key] ? (
                      <Line key={info.key} type="monotone" dataKey={info.key} name={info.name} stroke={info.color} dot={false} strokeWidth={2} />
                    ) : null
                  )}
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
};

export default Dashboard;