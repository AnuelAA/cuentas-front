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
import { ArrowDownCircle, ArrowUpCircle, Plus, Trash2, Save } from 'lucide-react';
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

  const rowClass = (r: Row, idx: number) => {
    const stripe = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
    const typeClass =
      r.type === 'income'
        ? 'border-l-4 border-green-400'
        : r.type === 'expense'
        ? 'border-l-4 border-red-400'
        : '';
    return `transition-colors ${stripe} ${typeClass}`;
  };

  return (
    <Layout>
      <div className="space-y-6 px-2 sm:px-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Transacciones</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Desde</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 sm:w-auto" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Hasta</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 sm:w-auto" />
              </div>
            </div>
            <Button variant="secondary" onClick={handleSaveAll} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" /> Guardar
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle>Ingresos</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button onClick={() => addEmptyRow('income')} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Añadir ingreso
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Fecha</TableHead>
                    <TableHead className="min-w-[120px]">Tipo</TableHead>
                    <TableHead className="min-w-[150px]">Activo</TableHead>
                    <TableHead className="min-w-[150px]">Pasivo</TableHead>
                    <TableHead className="min-w-[150px]">Activo relacionado</TableHead>
                    <TableHead className="min-w-[150px]">Categoría</TableHead>
                    <TableHead className="text-right min-w-[120px]">Cantidad <span className="ml-1">€</span></TableHead>
                    <TableHead className="text-center min-w-[80px]">Acciones</TableHead>
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
                          <ArrowUpCircle className={r.type === 'income' ? 'text-green-600' : 'text-slate-400'} />
                          <Select value={r.type ?? ''} onValueChange={(val: any) => updateRow(r.localId, { type: val as 'income' | 'expense' })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="income">Ingreso</SelectItem>
                              <SelectItem value="expense">Gasto</SelectItem>
                            </SelectContent>
                          </Select>
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
                            className={`text-right font-medium ${r.type === 'income' ? 'text-green-700 bg-green-50/50' : ''}`}
                            style={{ width: 120 }}
                          />
                          <span className="text-sm text-slate-600">€</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => removeRow(r.localId)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle>Gastos</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button onClick={() => addEmptyRow('expense')} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Añadir gasto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Fecha</TableHead>
                    <TableHead className="min-w-[120px]">Tipo</TableHead>
                    <TableHead className="min-w-[150px]">Activo</TableHead>
                    <TableHead className="min-w-[150px]">Pasivo</TableHead>
                    <TableHead className="min-w-[150px]">Activo relacionado</TableHead>
                    <TableHead className="min-w-[150px]">Categoría</TableHead>
                    <TableHead className="text-right min-w-[120px]">Cantidad <span className="ml-1">€</span></TableHead>
                    <TableHead className="text-center min-w-[80px]">Acciones</TableHead>
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
                          <ArrowDownCircle className={r.type === 'expense' ? 'text-red-600' : 'text-slate-400'} />
                          <Select value={r.type ?? ''} onValueChange={(val: any) => updateRow(r.localId, { type: val as 'income' | 'expense' })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="income">Ingreso</SelectItem>
                              <SelectItem value="expense">Gasto</SelectItem>
                            </SelectContent>
                          </Select>
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
                        <Button variant="ghost" size="sm" onClick={() => removeRow(r.localId)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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