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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, Save, Plus, RefreshCw, CreditCard, AlertCircle, TrendingDown, DollarSign } from 'lucide-react';
import { format, parseISO, isValid, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { MonthNavigator } from '@/components/MonthNavigator';
import { startOfMonth, format as formatDate, parseISO as parseISODate } from 'date-fns';
import { createLiability, updateLiability, addLiabilitySnapshot } from '@/services/api';

const Liabilities: React.FC = () => {
  const { user } = useAuth();
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLiability, setSelectedLiability] = useState<LiabilityProgress | null>(null);
  const [selectedLiabilityData, setSelectedLiabilityData] = useState<Liability | null>(null);
  const [liabilityTransactions, setLiabilityTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
    const [liabilityModalOpen, setLiabilityModalOpen] = useState(false);
    const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
    const [liabilityForm, setLiabilityForm] = useState<{ name: string; principalAmount: number; outstandingBalance: number }>({
      name: '',
      principalAmount: 0,
      outstandingBalance: 0,
    });
  // Helper: obtener snapshot de liabilityValues para el mes seleccionado
  const getLiabilitySnapshotForMonth = (liability: Liability, month: Date) => {
    if (!Array.isArray(liability.liabilityValues) || liability.liabilityValues.length === 0) {
      return {
        outstandingBalance: Number(liability.outstandingBalance ?? 0),
        valuationDate: null as Date | null,
        endDate: null as Date | null
      };
    }
    const targetEnd = endOfMonth(month).getTime();
    const candidates = liability.liabilityValues
      .map(v => ({ ...v, _date: parseISO(v.valuationDate) }))
      .filter(v => isValid(v._date) && v._date.getTime() <= targetEnd)
      .sort((a, b) => b._date.getTime() - a._date.getTime());
    if (candidates.length === 0) {
      return {
        outstandingBalance: Number(liability.outstandingBalance ?? 0),
        valuationDate: null,
        endDate: null
      };
    }
    // Preferir uno dentro del mismo mes/año, si existe
    const sameMonth = candidates.find(c => 
      c._date.getMonth() === month.getMonth() && 
      c._date.getFullYear() === month.getFullYear()
    );
    const chosen = sameMonth ?? candidates[0];
    return {
      outstandingBalance: Number(chosen.outstandingBalance ?? liability.outstandingBalance ?? 0),
      valuationDate: chosen._date,
      endDate: chosen.endDate ? (isValid(parseISO(chosen.endDate)) ? parseISO(chosen.endDate) : null) : null
    };
  };

  const fetchLiabilities = async () => {
    if (!user?.userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getLiabilities(user.userId);
      setLiabilities(data || []);
    } catch (error) {
      console.error('Error fetching liabilities:', error);
      toast.error('Error al cargar los pasivos');
      setLiabilities([]);
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

  useEffect(() => {
    if (user?.userId) {
      fetchLiabilities();
      fetchCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleViewDetails = async (liability: Liability) => {
    if (!user?.userId) return;

    try {
      const startDate = '2000-01-01';
      const endDate = '2099-12-31';

      const [progress, transactions] = await Promise.all([
        getLiabilityProgress(user.userId, liability.liabilityId),
        // pedir al backend las transacciones ya filtradas por liabilityId
        getTransactions(user.userId, startDate, endDate, undefined, liability.liabilityId)
      ]);

      // ya no hace falta filtrar aquí
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
      if (!liabilities || liabilities.length === 0) return;
      let latest: Date | null = null;
      liabilities.forEach(l => {
        if (Array.isArray(l.liabilityValues)) {
          l.liabilityValues.forEach(v => {
            try {
              const d = parseISODate(v.valuationDate);
              if (!isNaN(d.getTime())) {
                if (!latest || d.getTime() > latest.getTime()) latest = d;
              }
            } catch {}
          });
        }
      });
      if (latest) {
        const defaultMonth = startOfMonth(new Date());
        const inSelectedMonth = liabilities.some(l =>
          (l.liabilityValues || []).some(v => startOfMonth(parseISODate(v.valuationDate)).getTime() === startOfMonth(defaultMonth).getTime())
        );
        if (!inSelectedMonth) {
          setSelectedMonth(startOfMonth(latest));
        }
      }
    }, [liabilities]);
    const openLiabilityModal = (liability: Liability | null) => {
      setEditingLiability(liability);
      setLiabilityForm({
        name: liability?.name ?? '',
        principalAmount: Number(liability?.principalAmount ?? 0),
        outstandingBalance: Number(liability?.outstandingBalance ?? 0),
      });
      setLiabilityModalOpen(true);
    };

    const saveLiabilityForMonth = async () => {
      if (!user?.userId) return;
      try {
        let saved: Liability;
        if (editingLiability) {
          saved = await updateLiability(user.userId, editingLiability.liabilityId, { name: liabilityForm.name, principalAmount: liabilityForm.principalAmount });
        } else {
          saved = await createLiability(user.userId, { name: liabilityForm.name, principalAmount: liabilityForm.principalAmount, outstandingBalance: liabilityForm.outstandingBalance });
        }
        await addLiabilitySnapshot(user.userId, saved.liabilityId, {
          valuationDate: formatDate(selectedMonth, 'yyyy-MM-01'),
          outstandingBalance: liabilityForm.outstandingBalance,
        });
        toast.success('Pasivo guardado y snapshot añadido');
        setLiabilityModalOpen(false);
        fetchLiabilities();
      } catch (err) {
        console.error(err);
        toast.error('Error guardando pasivo');
      }
    };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(Number(value || 0));
  };

  // Calcular progreso usando outstandingBalance del snapshot del mes seleccionado
  const calculateProgress = (liability: Liability) => {
    const principal = Number(liability.principalAmount ?? 0);
    if (!principal) return 0;
    const { outstandingBalance } = getLiabilitySnapshotForMonth(liability, selectedMonth);
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

  const totalPrincipal = liabilities.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
  const totalOutstanding = liabilities.reduce((sum, l) => {
    const snapshot = getLiabilitySnapshotForMonth(l, selectedMonth);
    return sum + snapshot.outstandingBalance;
  }, 0);
  const totalPaid = totalPrincipal - totalOutstanding;
  const overallProgress = totalPrincipal > 0 ? (totalPaid / totalPrincipal) * 100 : 0;

  return (
    <Layout>
      <div className="space-y-6 px-2 sm:px-0">
        {/* Header mejorado */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Pasivos
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Monitorea el progreso de tus deudas y obligaciones</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 sm:flex-none">
                <MonthNavigator month={selectedMonth} onChange={setSelectedMonth} />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => fetchLiabilities()} 
                  variant="outline" 
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizar
                </Button>
                <Button 
                  onClick={() => openLiabilityModal(null)} 
                  className="flex-1 sm:flex-none bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-md"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo pasivo
                </Button>
              </div>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700/80 mb-1">Principal Total</p>
                    <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalPrincipal)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700/80 mb-1">Saldo Pendiente</p>
                    <p className="text-2xl font-bold text-red-700">{formatCurrency(totalOutstanding)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700/80 mb-1">Progreso General</p>
                    <p className="text-2xl font-bold text-green-700">{overallProgress.toFixed(1)}%</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-orange-100 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-50/50 to-red-50/50 border-b border-orange-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Listado de Pasivos</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{liabilities.length} {liabilities.length === 1 ? 'pasivo registrado' : 'pasivos registrados'}</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {liabilities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay pasivos registrados</p>
            ) : (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b-2">
                      <TableHead className="min-w-[150px] font-semibold">Nombre</TableHead>
                      <TableHead className="text-right min-w-[120px] font-semibold">Principal</TableHead>
                      <TableHead className="text-right min-w-[120px] font-semibold">Saldo actual</TableHead>
                      <TableHead className="text-right min-w-[140px] font-semibold">Fin del snapshot</TableHead>
                      <TableHead className="text-center min-w-[200px] font-semibold">Progreso</TableHead>
                      <TableHead className="text-center min-w-[100px] font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liabilities.map(l => {
                      const snapshot = getLiabilitySnapshotForMonth(l, selectedMonth);
                      const progress = calculateProgress(l);
                      return (
                        <TableRow key={l.liabilityId} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-semibold">{l.name}</TableCell>
                          <TableCell className="text-right font-medium text-orange-700">{formatCurrency(Number(l.principalAmount ?? 0))}</TableCell>
                          <TableCell className="text-right font-semibold text-red-700">{formatCurrency(snapshot.outstandingBalance)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {snapshot.valuationDate ? format(snapshot.valuationDate, 'dd/MM/yyyy') : snapshot.endDate ? format(snapshot.endDate, 'dd/MM/yyyy') : '—'}
                          </TableCell>
                          <TableCell className="text-center" style={{ minWidth: 180 }}>
                            <div className="flex items-center gap-3">
                              <div className="w-full">
                                <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                                  <div
                                    className={`h-full transition-all ${
                                      progress >= 75 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                                  />
                                </div>
                              </div>
                              <div className={`w-16 text-right font-semibold ${progress >= 75 ? 'text-green-700' : progress >= 50 ? 'text-yellow-700' : 'text-red-700'}`}>
                                {progress.toFixed(1)}%
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleViewDetails(l)}
                              className="hover:bg-orange-50 hover:text-orange-600 transition-colors"
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
        <Dialog open={liabilityModalOpen} onOpenChange={setLiabilityModalOpen}>
          <DialogContent className="max-w-lg w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle>{editingLiability ? 'Editar pasivo' : 'Nuevo pasivo'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <Label>Nombre</Label>
              <Input value={liabilityForm.name} onChange={(e) => setLiabilityForm(f => ({ ...f, name: e.target.value }))} />
              <Label>Principal</Label>
              <Input type="number" value={String(liabilityForm.principalAmount)} onChange={(e) => setLiabilityForm(f => ({ ...f, principalAmount: Number(e.target.value || 0) }))} />
              <Label>Saldo pendiente (para snapshot del mes)</Label>
              <Input type="number" value={String(liabilityForm.outstandingBalance)} onChange={(e) => setLiabilityForm(f => ({ ...f, outstandingBalance: Number(e.target.value || 0) }))} />
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setLiabilityModalOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
                <Button onClick={saveLiabilityForMonth} className="w-full sm:w-auto"><Save className="h-4 w-4 mr-2" /> Guardar y añadir snapshot ({formatDate(selectedMonth, 'MMMM yyyy')})</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        {liabilityTransactions.filter(t => String(t.type ?? '').toLowerCase() === 'income').length === 0 ? (
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
                                  .filter(t => String(t.type ?? '').toLowerCase() === 'income')
                                  .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
                                  .map((transaction) => {
                                    const category = getCategoryInfo(transaction.categoryId);
                                    return (
                                      <TableRow key={transaction.transactionId}>
                                        <TableCell>{format(parseISO(transaction.transactionDate), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>{transaction.description || '-'}</TableCell>
                                        <TableCell>{category?.name || '-'}</TableCell>
                                        <TableCell className="text-right font-semibold text-success">
                                          {formatCurrency(Math.abs(Number(transaction.amount ?? 0)))}
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
                        {liabilityTransactions.filter(t => String(t.type ?? '').toLowerCase() === 'expense').length === 0 ? (
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
                                  .filter(t => String(t.type ?? '').toLowerCase() === 'expense')
                                  .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
                                  .map((transaction) => {
                                    const category = getCategoryInfo(transaction.categoryId);
                                    return (
                                      <TableRow key={transaction.transactionId}>
                                        <TableCell>{format(parseISO(transaction.transactionDate), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>{transaction.description || '-'}</TableCell>
                                        <TableCell>{category?.name || '-'}</TableCell>
                                        <TableCell className="text-right font-semibold text-destructive">
                                          {formatCurrency(Math.abs(Number(transaction.amount ?? 0)))}
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
