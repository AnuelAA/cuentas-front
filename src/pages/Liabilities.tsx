import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getLiabilities, getLiabilityProgress, getTransactions, getCategories } from '@/services/api';
import type { Liability, LiabilityProgress, Transaction, Category } from '@/types/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Liabilities: React.FC = () => {
  const { user } = useAuth();
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLiability, setSelectedLiability] = useState<LiabilityProgress | null>(null);
  const [selectedLiabilityData, setSelectedLiabilityData] = useState<Liability | null>(null);
  const [liabilityTransactions, setLiabilityTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchLiabilities = async () => {
    if (!user?.userId) return;
    
    setLoading(true);
    try {
      const data = await getLiabilities(user.userId);
      setLiabilities(data);
    } catch (error) {
      console.error('Error fetching liabilities:', error);
      toast.error('Error al cargar los pasivos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!user?.userId) return;
    try {
      const data = await getCategories(user.userId);
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleViewDetails = async (liability: Liability) => {
    if (!user?.userId) return;
    
    try {
      const [progress, transactions] = await Promise.all([
        getLiabilityProgress(user.userId, liability.liabilityId),
        getTransactions(user.userId).then(txs => txs.filter(t => t.liabilityId === liability.liabilityId))
      ]);
      setSelectedLiability(progress);
      setSelectedLiabilityData(liability);
      setLiabilityTransactions(transactions);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error fetching liability progress:', error);
      toast.error('Error al cargar el progreso del pasivo');
    }
  };

  useEffect(() => {
    fetchLiabilities();
    fetchCategories();
  }, [user]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const calculateProgress = (liability: Liability) => {
    if (!liability.principalAmount) return 0;
    const paid = liability.principalAmount - liability.outstandingBalance;
    return (paid / liability.principalAmount) * 100;
  };

  const getCategoryInfo = (categoryId?: number) => {
    return categories.find(c => c.categoryId === categoryId);
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
          <h2 className="text-3xl font-bold tracking-tight">Pasivos</h2>
          <Button onClick={fetchLiabilities}>Actualizar</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Pasivos</CardTitle>
          </CardHeader>
          <CardContent>
            {liabilities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay pasivos registrados
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Monto Principal</TableHead>
                      <TableHead className="text-right">Saldo Pendiente</TableHead>
                      <TableHead>Progreso</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liabilities.map((liability) => {
                      const progress = calculateProgress(liability);
                      return (
                        <TableRow key={liability.liabilityId}>
                          <TableCell className="font-medium">{liability.name}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(liability.principalAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(liability.outstandingBalance)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={progress} className="flex-1" />
                              <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
                                {progress.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(liability)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detalles del Pasivo</DialogTitle>
            </DialogHeader>
            {selectedLiability && selectedLiabilityData && (
              <Tabs defaultValue="progress" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="progress">Progreso</TabsTrigger>
                  <TabsTrigger value="transactions">Transacciones</TabsTrigger>
                </TabsList>
                <TabsContent value="progress" className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="text-lg font-semibold">{selectedLiabilityData.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Principal Pagado</p>
                      <p className="text-lg font-semibold text-success">
                        {formatCurrency(selectedLiability.principalPaid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Intereses Pagados</p>
                      <p className="text-lg font-semibold text-warning">
                        {formatCurrency(selectedLiability.interestPaid)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo Pendiente</p>
                      <p className="text-lg font-semibold text-destructive">
                        {formatCurrency(selectedLiability.remainingBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">% Progreso</p>
                      <p className="text-lg font-semibold text-primary">
                        {(selectedLiability.progressPercentage ?? 0).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <Progress value={selectedLiability.progressPercentage ?? 0} className="h-3" />
                  </div>
                </TabsContent>
                <TabsContent value="transactions">
                  {liabilityTransactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No hay transacciones asociadas a este pasivo
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {liabilityTransactions.map((transaction) => {
                            const category = getCategoryInfo(transaction.categoryId);
                            const isIncome = category?.type === 'income' || transaction.amount >= 0;
                            return (
                              <TableRow key={transaction.transactionId}>
                                <TableCell>{format(new Date(transaction.transactionDate), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{transaction.description}</TableCell>
                                <TableCell>{category?.name || '-'}</TableCell>
                                <TableCell className={`text-right font-semibold ${
                                  isIncome ? 'text-success' : 'text-destructive'
                                }`}>
                                  {formatCurrency(Math.abs(transaction.amount))}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Liabilities;
