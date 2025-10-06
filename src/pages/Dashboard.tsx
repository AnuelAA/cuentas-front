import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboard } from '@/services/api';
import type { DashboardMetrics, Asset } from '@/types/api';
import { Layout } from '@/components/Layout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));

  const fetchDashboard = async () => {
    if (!user?.userId) return;
    
    setLoading(true);
    try {
      const data = await getDashboard(user.userId, startDate, endDate);
      setMetrics(data);
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
      </div>
    </Layout>
  );
};

export default Dashboard;
