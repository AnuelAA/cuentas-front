// typescript
// `src/pages/Transactions.tsx`
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTransactions,
  createTransaction,
  createTransactionsBatch,
  updateTransaction,
  deleteTransaction,
  getCategories,
  getAssets,
  getLiabilities,
  createCategory,
} from '@/services/api';
import type { Transaction, Category, CreateTransactionRequest, Asset, Liability } from '@/types/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowDownCircle, ArrowUpCircle, Plus, Trash2, Save, Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

type Row = {
  localId: string; // for React key
  isNew: boolean;
  isEdited?: boolean;
  // if existing
  transactionId?: number;
  // editable fields
  categoryId?: number;
  categoryName?: string;
  type?: 'income' | 'expense';
  assetId?: number;
  assetName?: string;
  relatedAssetId?: number;
  relatedAssetName?: string;
  liabilityId?: number;
  liabilityName?: string;
  transactionDate: string;
  description: string;
  amount: number;
};

const Transactions: React.FC = () => {
  const { user } = useAuth();

  const defaultStartDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const defaultEndDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const defaultNewDate = defaultStartDate; // primer día del mes por defecto en filas nuevas
  // cache local para evitar crear la misma categoría varias veces
  const categoryCache = React.useRef<Record<string, number>>({});

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const findByNameId = (
    list: Array<{ name?: string; [key: string]: any }>,
    name: string | undefined,
    idKey: string
  ): number | undefined => {
    if (!name) return undefined;
    const needle = name.trim().toLowerCase();
    const found = list.find(item => (item.name ?? '').trim().toLowerCase() === needle);
    return found ? (found[idKey] as unknown as number) : undefined;
  };

  const buildPayloadFromRow = async (r: Row): Promise<CreateTransactionRequest> => {
    let resolvedCategoryId = r.categoryId;
    if (!resolvedCategoryId && r.categoryName) {
      const key = r.categoryName.trim().toLowerCase();
      if (categoryCache.current[key]) {
        resolvedCategoryId = categoryCache.current[key];
      } else {
        const existing = findByNameId(categories as any, r.categoryName, 'categoryId') as number | undefined;
        if (existing) {
          resolvedCategoryId = existing;
          categoryCache.current[key] = existing;
        } else {
          if (!user?.userId) throw new Error('User missing');
          const newCat = await createCategory(user.userId, { name: r.categoryName.trim(), type: r.type ?? 'expense' });
          resolvedCategoryId = newCat.categoryId;
          categoryCache.current[key] = newCat.categoryId;
          setCategories(prev => [...prev, newCat]);
        }
      }
    }

    const resolvedAssetId = r.assetId ?? findByNameId(assets as any, r.assetName, 'assetId') ?? null;
    const resolvedRelatedAssetId = r.relatedAssetId ?? findByNameId(assets as any, r.relatedAssetName, 'assetId') ?? null;
    const resolvedLiabilityId = r.liabilityId ?? findByNameId(liabilities as any, r.liabilityName, 'liabilityId') ?? null;

    return {
      userId: user?.userId,
      categoryId: resolvedCategoryId ?? null,
      assetId: resolvedAssetId as number | null,
      relatedAssetId: resolvedRelatedAssetId as number | null,
      liabilityId: resolvedLiabilityId as number | null,
      type: r.type ?? null,
      amount: Math.abs(r.amount),
      transactionDate: r.transactionDate,
      description: r.description ?? null,
    };
  };

  const fetchTransactions = async () => {
    if (!user?.userId) return;
    setLoading(true);
    try {
      const data = await getTransactions(user.userId, startDate || undefined, endDate || undefined);
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Error al cargar las transacciones');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    if (!user?.userId) return;
    try {
      const [cats, as, ls] = await Promise.all([
        getCategories(user.userId),
        getAssets(user.userId),
        getLiabilities(user.userId),
      ]);
      setCategories(cats);
      setAssets(as);
      setLiabilities(ls);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchMetadata();
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [startDate, endDate]);

  useEffect(() => {
    const mapped: Row[] = transactions.map(t => ({
      localId: `existing-${t.transactionId}`,
      isNew: false,
      transactionId: t.transactionId,
      categoryId: t.categoryId ?? undefined,
      type: t.type ?? undefined,
      assetId: t.assetId ?? undefined,
      relatedAssetId: t.relatedAssetId ?? undefined,
      liabilityId: t.liabilityId ?? undefined,
      transactionDate: t.transactionDate,
      description: t.description ?? '',
      amount: Math.abs(t.amount),
    }));
    setRows(mapped);
  }, [transactions]);

  const addEmptyRow = (type?: 'income' | 'expense') => {
    setRows(prev => [
      ...prev,
      {
        localId: `new-${Date.now()}-${Math.random()}`,
        isNew: true,
        type: type,
        transactionDate: defaultNewDate,
        description: '',
        amount: 0,
      } as Row,
    ]);
  };

  const updateRow = (localId: string, patch: Partial<Row>) => {
    setRows(prev => prev.map(r => (r.localId === localId ? { ...r, ...patch, isEdited: !r.isNew ? true : r.isEdited } : r)));
  };

  const removeRow = (localId: string) => {
    const row = rows.find(r => r.localId === localId);
    if (!row) return;
    if (!row.isNew && row.transactionId && !confirm('¿Estás seguro de eliminar la transacción existente?')) return;
    if (!row.isNew && row.transactionId && user?.userId) {
      deleteTransaction(user.userId, row.transactionId)
        .then(() => {
          toast.success('Transacción eliminada');
          fetchTransactions();
        })
        .catch((err) => {
          console.error(err);
          toast.error('Error eliminando transacción');
        });
    } else {
      setRows(prev => prev.filter(r => r.localId !== localId));
    }
  };

  const handleSaveAll = async () => {
      if (!user?.userId) return;

      const invalid = rows.filter(r => r.amount == null || r.amount <= 0);
      if (invalid.length > 0) {
        toast.error('Todas las filas deben tener cantidad mayor que 0');
        return;
      }

      const toCreate: CreateTransactionRequest[] = [];
      const toUpdate: { transactionId: number; payload: CreateTransactionRequest }[] = [];

      for (const r of rows) {
        const payload = await buildPayloadFromRow(r);
        if (r.isNew) {
          toCreate.push(payload);
        } else if (r.isEdited && r.transactionId) {
          toUpdate.push({ transactionId: r.transactionId, payload });
        }
      }

      const results = {
        created: 0,
        createdFailures: [] as { transaction: CreateTransactionRequest; error: any }[],
        updated: 0,
        updateFailures: [] as { transactionId: number; transaction: CreateTransactionRequest; error: any }[],
      };

      try {
        if (toCreate.length > 0) {
          const batchResult = await createTransactionsBatch(user.userId, toCreate);
          results.created = batchResult.successes.length;
          results.createdFailures = batchResult.failures;
        }

        for (const u of toUpdate) {
          const txId = Number(u.transactionId);
          if (Number.isNaN(txId)) {
            results.updateFailures.push({ transactionId: u.transactionId, transaction: u.payload, error: 'transactionId inválido' });
            continue;
          }
          try {
            await updateTransaction(user.userId, txId, u.payload);
            results.updated += 1;
          } catch (err) {
            results.updateFailures.push({ transactionId: txId, transaction: u.payload, error: err });
          }
        }

        let msg = `${results.created} creadas correctamente. ${results.updated} actualizadas correctamente.`;
        if (results.createdFailures.length > 0 || results.updateFailures.length > 0) {
          msg += '\n\nErrores:\n';
          results.createdFailures.forEach(f => {
            msg += `Creación fallida: ${JSON.stringify(f.transaction)} -> ${JSON.stringify(f.error)}\n`;
          });
          results.updateFailures.forEach(f => {
            msg += `Update id ${f.transactionId} falló: ${JSON.stringify(f.transaction)} -> ${String(f.error)}\n`;
          });
          toast.error(msg);
        } else {
          toast.success(msg);
        }

        fetchTransactions();
      } catch (err) {
        console.error('Error guardando transacciones:', err);
        toast.error('Error guardando transacciones');
      }
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

  const incomeRows = rows.filter(r => r.type === 'income');
  const expenseRows = rows.filter(r => r.type === 'expense');

  const totalIncome = incomeRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalExpenses = expenseRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const netBalance = totalIncome - totalExpenses;

  const rowClass = (r: Row, idx: number) => {
    const baseClass = 'transition-all duration-200 hover:bg-slate-50/50';
    const stripe = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30';
    const typeClass =
      r.type === 'income'
        ? 'border-l-4 border-green-500 hover:border-green-600 hover:shadow-sm'
        : r.type === 'expense'
        ? 'border-l-4 border-red-500 hover:border-red-600 hover:shadow-sm'
        : '';
    const editedClass = r.isEdited && !r.isNew ? 'ring-2 ring-primary/20 bg-primary/5' : '';
    const newClass = r.isNew ? 'ring-2 ring-success/30 bg-success/10' : '';
    return `${baseClass} ${stripe} ${typeClass} ${editedClass} ${newClass}`;
  };

  return (
    <Layout>
      <div className="space-y-6 px-2 sm:px-0">
        {/* Header mejorado */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Transacciones
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Gestiona tus ingresos y gastos</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2 border">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 sm:w-auto" 
                  />
                </div>
                <div className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2 border">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 sm:w-auto" 
                  />
                </div>
              </div>
              <Button 
                onClick={handleSaveAll} 
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
                size="lg"
              >
                <Save className="mr-2 h-4 w-4" /> Guardar todos
              </Button>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700/80 mb-1">Total Ingresos</p>
                    <p className="text-2xl font-bold text-green-700">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalIncome)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700/80 mb-1">Total Gastos</p>
                    <p className="text-2xl font-bold text-red-700">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalExpenses)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={`border-2 ${netBalance >= 0 ? 'border-green-200 bg-gradient-to-br from-green-50 to-green-50/50' : 'border-red-200 bg-gradient-to-br from-red-50 to-red-50/50'}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Balance Neto</p>
                    <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(netBalance)}
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${netBalance >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    <DollarSign className={`h-6 w-6 ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-green-100 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-50/50 border-b border-green-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-green-900">Ingresos</CardTitle>
                  <p className="text-sm text-green-700/70 mt-0.5">{incomeRows.length} {incomeRows.length === 1 ? 'transacción' : 'transacciones'}</p>
                </div>
              </div>
              <Button 
                onClick={() => addEmptyRow('income')} 
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-md"
              >
                <Plus className="mr-2 h-4 w-4" /> Añadir ingreso
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-2">
                    <TableHead className="min-w-[120px] font-semibold">Fecha</TableHead>
                    <TableHead className="min-w-[150px] font-semibold">Tipo</TableHead>
                    <TableHead className="min-w-[150px] font-semibold">Activo</TableHead>
                    <TableHead className="min-w-[150px] font-semibold">Pasivo</TableHead>
                    <TableHead className="min-w-[150px] font-semibold">Activo relacionado</TableHead>
                    <TableHead className="min-w-[150px] font-semibold">Categoría</TableHead>
                    <TableHead className="text-right min-w-[140px] font-semibold">Cantidad</TableHead>
                    <TableHead className="text-center min-w-[100px] font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeRows.map((r, idx) => (
                    <TableRow key={r.localId} className={rowClass(r, idx)}>
                      <TableCell className="relative">
                        <div
                          className={`absolute left-0 top-0 bottom-0 w-1 rounded-r ${
                            r.type === 'income' ? 'bg-green-400' : r.type === 'expense' ? 'bg-red-400' : 'bg-transparent'
                          }`}
                        />
                        <div className="pl-3">
                          <Input
                            type="date"
                            value={r.transactionDate}
                            onChange={(e) => updateRow(r.localId, { transactionDate: e.target.value })}
                          />
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ArrowUpCircle className={`h-5 w-5 ${r.type === 'income' ? 'text-green-600' : 'text-slate-400'}`} />
                          <Select value={r.type ?? ''} onValueChange={(val: any) => updateRow(r.localId, { type: val as 'income' | 'expense' })}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="income" className="text-green-700">Ingreso</SelectItem>
                              <SelectItem value="expense" className="text-red-700">Gasto</SelectItem>
                            </SelectContent>
                          </Select>
                          {r.isNew && (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                              Nuevo
                            </Badge>
                          )}
                          {r.isEdited && !r.isNew && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                              Editado
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <input
                          list="assets-list"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-w-[120px]"
                          value={r.assetName ?? assets.find(a => a.assetId === r.assetId)?.name ?? ''}
                          onChange={(e) => updateRow(r.localId, { assetName: e.target.value, assetId: undefined })}
                          placeholder="Activo"
                        />
                      </TableCell>

                      <TableCell>
                        <input
                          list="liabilities-list"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-w-[120px]"
                          value={r.liabilityName ?? liabilities.find(l => l.liabilityId === r.liabilityId)?.name ?? ''}
                          onChange={(e) => updateRow(r.localId, { liabilityName: e.target.value, liabilityId: undefined })}
                          placeholder="Pasivo"
                        />
                      </TableCell>

                      <TableCell>
                        <input
                          list="assets-list"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-w-[120px]"
                          value={r.relatedAssetName ?? assets.find(a => a.assetId === r.relatedAssetId)?.name ?? ''}
                          onChange={(e) => updateRow(r.localId, { relatedAssetName: e.target.value, relatedAssetId: undefined })}
                          placeholder="Activo rel."
                        />
                      </TableCell>

                      <TableCell>
                        <input
                          list="categories-list"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-w-[120px]"
                          value={r.categoryName ?? categories.find(c => c.categoryId === r.categoryId)?.name ?? ''}
                          onChange={(e) => updateRow(r.localId, { categoryName: e.target.value, categoryId: undefined })}
                          placeholder="Categoría"
                        />
                      </TableCell>

                        <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              value={r.amount}
                              onChange={(e) => updateRow(r.localId, { amount: parseFloat(e.target.value || '0') })}
                              className={`text-right font-semibold text-lg ${r.type === 'income' ? 'text-green-700 bg-green-50/70 border-green-200 focus:border-green-400' : 'text-red-700 bg-red-50/70 border-red-200 focus:border-red-400'}`}
                              style={{ width: 140 }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${r.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>€</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeRow(r.localId)}
                          className="hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-100 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-red-50 to-red-50/50 border-b border-red-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-red-900">Gastos</CardTitle>
                  <p className="text-sm text-red-700/70 mt-0.5">{expenseRows.length} {expenseRows.length === 1 ? 'transacción' : 'transacciones'}</p>
                </div>
              </div>
              <Button 
                onClick={() => addEmptyRow('expense')} 
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white shadow-md"
              >
                <Plus className="mr-2 h-4 w-4" /> Añadir gasto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-2">
                    <TableHead className="min-w-[120px] font-semibold">Fecha</TableHead>
                    <TableHead className="min-w-[150px] font-semibold">Tipo</TableHead>
                    <TableHead className="min-w-[150px] font-semibold">Activo</TableHead>
                    <TableHead className="min-w-[150px] font-semibold">Pasivo</TableHead>
                    <TableHead className="min-w-[150px] font-semibold">Activo relacionado</TableHead>
                    <TableHead className="min-w-[150px] font-semibold">Categoría</TableHead>
                    <TableHead className="text-right min-w-[140px] font-semibold">Cantidad</TableHead>
                    <TableHead className="text-center min-w-[100px] font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseRows.map((r, idx) => (
                    <TableRow key={r.localId} className={rowClass(r, idx)}>
                      <TableCell className="relative">
                        <div
                          className={`absolute left-0 top-0 bottom-0 w-1 rounded-r ${
                            r.type === 'income' ? 'bg-green-400' : r.type === 'expense' ? 'bg-red-400' : 'bg-transparent'
                          }`}
                        />
                        <div className="pl-3">
                          <Input
                            type="date"
                            value={r.transactionDate}
                            onChange={(e) => updateRow(r.localId, { transactionDate: e.target.value })}
                          />
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ArrowDownCircle className={`h-5 w-5 ${r.type === 'expense' ? 'text-red-600' : 'text-slate-400'}`} />
                          <Select value={r.type ?? ''} onValueChange={(val: any) => updateRow(r.localId, { type: val as 'income' | 'expense' })}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="income" className="text-green-700">Ingreso</SelectItem>
                              <SelectItem value="expense" className="text-red-700">Gasto</SelectItem>
                            </SelectContent>
                          </Select>
                          {r.isNew && (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                              Nuevo
                            </Badge>
                          )}
                          {r.isEdited && !r.isNew && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                              Editado
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <input
                          list="assets-list"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-w-[120px]"
                          value={r.assetName ?? assets.find(a => a.assetId === r.assetId)?.name ?? ''}
                          onChange={(e) => updateRow(r.localId, { assetName: e.target.value, assetId: undefined })}
                          placeholder="Activo"
                        />
                      </TableCell>

                      <TableCell>
                        <input
                          list="liabilities-list"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-w-[120px]"
                          value={r.liabilityName ?? liabilities.find(l => l.liabilityId === r.liabilityId)?.name ?? ''}
                          onChange={(e) => updateRow(r.localId, { liabilityName: e.target.value, liabilityId: undefined })}
                          placeholder="Pasivo"
                        />
                      </TableCell>

                      <TableCell>
                        <input
                          list="assets-list"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-w-[120px]"
                          value={r.relatedAssetName ?? assets.find(a => a.assetId === r.relatedAssetId)?.name ?? ''}
                          onChange={(e) => updateRow(r.localId, { relatedAssetName: e.target.value, relatedAssetId: undefined })}
                          placeholder="Activo rel."
                        />
                      </TableCell>

                      <TableCell>
                        <input
                          list="categories-list"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-w-[120px]"
                          value={r.categoryName ?? categories.find(c => c.categoryId === r.categoryId)?.name ?? ''}
                          onChange={(e) => updateRow(r.localId, { categoryName: e.target.value, categoryId: undefined })}
                          placeholder="Categoría"
                        />
                      </TableCell>

                      <TableCell className="text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={r.amount}
                              onChange={(e) => updateRow(r.localId, { amount: parseFloat(e.target.value || '0') })}
                              className={`text-right font-medium ${r.type === 'expense' ? 'text-red-700 bg-red-50/50' : ''}`}
                              style={{ width: 120 }}
                            />
                            <span className="text-sm text-slate-600">€</span>
                          </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeRow(r.localId)}
                          className="hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <datalist id="categories-list">
          {categories.map(c => <option key={c.categoryId} value={c.name} />)}
        </datalist>
        <datalist id="assets-list">
          {assets.map(a => <option key={a.assetId} value={a.name} />)}
        </datalist>
        <datalist id="liabilities-list">
          {liabilities.map(l => <option key={l.liabilityId} value={l.name} />)}
        </datalist>
      </div>
    </Layout>
  );
};

export default Transactions;