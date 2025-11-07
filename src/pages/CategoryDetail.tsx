import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { getCategoryDetail } from '@/services/api';
import type { CategoryDetail } from '@/types/api';
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
import { ArrowLeft, TrendingUp, TrendingDown, FolderOpen, DollarSign, Receipt } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const CategoryDetailPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId: string }>();
  const [detail, setDetail] = useState<CategoryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategoryDetail();
  }, [user, categoryId]);

  const fetchCategoryDetail = async () => {
    if (!user?.userId || !categoryId) return;
    setLoading(true);
    try {
      const data = await getCategoryDetail(user.userId, parseInt(categoryId));
      setDetail(data);
    } catch (error) {
      console.error('Error fetching category detail:', error);
      toast.error('Error al cargar los detalles de la categoría');
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
          <p className="text-muted-foreground">No se encontró la categoría</p>
          <Button onClick={() => navigate('/categories')} className="mt-4">
            Volver a Categorías
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/categories')}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {detail.category.name}
            </h2>
            {detail.category.description && (
              <p className="text-sm text-muted-foreground mt-1">{detail.category.description}</p>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <Card className={`border-2 ${detail.netBalance >= 0 ? 'border-success/30 bg-gradient-to-br from-success/5 to-success/10' : 'border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Balance Neto</p>
                  <p className={`text-2xl font-bold ${detail.netBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(detail.netBalance)}
                  </p>
                </div>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${detail.netBalance >= 0 ? 'bg-success/20' : 'bg-destructive/20'}`}>
                  <DollarSign className={`h-5 w-5 ${detail.netBalance >= 0 ? 'text-success' : 'text-destructive'}`} />
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

        {/* Subcategories */}
        {detail.subcategories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                Subcategorías
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {detail.subcategories.map(sub => (
                  <button
                    key={sub.categoryId}
                    onClick={() => navigate(`/categories/${sub.categoryId}`)}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-primary" />
                      <span className="font-medium group-hover:text-primary transition-colors">
                        {sub.name}
                      </span>
                    </div>
                    {sub.description && (
                      <p className="text-sm text-muted-foreground mt-1">{sub.description}</p>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.recentTransactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay transacciones en esta categoría</p>
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

export default CategoryDetailPage;

