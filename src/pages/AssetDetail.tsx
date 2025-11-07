import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { getAssetDetail } from '@/services/api';
import type { AssetDetail } from '@/types/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Receipt, BarChart3, Target } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const AssetDetailPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { assetId } = useParams<{ assetId: string }>();
  const [detail, setDetail] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssetDetail();
  }, [user, assetId]);

  const fetchAssetDetail = async () => {
    if (!user?.userId || !assetId) return;
    setLoading(true);
    try {
      const data = await getAssetDetail(user.userId, parseInt(assetId));
      setDetail(data);
    } catch (error) {
      console.error('Error fetching asset detail:', error);
      toast.error('Error al cargar los detalles del activo');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
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

  if (!detail) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No se encontró el activo</p>
          <Button onClick={() => navigate('/assets')} className="mt-4">
            Volver a Activos
          </Button>
        </div>
      </Layout>
    );
  }

  // Prepare data for the chart
  const chartData = detail.valueHistory
    .slice()
    .reverse()
    .map(item => ({
      fecha: format(parseISO(item.valuationDate), 'MMM yyyy'),
      valor: item.currentValue,
    }));

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/assets')}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {detail.asset.name}
            </h2>
            {detail.asset.description && (
              <p className="text-sm text-muted-foreground mt-1">{detail.asset.description}</p>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary mb-1">Valor Actual</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(detail.currentValue)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-success/30 bg-gradient-to-br from-success/5 to-success/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-success mb-1">Ingresos</p>
                  <p className="text-2xl font-bold text-success">{formatCurrency(detail.totalIncome)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-destructive mb-1">Gastos</p>
                  <p className="text-2xl font-bold text-destructive">{formatCurrency(detail.totalExpenses)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 ${detail.roiPercentage >= 0 ? 'border-success/30 bg-gradient-to-br from-success/5 to-success/10' : 'border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">ROI</p>
                  <p className={`text-2xl font-bold ${detail.roiPercentage >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {detail.roiPercentage.toFixed(2)}%
                  </p>
                </div>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${detail.roiPercentage >= 0 ? 'bg-success/20' : 'bg-destructive/20'}`}>
                  <Target className={`h-5 w-5 ${detail.roiPercentage >= 0 ? 'text-success' : 'text-destructive'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Value Evolution Chart */}
        {detail.valueHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Evolución del Valor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="fecha" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="valor" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                      name="Valor del Activo"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Transacciones Asociadas</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.recentTransactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay transacciones asociadas a este activo</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.recentTransactions.map((transaction) => (
                    <TableRow key={transaction.transactionId}>
                      <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                          {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${transaction.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AssetDetailPage;

