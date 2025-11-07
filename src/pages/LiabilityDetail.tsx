import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { getLiabilityDetail } from '@/services/api';
import type { LiabilityDetail } from '@/types/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, TrendingDown, DollarSign, Receipt, BarChart3, Target, Percent } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const LiabilityDetailPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { liabilityId } = useParams<{ liabilityId: string }>();
  const [detail, setDetail] = useState<LiabilityDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiabilityDetail();
  }, [user, liabilityId]);

  const fetchLiabilityDetail = async () => {
    if (!user?.userId || !liabilityId) return;
    setLoading(true);
    try {
      const data = await getLiabilityDetail(user.userId, parseInt(liabilityId));
      setDetail(data);
    } catch (error) {
      console.error('Error fetching liability detail:', error);
      toast.error('Error al cargar los detalles del pasivo');
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
          <p className="text-muted-foreground">No se encontró el pasivo</p>
          <Button onClick={() => navigate('/liabilities')} className="mt-4">
            Volver a Pasivos
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
      saldo: item.outstandingBalance,
    }));

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/liabilities')}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {detail.liability.name}
            </h2>
            {detail.liability.description && (
              <p className="text-sm text-muted-foreground mt-1">{detail.liability.description}</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <Card className="border-primary/30">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Progreso de Pago</p>
                  <p className="text-3xl font-bold text-primary mt-1">{detail.progressPercentage.toFixed(1)}%</p>
                </div>
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Target className="h-8 w-8 text-primary" />
                </div>
              </div>
              <Progress value={detail.progressPercentage} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Pagado: {formatCurrency(detail.principalPaid)}
                </span>
                <span className="text-muted-foreground">
                  Pendiente: {formatCurrency(detail.currentOutstandingBalance)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-warning mb-1">Saldo Pendiente</p>
                  <p className="text-2xl font-bold text-warning">{formatCurrency(detail.currentOutstandingBalance)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-success/30 bg-gradient-to-br from-success/5 to-success/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-success mb-1">Capital Pagado</p>
                  <p className="text-2xl font-bold text-success">{formatCurrency(detail.principalPaid)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary mb-1">Transacciones</p>
                  <p className="text-2xl font-bold text-primary">{detail.transactionCount}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Outstanding Balance Evolution Chart */}
        {detail.valueHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-warning" />
                Evolución del Saldo Pendiente
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
                      dataKey="saldo" 
                      stroke="hsl(var(--warning))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--warning))' }}
                      name="Saldo Pendiente"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Interests */}
        {detail.interests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                Intereses Aplicados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Tasa Anual</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.interests.map((interest) => (
                    <TableRow key={interest.interestId}>
                      <TableCell>
                        <Badge variant="outline">
                          {interest.type === 'fixed' ? 'Fijo' : interest.type === 'variable' ? 'Variable' : 'General'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{interest.annualRate}%</TableCell>
                      <TableCell>{formatDate(interest.startDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Transacciones (Pagos)</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.recentTransactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay transacciones asociadas a este pasivo</p>
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

export default LiabilityDetailPage;

