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
import { format, parseISO, isValid } from 'date-fns';
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

  // Helper: obtener último snapshot de liabilityValues por valuationDate
  const getLatestLiabilitySnapshot = (liability: Liability) => {
    if (!Array.isArray(liability.liabilityValues) || liability.liabilityValues.length === 0) {
      return {
        outstandingBalance: Number(liability.outstandingBalance ?? 0),
        valuationDate: null as Date | null,
        endDate: null as Date | null
      };
    }
    const sorted = [...liability.liabilityValues]
      .map(v => ({ ...v, _date: parseISO(v.valuationDate) }))
      .filter(v => isValid(v._date))
      .sort((a, b) => b._date.getTime() - a._date.getTime());
    if (sorted.length === 0) {
      return {
        outstandingBalance: Number(liability.outstandingBalance ?? 0),
        valuationDate: null,
        endDate: null
      };
    }
    const latest = sorted[0];
    return {
      outstandingBalance: Number(latest.outstandingBalance ?? liability.outstandingBalance ?? 0),
      valuationDate: latest._date,
      endDate: latest.endDate ? (isValid(parseISO(latest.endDate)) ? parseISO(latest.endDate) : null) : null
    };
  };

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
      const startDate = '2000-01-01';
      const endDate = '2099-12-31';

      const [progress, allTransactions] = await Promise.all([
        getLiabilityProgress(user.userId, liability.liabilityId),
        getTransactions(user.userId, startDate, endDate)
      ]);

      // Filtrar transacciones asociadas a este pasivo
      const transactions = allTransactions.filter(t => t.liabilityId === liability.liabilityId);

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
    }).format(Number(value || 0));
  };

  // Calcular progreso usando outstandingBalance del último snapshot
  const calculateProgress = (liability: Liability) => {
    const principal = Number(liability.principalAmount ?? 0);
    if (!principal) return 0;
    const { outstandingBalance } = getLatestLiabilitySnapshot(liability);
    const paid = principal - outstandingBalance;
    return (paid / principal) * 100;
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
              <p className="text-center text-muted-foreground py-8">No hay pasivos registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Saldo actual</TableHead>
                      <TableHead className="text-right">Fin del snapshot</TableHead>
                      <TableHead className="text-center">Progreso</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liabilities.map(l => {
                      const snapshot = getLatestLiabilitySnapshot(l);
                      const progress = calculateProgress(l);
                      return (
                        <TableRow key={l.liabilityId}>
                          <TableCell className="font-medium">{l.name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(l.principalAmount ?? 0))}</TableCell>
                          <TableCell className="text-right">{formatCurrency(snapshot.outstandingBalance)}</TableCell>
                          <TableCell className="text-right">
                            {snapshot.valuationDate ? format(snapshot.valuationDate, 'dd/MM/yyyy') : snapshot.endDate ? format(snapshot.endDate, 'dd/MM/yyyy') : '—'}
                          </TableCell>
                          <TableCell className="text-center" style={{ minWidth: 180 }}>
                            <div className="flex items-center gap-3">
                              <div className="w-full">
                                <Progress value={Math.max(0, Math.min(100, progress))} />
                              </div>
                              <div className="w-16 text-right">{progress.toFixed(1)}%</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(l)}>
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
                    <div className="space-y-6">
                      {/* Ingresos */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-success">Ingresos</h3>
                        {liabilityTransactions.filter(t => {
                          const category = getCategoryInfo(t.categoryId);
                          return category?.type === 'income';
                        }).length === 0 ? (
                          <p className="text-center text-muted-foreground py-4 text-sm">
                            No hay ingresos registrados
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
                                {liabilityTransactions
                                  .filter(t => {
                                    const category = getCategoryInfo(t.categoryId);
                                    return category?.type === 'income';
                                  })
                                  .map((transaction) => {
                                    const category = getCategoryInfo(transaction.categoryId);
                                    return (
                                      <TableRow key={transaction.transactionId}>
                                        <TableCell>{format(new Date(transaction.transactionDate), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>{transaction.description}</TableCell>
                                        <TableCell>{category?.name || '-'}</TableCell>
                                        <TableCell className="text-right font-semibold text-success">
                                          {formatCurrency(Math.abs(transaction.amount))}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>

                      {/* Gastos */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-destructive">Gastos</h3>
                        {liabilityTransactions.filter(t => {
                          const category = getCategoryInfo(t.categoryId);
                          return category?.type === 'expense';
                        }).length === 0 ? (
                          <p className="text-center text-muted-foreground py-4 text-sm">
                            No hay gastos registrados
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
                                {liabilityTransactions
                                  .filter(t => {
                                    const category = getCategoryInfo(t.categoryId);
                                    return category?.type === 'expense';
                                  })
                                  .map((transaction) => {
                                    const category = getCategoryInfo(transaction.categoryId);
                                    return (
                                      <TableRow key={transaction.transactionId}>
                                        <TableCell>{format(new Date(transaction.transactionDate), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>{transaction.description}</TableCell>
                                        <TableCell>{category?.name || '-'}</TableCell>
                                        <TableCell className="text-right font-semibold text-destructive">
                                          {formatCurrency(Math.abs(transaction.amount))}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
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
