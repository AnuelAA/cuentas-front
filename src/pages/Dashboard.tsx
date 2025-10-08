import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboard, getDashboardSummary, getAssets } from '@/services/api';
import type { DashboardMetrics, DashboardSummary, Asset } from '@/types/api';
import { Layout } from '@/components/Layout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, Calendar, LineChart } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { toast } from 'sonner';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [yearSummary, setYearSummary] = useState<DashboardSummary | null>(null);
  const [monthSummary, setMonthSummary] = useState<DashboardSummary | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));

  const fetchDashboard = async () => {
    if (!user?.userId) return;
    
    setLoading(true);
    try {
      const [metricsData, yearData, monthData, assetsData] = await Promise.all([
        getDashboard(user.userId, startDate, endDate),
        getDashboardSummary(user.userId, 'year'),
        getDashboardSummary(user.userId, 'lastMonth'),
        getAssets(user.userId)
      ]);
      setMetrics(metricsData);
      setYearSummary(yearData);
      setMonthSummary(monthData);
      setAssets(assetsData);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user, startDate, endDate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const calculateROI = (asset: Asset) => {
    if (!asset.acquisitionValue) return 0;
    return ((asset.currentValue - asset.acquisitionValue) / asset.acquisitionValue) * 100;
  };

  const generateAssetChartData = () => {
    // Agrupar activos por tipo
    const assetsByType = assets.reduce((acc, asset) => {
      const typeKey = `Tipo ${asset.assetTypeId}`;
      if (!acc[typeKey]) {
        acc[typeKey] = [];
      }
      acc[typeKey].push(asset);
      return acc;
    }, {} as Record<string, Asset[]>);

    // Generar datos para los últimos 12 meses
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'MMM yyyy');
      
      const monthData: any = { month: monthKey };
      
      // Para cada tipo de activo, sumar el valor actual
      // (En una implementación real, necesitarías valores históricos)
      Object.entries(assetsByType).forEach(([type, typeAssets]) => {
        monthData[type] = typeAssets.reduce((sum, asset) => sum + asset.currentValue, 0);
      });
      
      months.push(monthData);
    }
    
    return { months, types: Object.keys(assetsByType) };
  };

  const chartData = generateAssetChartData();
  const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Financiero</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
              <span className="text-sm text-muted-foreground">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
            <Button onClick={fetchDashboard} size="sm">
              Actualizar
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Ingresos Totales"
            value={formatCurrency(metrics?.totalIncome || 0)}
            icon={TrendingUp}
            className="border-l-4 border-l-success"
          />
          <StatCard
            title="Gastos Totales"
            value={formatCurrency(metrics?.totalExpenses || 0)}
            icon={TrendingDown}
            className="border-l-4 border-l-destructive"
          />
          <StatCard
            title="Balance Neto"
            value={formatCurrency(metrics?.netBalance || 0)}
            icon={DollarSign}
            className="border-l-4 border-l-primary"
          />
        </div>

        <Tabs defaultValue="period" className="w-full">
          <TabsList>
            <TabsTrigger value="period">Resumen del Período</TabsTrigger>
            <TabsTrigger value="year">Resumen Anual</TabsTrigger>
            <TabsTrigger value="month">Último Mes</TabsTrigger>
            <TabsTrigger value="chart">Evolución de Activos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="period" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {metrics?.bestAsset && (
                <Card className="border-l-4 border-l-success">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-success" />
                      Mejor Activo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-lg font-semibold">{metrics.bestAsset.name}</p>
                      <p className="text-2xl font-bold text-success">
                        +{calculateROI(metrics.bestAsset).toFixed(2)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {metrics?.worstAsset && (
                <Card className="border-l-4 border-l-destructive">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-destructive" />
                      Peor Activo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-lg font-semibold">{metrics.worstAsset.name}</p>
                      <p className="text-2xl font-bold text-destructive">
                        {calculateROI(metrics.worstAsset).toFixed(2)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="year" className="space-y-4">
            {yearSummary && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Período</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(yearSummary.startDate), 'dd/MM/yyyy')} - {format(new Date(yearSummary.endDate), 'dd/MM/yyyy')}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-success">
                  <CardHeader>
                    <CardTitle className="text-sm">Ingresos Totales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-success">
                      {formatCurrency(yearSummary.totalIncome)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-destructive">
                  <CardHeader>
                    <CardTitle className="text-sm">Gastos Totales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-destructive">
                      {formatCurrency(yearSummary.totalExpenses)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-primary md:col-span-3">
                  <CardHeader>
                    <CardTitle>Beneficio Neto Anual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-bold ${yearSummary.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(yearSummary.netProfit)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="month" className="space-y-4">
            {monthSummary && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Período</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(monthSummary.startDate), 'dd/MM/yyyy')} - {format(new Date(monthSummary.endDate), 'dd/MM/yyyy')}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-success">
                  <CardHeader>
                    <CardTitle className="text-sm">Ingresos del Mes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-success">
                      {formatCurrency(monthSummary.totalIncome)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-destructive">
                  <CardHeader>
                    <CardTitle className="text-sm">Gastos del Mes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-destructive">
                      {formatCurrency(monthSummary.totalExpenses)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-primary md:col-span-3">
                  <CardHeader>
                    <CardTitle>Beneficio Neto Mensual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-bold ${monthSummary.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(monthSummary.netProfit)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="chart" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Evolución de Activos por Tipo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={chartData.months}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="month" 
                        className="text-sm"
                        tick={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <YAxis 
                        className="text-sm"
                        tick={{ fill: 'hsl(var(--foreground))' }}
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                        formatter={(value: any) => formatCurrency(value)}
                      />
                      <Legend />
                      {chartData.types.map((type, index) => (
                        <Line
                          key={type}
                          type="monotone"
                          dataKey={type}
                          stroke={colors[index % colors.length]}
                          strokeWidth={2}
                          dot={{ fill: colors[index % colors.length] }}
                        />
                      ))}
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Dashboard;
