import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDashboard,
  getDashboardSummary,
  getAssets,
  getLiabilities,
  getTransactions,
  getCategories
} from '@/services/api';
import type { DashboardMetrics, DashboardSummary, Asset, Liability } from '@/types/api';
import { Layout } from '@/components/Layout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Calendar, LineChart as LineChartIcon, Euro } from 'lucide-react';
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
  CartesianGrid
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
  subYears
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
  const [loading, setLoading] = useState(true);

  // Rango por defecto: último mes
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));

  // Selección para series (activos/pasivos)
  const [selectedKeys, setSelectedKeys] = useState<Record<string, boolean>>({});
  const [selectedLiabilityKeys, setSelectedLiabilityKeys] = useState<Record<string, boolean>>({});

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
    setStartDate('2000-01-01');
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
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
        catsData
      ] = await Promise.all([
        getDashboard(user.userId, startDate, endDate),
        getDashboardSummary(user.userId, 'year'),
        getDashboardSummary(user.userId, 'lastMonth'),
        getAssets(user.userId),
        getLiabilities(user.userId),
        getTransactions(user.userId, startDate, endDate),
        getCategories(user.userId)
      ]);

      setMetrics(metricsData);
      setAssets(assetsData);
      setLiabilities(liabilitiesData);
      setTransactions(txsData);
      setCategories(catsData);

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

  // --- Utilidades de formato ---
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  const formatCurrencyNoCents = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

  // --- Transformaciones: breakdown por categoría ---
  const incomeByCategory = useMemo(() => {
    const map: Record<number, number> = {};
    (transactions || [])
      .filter(t => String(t.type ?? '').toLowerCase() === 'income')
      .forEach(t => {
        const amt = Number(t.amount) || 0;
        const cat = Number(t.categoryId);
        if (!isNaN(cat)) map[cat] = (map[cat] || 0) + amt;
      });

    return (categories || [])
      .map((c, i) => ({ name: c.name, value: map[c.categoryId] ?? 0, color: c.color ?? COLORS[i % COLORS.length] }))
      .filter(d => d.value > 0);
  }, [transactions, categories]);

  const expenseByCategory = useMemo(() => {
    const map: Record<number, number> = {};
    (transactions || [])
      .filter(t => String(t.type ?? '').toLowerCase() === 'expense')
      .forEach(t => {
        const amt = Math.abs(Number(t.amount) || 0);
        const cat = Number(t.categoryId);
        if (!isNaN(cat)) map[cat] = (map[cat] || 0) + amt;
      });

    return (categories || [])
      .map((c, i) => ({ name: c.name, value: map[c.categoryId] ?? 0, color: c.color ?? COLORS[i % COLORS.length] }))
      .filter(d => d.value > 0);
  }, [transactions, categories]);

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

  // --- Leyenda ordenada renderizada externamente (evita solapado en Recharts) ---
  const renderSortedLegend = (data: { name: string; value: number; color?: string }[], total: number) => {
    const items = [...(data || [])].sort((a, b) => b.value - a.value);
    return (
      <div style={{ width: 180, maxHeight: 220, overflowY: 'auto', fontSize: 12 }}>
        {items.map((it, idx) => (
          <div key={idx} className="flex items-center gap-2" style={{ marginBottom: 8 }}>
            <span style={{ width: 12, height: 12, background: it.color ?? COLORS[idx % COLORS.length], display: 'inline-block', borderRadius: 3 }} />
            <div className="truncate text-sm" style={{ maxWidth: 100 }}>{it.name}</div>
            <div className="ml-auto text-xs text-muted-foreground">{Math.round((it.value / (total || 1)) * 100)}%</div>
          </div>
        ))}
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
      const anchor = tryParse(metrics?.asOfDate as string) ?? new Date();
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
  const { chartMonths, assetsInfo } = useMemo(() => {
    const items = (assets || []).map(a => ({ ...a, key: `asset_${a.assetId}`, id: a.assetId, name: a.name }));
    const getValues = (asset: any) => (asset.assetValues ?? []).map((v: any) => ({ date: parseISO(v.valuationDate), value: Number(v.currentValue ?? v.outstandingBalance ?? 0) }));
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
      <div className="space-y-6">
        {/* Header: título + filtros de rango */}
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Financiero</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-md border border-input bg-background px-3 py-1 text-sm" />
              <span className="text-sm text-muted-foreground">-</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-md border border-input bg-background px-3 py-1 text-sm" />
              <Button onClick={fetchDashboard} size="sm">Actualizar</Button>
            </div>

            <div className="ml-4 flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setLastMonths(6)}>Últimos 6 meses</Button>
              <Button size="sm" variant="outline" onClick={() => setLastMonths(12)}>Últimos 12 meses</Button>
              <Button size="sm" variant="outline" onClick={setAllTime}>Todo el tiempo</Button>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0">
            <StatCard title="Ingresos Totales" value={formatCurrency(metrics?.totalIncome || 0)} icon={TrendingUp} className="border-l-4 border-l-success" />
          </div>
          <div className="min-w-0">
            <StatCard title="Gastos Totales" value={formatCurrency(metrics?.totalExpenses || 0)} icon={TrendingDown} className="border-l-4 border-l-destructive" />
          </div>
          <div className="min-w-0">
            <StatCard title="Balance Neto" value={formatCurrency(metrics?.netBalance || 0)} icon={Euro} className="border-l-4 border-l-primary" />
          </div>
        </div>

        {/* Gráficos: Ingresos vs Gastos + breakdowns */}
        <div className="grid gap-4 md:grid-cols-3 mb-4">
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
            <CardHeader><CardTitle>Ingresos por categoría (Top {TOP_N})</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center pt-6">
              {incomeByCategoryTop.length === 0 ? (
                <div className="text-sm text-muted-foreground">No hay ingresos en el periodo</div>
              ) : (
                <div className="flex items-center gap-4 w-full" style={{ height: 220 }}>
                  <div style={{ flex: '0 0 60%', minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={incomeByCategoryTop} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={34} outerRadius={68} label={false} labelLine={false}>
                          {incomeByCategoryTop.map((entry, idx) => <Cell key={idx} fill={entry.color ?? COLORS[idx % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => `${Math.round((v / (incomeTotal || 1)) * 100)}% — ${formatCurrency(Number(v))}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: '0 0 40%', display: 'flex', justifyContent: 'flex-start' }}>
                    {renderSortedLegend(incomeByCategoryTop, incomeTotal)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gastos por categoría (Top N) */}
          <Card>
            <CardHeader><CardTitle>Gastos por categoría (Top {TOP_N})</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center pt-6">
              {expenseByCategoryTop.length === 0 ? (
                <div className="text-sm text-muted-foreground">No hay gastos en el periodo</div>
              ) : (
                <div className="flex items-center gap-4 w-full" style={{ height: 220 }}>
                  <div style={{ flex: '0 0 60%', minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={expenseByCategoryTop} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={34} outerRadius={68} label={false} labelLine={false}>
                          {expenseByCategoryTop.map((entry, idx) => <Cell key={idx} fill={entry.color ?? COLORS[idx % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => `${Math.round((v / (expenseTotal || 1)) * 100)}% — ${formatCurrency(Number(v))}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: '0 0 40%', display: 'flex', justifyContent: 'flex-start' }}>
                    {renderSortedLegend(expenseByCategoryTop, expenseTotal)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Evolución de Activos */}
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5" />
              Evolución de Activos (por activo)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={selectAll}>Seleccionar todo</Button>
              <Button size="sm" variant="outline" onClick={deselectAll}>Deseleccionar todo</Button>
              <div className="ml-2 flex items-center gap-3 flex-wrap">
                {(assetsInfo || []).map(info => (
                  <label key={info.key} className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!selectedKeys[info.key]} onChange={() => toggleKey(info.key)} />
                    <span style={{ width: 10, height: 10, background: info.color, display: 'inline-block', borderRadius: 2 }} />
                    <span className="max-w-xs truncate">{info.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="h-[420px] overflow-visible -ml-8">
              <ResponsiveContainer width="100%" height="100%" style={{ overflow: 'visible' }}>
                <RechartsLineChart data={chartMonths} margin={{ top: 20, right: 40, left: 8, bottom: 20 }}>
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
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={selectAllLiabilities}>Seleccionar todo</Button>
              <Button size="sm" variant="outline" onClick={deselectAllLiabilities}>Deseleccionar todo</Button>
              <div className="ml-2 flex items-center gap-3 flex-wrap">
                {(liabilitiesInfo || []).map(info => (
                  <label key={info.key} className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!selectedLiabilityKeys[info.key]} onChange={() => toggleLiabilityKey(info.key)} />
                    <span style={{ width: 10, height: 10, background: info.color, display: 'inline-block', borderRadius: 2 }} />
                    <span className="max-w-xs truncate">{info.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="h-[420px] overflow-visible -ml-8">
              <ResponsiveContainer width="100%" height="100%" style={{ overflow: 'visible' }}>
                <RechartsLineChart data={liabChartMonths} margin={{ top: 20, right: 40, left: 8, bottom: 20 }}>
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