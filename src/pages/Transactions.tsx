// typescript
// `src/pages/Transactions.tsx`
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
import { ArrowDownCircle, ArrowUpCircle, Plus, Trash2, Save, Calendar, TrendingUp, TrendingDown, DollarSign, Calculator, Edit2, Check, X, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, isValid as isValidDate } from 'date-fns';
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
  const navigate = useNavigate();

  const defaultStartDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const defaultEndDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  // cache local para evitar crear la misma categoría varias veces
  const categoryCache = React.useRef<Record<string, number>>({});

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Get last transaction date or default to first day of month
  const getDefaultNewDate = useMemo(() => {
    if (transactions.length > 0) {
      const sorted = [...transactions].sort((a, b) => 
        new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      );
      return sorted[0].transactionDate;
    }
    return defaultStartDate;
  }, [transactions, defaultStartDate]);
  
  const defaultNewDate = getDefaultNewDate;
  const [rows, setRows] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [quickAdjustValues, setQuickAdjustValues] = useState<Record<string, string[]>>({}); // Lista de valores de ajuste rápido por fila
  const [editingRowIds, setEditingRowIds] = useState<Record<string, boolean>>({});
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState<string>('');

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
    // Inicializar campos de ajuste vacíos para cada fila
    setQuickAdjustValues(prev => {
      const newValues: Record<string, string[]> = {};
      mapped.forEach(row => {
        if (!prev[row.localId]) {
          newValues[row.localId] = [''];
        }
      });
      return { ...prev, ...newValues };
    });
  }, [transactions]);

  const addEmptyRow = (type?: 'income' | 'expense') => {
    const newLocalId = `new-${Date.now()}-${Math.random()}`;
    const lastDate = transactions.length > 0 
      ? [...transactions].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0].transactionDate
      : defaultStartDate;
    setRows(prev => [
      ...prev,
      {
        localId: newLocalId,
        isNew: true,
        type: type || 'expense', // Default to expense
        transactionDate: lastDate,
        description: '',
        amount: 0,
      } as Row,
    ]);
    // Inicializar campo de ajuste vacío para la nueva fila
    setQuickAdjustValues(prev => ({
      ...prev,
      [newLocalId]: ['']
    }));
  };

  const updateRow = (localId: string, patch: Partial<Row>) => {
    setRows(prev => prev.map(r => (r.localId === localId ? { ...r, ...patch, isEdited: !r.isNew ? true : r.isEdited } : r)));
  };

  // Función para manejar el cambio en el campo de cantidad
  const handleAmountChange = (localId: string, value: string) => {
    const row = rows.find(r => r.localId === localId);
    
    // Si el valor es vacío o solo contiene el 0 inicial, establecer a vacío (se mostrará como placeholder)
    if (!value || value === '0') {
      updateRow(localId, { amount: 0 });
      return;
    }
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      updateRow(localId, { amount: numValue });
    }
  };

  // Función para obtener el valor a mostrar (vacío si es 0, para que se muestre placeholder)
  const getAmountDisplayValue = (row: Row): string => {
    if (row.amount === 0 || row.amount === null || row.amount === undefined) {
      return '';
    }
    return row.amount.toString();
  };

  // Función para combinar transacciones duplicadas (solo cuando se guarda)
  // Solo combina si coinciden: categoría, tipo, fecha EXACTA (yyyy-MM-dd) y activo
  const combineDuplicateTransactions = (rowsToProcess: Row[]): Row[] => {
    const processed: Row[] = [];
    const combinedKeys = new Set<string>();

    for (const row of rowsToProcess) {
      // Solo combinar filas nuevas o editadas que tengan todos los campos necesarios
      if (!row.categoryName && !row.categoryId) {
        processed.push(row);
        continue;
      }

      const transactionDate = row.transactionDate?.substring(0, 10); // yyyy-MM-dd
      const categoryName = (row.categoryName || categories.find(c => c.categoryId === row.categoryId)?.name || '').toLowerCase().trim();
      // Incluir activo en la clave si existe (null === null se considera igual para no tener activo)
      const assetId = row.assetId ?? null;
      const key = `${transactionDate}-${categoryName}-${row.type}-asset:${assetId}`;

      if (combinedKeys.has(key)) {
        // Ya combinamos una fila con esta clave, saltar esta
        continue;
      }

      // Buscar todas las filas que coinciden con esta clave (incluyendo activo)
      const matchingRows = rowsToProcess.filter(r => {
        if (r === row) return false;
        const rDate = r.transactionDate?.substring(0, 10);
        const rCategoryName = (r.categoryName || categories.find(c => c.categoryId === r.categoryId)?.name || '').toLowerCase().trim();
        const rAssetId = r.assetId ?? null;
        const rKey = `${rDate}-${rCategoryName}-${r.type}-asset:${rAssetId}`;
        return rKey === key;
      });

      if (matchingRows.length > 0) {
        // Combinar todas las filas que coinciden
        const totalAmount = [row, ...matchingRows].reduce((sum, r) => sum + (r.amount || 0), 0);
        // Usar la primera fila como base (si es existente, mantenerla; si no, usar la primera nueva)
        const baseRow = row.isNew ? matchingRows.find(r => !r.isNew) || row : row;
        processed.push({
          ...baseRow,
          amount: totalAmount,
          isEdited: !baseRow.isNew ? true : baseRow.isEdited,
        });
        combinedKeys.add(key);
      } else {
        processed.push(row);
      }
    }

    return processed;
  };

  // Función para añadir un valor de ajuste a la lista (no se aplica hasta guardar)
  const addQuickAdjustValue = (localId: string, index: number, value: string) => {
    setQuickAdjustValues(prev => {
      const current = prev[localId] || [];
      const updated = [...current];
      updated[index] = value;
      
      // Si el valor no está vacío y es el último campo, añadir uno nuevo
      if (value.trim() && index === current.length - 1) {
        updated.push('');
      }
      
      return { ...prev, [localId]: updated };
    });
  };

  // Función para eliminar un valor de ajuste
  const removeQuickAdjustValue = (localId: string, index: number) => {
    setQuickAdjustValues(prev => {
      const current = prev[localId] || [];
      const updated = current.filter((_, i) => i !== index);
      return { ...prev, [localId]: updated.length > 0 ? updated : [''] };
    });
  };

  // Aplicar todos los ajustes acumulados al guardar
  const applyPendingAdjustments = (rowsToProcess: Row[]): Row[] => {
    return rowsToProcess.map(row => {
      const adjustments = quickAdjustValues[row.localId] || [];
      if (adjustments.length === 0) return row;
      
      let totalAdjustment = 0;
      for (const adjustStr of adjustments) {
        if (!adjustStr.trim()) continue;
        
        // Normalizar: reemplazar coma por punto y eliminar espacios
        const normalized = adjustStr.trim().replace(',', '.');
        
        // Aceptar: +10, -5, 10, -5.50, +0.56, 0.56, 0,56, .56, 0.01, etc.
        // Regex mejorado para aceptar números que empiezan con punto o coma también
        const adjustMatch = normalized.match(/^([+\-]?)(\d*[.,]?\d+)$/);
        if (!adjustMatch) {
          console.warn(`Ajuste no válido: "${adjustStr}" (normalizado: "${normalized}")`);
          continue;
        }
        
        const op = adjustMatch[1] || '+';
        let valStr = adjustMatch[2].replace(',', '.'); // Normalizar coma a punto
        
        // Si empieza con punto, añadir 0 delante (.56 -> 0.56)
        if (valStr.startsWith('.')) {
          valStr = '0' + valStr;
        }
        
        const val = parseFloat(valStr);
        if (isNaN(val)) {
          console.warn(`No se pudo parsear el valor: "${valStr}" de "${adjustStr}"`);
          continue;
        }
        
        console.log(`Ajuste aplicado: "${adjustStr}" -> ${op === '+' ? '+' : '-'}${val} = ${val}`);
        totalAdjustment += op === '+' ? val : -val;
      }
      
      if (totalAdjustment !== 0) {
        const oldAmount = row.amount || 0;
        const newAmount = Math.max(0, oldAmount + totalAdjustment);
        console.log(`Fila ${row.localId}: ${oldAmount} + ${totalAdjustment} = ${newAmount}`);
        return {
          ...row,
          amount: newAmount,
          isEdited: !row.isNew ? true : row.isEdited,
        };
      }
      
      return row;
    });
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
      // También eliminar los ajustes asociados
      setQuickAdjustValues(prev => {
        const next = { ...prev };
        delete next[localId];
        return next;
      });
    }
  };

  const handleSaveAll = async () => {
      if (!user?.userId) return;

      // Primero aplicar los ajustes pendientes
      const rowsWithAdjustments = applyPendingAdjustments(rows);
      
      console.log('Rows después de aplicar ajustes:', rowsWithAdjustments);
      console.log('Ajustes pendientes:', quickAdjustValues);

      const invalid = rowsWithAdjustments.filter(r => r.amount == null || isNaN(r.amount) || r.amount < 0);
      if (invalid.length > 0) {
        console.error('Filas inválidas:', invalid);
        toast.error('Todas las filas deben tener una cantidad válida (mayor o igual a 0)');
        return;
      }
      
      // Filtrar filas con cantidad 0 (no tiene sentido guardar transacciones de 0)
      const zeroAmountRows = rowsWithAdjustments.filter(r => r.amount === 0);
      if (zeroAmountRows.length > 0) {
        const confirmDelete = confirm(`Hay ${zeroAmountRows.length} transacción(es) con cantidad 0. ¿Deseas eliminarlas antes de guardar?`);
        if (confirmDelete) {
          const zeroIds = zeroAmountRows.map(r => r.localId);
          setRows(prev => prev.filter(r => !zeroIds.includes(r.localId)));
          setQuickAdjustValues(prev => {
            const next = { ...prev };
            zeroIds.forEach(id => delete next[id]);
            return next;
          });
          // Continuar guardando las demás
        } else {
          // Si no quiere eliminarlas, no guardar nada
          return;
        }
      }
      
      // Filtrar las filas con cantidad 0 antes de guardar
      const rowsToSave = rowsWithAdjustments.filter(r => r.amount > 0);
      if (rowsToSave.length === 0) {
        toast.error('No hay transacciones válidas para guardar (todas tienen cantidad 0 o menor)');
        return;
      }

      // Combinar transacciones duplicadas ANTES de guardar
      const combinedRows = combineDuplicateTransactions(rowsToSave);
      
      console.log('Filas combinadas para guardar:', combinedRows);
      console.log('Filas nuevas:', combinedRows.filter(r => r.isNew).length);
      console.log('Filas editadas:', combinedRows.filter(r => r.isEdited && !r.isNew).length);

      const toCreate: CreateTransactionRequest[] = [];
      const toUpdate: { transactionId: number; payload: CreateTransactionRequest }[] = [];

      for (const r of combinedRows) {
        const payload = await buildPayloadFromRow(r);
        if (r.isNew) {
          toCreate.push(payload);
        } else if (r.isEdited && r.transactionId) {
          toUpdate.push({ transactionId: r.transactionId, payload });
        } else {
          console.log('Fila saltada (no nueva ni editada):', r);
        }
      }
      
      console.log('Para crear:', toCreate.length);
      console.log('Para actualizar:', toUpdate.length);

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

        setQuickAdjustValues({}); // Limpiar ajustes pendientes
        fetchTransactions();
      } catch (err) {
        console.error('Error guardando transacciones:', err);
        toast.error('Error guardando transacciones');
      }
    };

  // loading guard se mueve más abajo para no romper el orden de hooks

  // Agrupar ingresos por categoría
  const incomeByCategory = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    
    try {
      const incomeRows = rows.filter(r => r.type === 'income');
      const grouped: Record<string, { 
        categoryId?: number; 
        categoryName: string; 
        rows: Row[];
        total: number;
      }> = {};
      
      incomeRows.forEach(row => {
        const categoryName = row.categoryName || 
                            (categories && categories.length > 0 ? categories.find(c => c.categoryId === row.categoryId)?.name : null) || 
                            'Sin categoría';
        const key = `${row.categoryId || 'none'}-${categoryName.toLowerCase()}`;
        
        if (!grouped[key]) {
          grouped[key] = {
            categoryId: row.categoryId,
            categoryName,
            rows: [],
            total: 0,
          };
        }
        
        grouped[key].rows.push(row);
        grouped[key].total += row.amount || 0;
      });
      
      return Object.values(grouped).sort((a, b) => 
        a.categoryName.localeCompare(b.categoryName)
      );
    } catch (error) {
      console.error('Error grouping income by category:', error);
      return [];
    }
  }, [rows, categories]);

  // Agrupar gastos por categoría
  const expenseByCategory = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    
    try {
      const expenseRows = rows.filter(r => r.type === 'expense');
      const grouped: Record<string, { 
        categoryId?: number; 
        categoryName: string; 
        rows: Row[];
        total: number;
      }> = {};
      
      expenseRows.forEach(row => {
        const categoryName = row.categoryName || 
                            (categories && categories.length > 0 ? categories.find(c => c.categoryId === row.categoryId)?.name : null) || 
                            'Sin categoría';
        const key = `${row.categoryId || 'none'}-${categoryName.toLowerCase()}`;
        
        if (!grouped[key]) {
          grouped[key] = {
            categoryId: row.categoryId,
            categoryName,
            rows: [],
            total: 0,
          };
        }
        
        grouped[key].rows.push(row);
        grouped[key].total += row.amount || 0;
      });
      
      return Object.values(grouped).sort((a, b) => 
        a.categoryName.localeCompare(b.categoryName)
      );
    } catch (error) {
      console.error('Error grouping expenses by category:', error);
      return [];
    }
  }, [rows, categories]);
  
  const incomeRows = rows.filter(r => r.type === 'income');
  const expenseRows = rows.filter(r => r.type === 'expense');

  const totalIncome = incomeRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalExpenses = expenseRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const netBalance = totalIncome - totalExpenses;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  // Función para añadir una nueva transacción a una categoría específica
  const addEmptyRowToCategory = (categoryName: string, categoryId?: number, type?: 'income' | 'expense') => {
    const newLocalId = `new-${Date.now()}-${Math.random()}`;
    const lastDate = transactions.length > 0 
      ? [...transactions].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0].transactionDate
      : defaultStartDate;
    setRows(prev => [
      ...prev,
      {
        localId: newLocalId,
        isNew: true,
        type: type || 'expense', // Default to expense
        categoryName,
        categoryId,
        transactionDate: lastDate,
        description: '',
        amount: 0,
      } as Row,
    ]);
    setQuickAdjustValues(prev => ({
      ...prev,
      [newLocalId]: ['']
    }));
  };

  // Función para actualizar el nombre de categoría de todas las transacciones de un grupo
  const updateCategoryForGroup = async (oldCategoryName: string, oldCategoryId: number | undefined, newCategoryName: string, type: 'income' | 'expense') => {
    if (!user?.userId) return;
    
    const trimmedNewName = newCategoryName.trim();
    if (!trimmedNewName) {
      toast.error('El nombre de la categoría no puede estar vacío');
      return;
    }

    try {
      // Encontrar todas las transacciones de esta categoría
      const transactionsToUpdate = rows.filter(r => {
        const rowCategoryName = r.categoryName || categories.find(c => c.categoryId === r.categoryId)?.name || '';
        return rowCategoryName.toLowerCase().trim() === oldCategoryName.toLowerCase().trim() && r.type === type && !r.isNew;
      });

      if (transactionsToUpdate.length === 0) {
        toast.error('No hay transacciones guardadas para actualizar');
        return;
      }

      // Obtener o crear la nueva categoría
      let newCategoryId = oldCategoryId;
      const existingCategory = categories.find(c => c.name.toLowerCase().trim() === trimmedNewName.toLowerCase() && c.type === type);
      
      if (existingCategory) {
        newCategoryId = existingCategory.categoryId;
      } else {
        // Crear nueva categoría
        const newCat = await createCategory(user.userId, { name: trimmedNewName, type });
        newCategoryId = newCat.categoryId;
        setCategories(prev => [...prev, newCat]);
      }

      // Actualizar todas las transacciones
      let successCount = 0;
      for (const transaction of transactionsToUpdate) {
        if (transaction.transactionId) {
          try {
            const payload: CreateTransactionRequest = {
              userId: user.userId,
              categoryId: newCategoryId,
              assetId: transaction.assetId ?? null,
              relatedAssetId: transaction.relatedAssetId ?? null,
              liabilityId: transaction.liabilityId ?? null,
              type: transaction.type ?? null,
              amount: Math.abs(transaction.amount),
              transactionDate: transaction.transactionDate,
              description: transaction.description ?? null,
            };
            await updateTransaction(user.userId, transaction.transactionId, payload);
            successCount++;
          } catch (err) {
            console.error('Error actualizando transacción:', err);
          }
        }
      }

      toast.success(`${successCount} transacciones actualizadas correctamente`);
      setEditingCategoryKey(null);
      setEditingCategoryName('');
      fetchTransactions();
    } catch (error) {
      console.error('Error actualizando categoría:', error);
      toast.error('Error al actualizar la categoría');
    }
  };


  const rowClass = (r: Row, idx: number) => {
    const baseClass = 'transition-all duration-200 hover:bg-accent/30';
    const stripe = idx % 2 === 0 ? 'bg-white' : 'bg-accent/10';
    const typeClass =
      r.type === 'income'
        ? 'border-l-4 border-success hover:border-success-light hover:shadow-sm'
        : r.type === 'expense'
        ? 'border-l-4 border-destructive hover:border-destructive/80 hover:shadow-sm'
        : '';
    const editedClass = r.isEdited && !r.isNew ? 'ring-2 ring-primary/30 bg-primary/5' : '';
    const newClass = r.isNew ? 'ring-2 ring-success/40 bg-success/5' : '';
    return `${baseClass} ${stripe} ${typeClass} ${editedClass} ${newClass}`;
  };

  const toggleEdit = (localId: string, on?: boolean) => {
    setEditingRowIds(prev => ({ ...prev, [localId]: on === undefined ? !prev[localId] : on }));
  };

  // Función para guardar una transacción individual
  const saveIndividualTransaction = async (localId: string) => {
    if (!user?.userId) return;
    
    const row = rows.find(r => r.localId === localId);
    if (!row || row.isNew) return;
    
    if (!row.transactionId) {
      toast.error('No se puede guardar: ID de transacción no válido');
      return;
    }

    try {
      const payload = await buildPayloadFromRow(row);
      await updateTransaction(user.userId, row.transactionId, payload);
      toast.success('Transacción actualizada correctamente');
      setEditingRowIds(prev => {
        const next = { ...prev };
        delete next[localId];
        return next;
      });
      fetchTransactions();
    } catch (error) {
      console.error('Error actualizando transacción:', error);
      toast.error('Error al actualizar la transacción');
    }
  };

  const safeFormatDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (!isValidDate(d)) return iso;
    try {
      return format(d, 'dd/MM/yyyy');
    } catch {
      return iso;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4">
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
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-success/30 bg-gradient-to-br from-success/5 to-success/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-success mb-1">Total Ingresos</p>
                    <p className="text-2xl font-bold text-success">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalIncome)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-destructive mb-1">Total Gastos</p>
                    <p className="text-2xl font-bold text-destructive">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalExpenses)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={`border-2 ${netBalance >= 0 ? 'border-success/30 bg-gradient-to-br from-success/5 to-success/10' : 'border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10'}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Balance Neto</p>
                    <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(netBalance)}
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${netBalance >= 0 ? 'bg-success/20' : 'bg-destructive/20'}`}>
                    <DollarSign className={`h-6 w-6 ${netBalance >= 0 ? 'text-success' : 'text-destructive'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Añadir transacción rápida (cualquier categoría, incluso nueva) */}
        <Card className="border-accent shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Añadir transacción rápida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 items-start">
              <Input
                list="categories-list"
                placeholder="Categoría (puede ser nueva)"
                id="quick-category"
                className="h-9 text-sm w-full"
              />
              <Select onValueChange={(v) => {
                const el = document.getElementById('quick-type') as HTMLInputElement | null;
                if (el) el.value = v;
              }} defaultValue="expense">
                <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="expense">Gasto</SelectItem>
                </SelectContent>
              </Select>
              <input id="quick-type" type="hidden" defaultValue="expense" />
              <Input 
                type="date" 
                id="quick-date" 
                defaultValue={transactions.length > 0 
                  ? [...transactions].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0].transactionDate
                  : defaultStartDate} 
                className="h-9 text-sm w-full" 
              />
              <Input type="number" step="0.01" placeholder="Importe" id="quick-amount" className="h-9 text-sm w-full xl:col-span-2" />
              <select 
                id="quick-asset" 
                className="h-9 text-sm border rounded px-2 w-full xl:max-w-[180px]"
                defaultValue={user?.userId ? (localStorage.getItem(`primaryAsset_${user.userId}`) || '') : ''}
              >
                <option value="">Activo</option>
                {assets.map(a => (<option key={a.assetId} value={a.assetId}>{a.name}</option>))}
              </select>
              <select id="quick-related-asset" className="h-9 text-sm border rounded px-2 w-full xl:max-w-[220px]">
                <option value="">Activo relacionado (opcional)</option>
                {assets.map(a => (<option key={a.assetId} value={a.assetId}>{a.name}</option>))}
              </select>
              <select id="quick-liability" className="h-9 text-sm border rounded px-2 w-full xl:max-w-[200px]">
                <option value="">Pasivo (opcional)</option>
                {liabilities.map(l => (<option key={l.liabilityId} value={l.liabilityId}>{l.name}</option>))}
              </select>
              <Button
                onClick={async () => {
                  if (!user?.userId) return;
                  const catEl = document.getElementById('quick-category') as HTMLInputElement | null;
                  const typeEl = document.getElementById('quick-type') as HTMLInputElement | null;
                  const dateEl = document.getElementById('quick-date') as HTMLInputElement | null;
                  const amountEl = document.getElementById('quick-amount') as HTMLInputElement | null;
                  const assetEl = document.getElementById('quick-asset') as HTMLSelectElement | null;
                  const relAssetEl = document.getElementById('quick-related-asset') as HTMLSelectElement | null;
                  const liabEl = document.getElementById('quick-liability') as HTMLSelectElement | null;
                  const categoryName = catEl?.value?.trim();
                  const type = (typeEl?.value as 'income' | 'expense' | '') || 'expense';
                  const lastDate = transactions.length > 0 
                    ? [...transactions].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0].transactionDate
                    : defaultStartDate;
                  const date = dateEl?.value || lastDate;
                  const amount = amountEl?.value ? parseFloat(amountEl.value) : NaN;
                  const assetId = assetEl?.value ? parseInt(assetEl.value) : undefined;
                  const relatedAssetId = relAssetEl?.value ? parseInt(relAssetEl.value) : undefined;
                  const liabilityId = liabEl?.value ? parseInt(liabEl.value) : undefined;
                  
                  if (!categoryName || !type || isNaN(amount) || amount <= 0) {
                    toast.error('Por favor completa todos los campos obligatorios');
                    return;
                  }
                  
                  try {
                    // Construir el payload para guardar directamente
                    const payload = await buildPayloadFromRow({
                      localId: 'temp',
                      isNew: true,
                      type,
                      categoryName,
                      transactionDate: date,
                      description: '',
                      amount,
                      assetId,
                      relatedAssetId,
                      liabilityId,
                    });
                    
                    // Guardar directamente
                    await createTransaction(user.userId, payload);
                    toast.success('Transacción guardada correctamente');
                    
                    // Limpiar campos
                    if (catEl) catEl.value = '';
                    if (amountEl) amountEl.value = '';
                    if (assetEl) assetEl.value = '';
                    if (relAssetEl) relAssetEl.value = '';
                    if (liabEl) liabEl.value = '';
                    
                    // Recargar transacciones
                    fetchTransactions();
                  } catch (error) {
                    console.error('Error guardando transacción:', error);
                    toast.error('Error al guardar la transacción');
                  }
                }}
                className="h-9 bg-success hover:bg-success/90 text-white"
              >
                <Save className="h-4 w-4 mr-1" />
                Guardar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Puedes escribir una categoría nueva. Se guardará inmediatamente.</p>
          </CardContent>
        </Card>

        {/* Sección de Ingresos agrupados por categoría */}
        <Card className="border-success/30 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-success/10 to-success/5 border-b border-success/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-success">Ingresos</CardTitle>
                  <p className="text-sm text-success/80 mt-0.5">{incomeRows.length} {incomeRows.length === 1 ? 'transacción' : 'transacciones'}</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {incomeByCategory.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No hay ingresos en el rango de fechas seleccionado</p>
            ) : (
              incomeByCategory.map((categoryGroup) => {
                const categoryKey = `income-${categoryGroup.categoryId || 'none'}-${categoryGroup.categoryName.toLowerCase()}`;
                const isEditingThis = editingCategoryKey === categoryKey;
                
                return (
                <Card key={categoryGroup.categoryId || categoryGroup.categoryName} className="shadow-sm border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      {isEditingThis ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="h-8 text-base font-semibold max-w-[300px]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateCategoryForGroup(categoryGroup.categoryName, categoryGroup.categoryId, editingCategoryName, 'income');
                              } else if (e.key === 'Escape') {
                                setEditingCategoryKey(null);
                                setEditingCategoryName('');
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-success hover:bg-success/10"
                            onClick={() => updateCategoryForGroup(categoryGroup.categoryName, categoryGroup.categoryId, editingCategoryName, 'income')}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setEditingCategoryKey(null);
                              setEditingCategoryName('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => categoryGroup.categoryId && navigate(`/categories/${categoryGroup.categoryId}`)}
                              className="text-base font-semibold hover:text-primary transition-colors cursor-pointer flex items-center gap-1 group"
                            >
                              {categoryGroup.categoryName}
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-accent/40"
                              onClick={() => {
                                setEditingCategoryKey(categoryKey);
                                setEditingCategoryName(categoryGroup.categoryName);
                              }}
                            >
                              <Edit2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-sm">
                              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(categoryGroup.total)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {categoryGroup.rows.length} {categoryGroup.rows.length === 1 ? 'transacción' : 'transacciones'}
                            </Badge>
                          </div>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                {/* Histórico de transacciones de esta categoría */}
                {categoryGroup.rows.filter(r => !r.isNew).length > 0 && (
                  <div className="border rounded-lg p-3 bg-accent/5">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Transacciones registradas</h4>
                    <div className="space-y-2">
                {categoryGroup.rows.filter(r => !r.isNew).map((r) => (
                  <div key={r.localId} className="flex items-center justify-between p-2 bg-white rounded border border-accent hover:bg-accent/10 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                      {editingRowIds[r.localId] ? (
                        <>
                          <Input
                            type="date"
                            value={r.transactionDate}
                            onChange={(e) => updateRow(r.localId, { transactionDate: e.target.value })}
                            className="h-8 text-xs"
                            style={{ width: 120 }}
                          />
                          <Input
                            type="number"
                            step="0.01"
                            value={getAmountDisplayValue(r)}
                            onChange={(e) => handleAmountChange(r.localId, e.target.value)}
                            className="h-8 text-sm font-medium max-w-[120px]"
                          />
                          <select
                            value={r.assetId ? String(r.assetId) : ''}
                            onChange={(e) => updateRow(r.localId, { assetId: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="h-8 text-xs border rounded px-2 min-w-[140px]"
                          >
                            <option value="">Activo</option>
                            {assets.map(a => (<option key={a.assetId} value={a.assetId}>{a.name}</option>))}
                          </select>
                          <select
                            value={r.relatedAssetId ? String(r.relatedAssetId) : ''}
                            onChange={(e) => updateRow(r.localId, { relatedAssetId: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="h-8 text-xs border rounded px-2 min-w-[160px]"
                          >
                            <option value="">Activo relacionado</option>
                            {assets.map(a => (<option key={a.assetId} value={a.assetId}>{a.name}</option>))}
                          </select>
                          <select
                            value={r.liabilityId ? String(r.liabilityId) : ''}
                            onChange={(e) => updateRow(r.localId, { liabilityId: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="h-8 text-xs border rounded px-2 min-w-[140px]"
                          >
                            <option value="">Pasivo</option>
                            {liabilities.map(l => (<option key={l.liabilityId} value={l.liabilityId}>{l.name}</option>))}
                          </select>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground min-w-[80px]">{safeFormatDate(r.transactionDate)}</span>
                          <span className={`font-semibold ${r.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(r.amount || 0)}
                          </span>
                        </>
                      )}
                        </div>
                    <div className="flex items-center gap-1">
                      {editingRowIds[r.localId] ? (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => saveIndividualTransaction(r.localId)}
                            className="h-7 px-2 bg-success hover:bg-success/90 text-white"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Guardar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEdit(r.localId)}
                            className="h-7 px-2 hover:bg-accent"
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEdit(r.localId)}
                            className="h-7 px-2 hover:bg-primary/10 hover:text-primary"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRow(r.localId)}
                            className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                    </div>
                  </div>
                )}

                {/* Formulario compacto para añadir nueva transacción */}
                <div className="border-2 border-dashed border-accent rounded-lg p-3 bg-accent/5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 items-start">
                    <Input
                      type="date"
                      id={`date-income-${categoryGroup.categoryId || categoryGroup.categoryName}`}
                      defaultValue={transactions.length > 0 
                        ? [...transactions].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0].transactionDate
                        : defaultStartDate}
                      className="h-9 text-sm w-full"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Importe"
                      id={`amount-income-${categoryGroup.categoryId || categoryGroup.categoryName}`}
                      className="h-9 w-full text-sm font-medium"
                    />
                    <select 
                      id={`asset-income-${categoryGroup.categoryId || categoryGroup.categoryName}`} 
                      className="h-9 text-sm border rounded px-2 w-full lg:max-w-[180px]"
                      defaultValue={user?.userId ? (localStorage.getItem(`primaryAsset_${user.userId}`) || '') : ''}
                    >
                      <option value="">Activo</option>
                      {assets.map(a => (
                        <option key={a.assetId} value={a.assetId}>{a.name}</option>
                      ))}
                    </select>
                    <select id={`related-asset-income-${categoryGroup.categoryId || categoryGroup.categoryName}`} className="h-9 text-sm border rounded px-2 w-full lg:max-w-[220px]">
                      <option value="">Activo relacionado (opcional)</option>
                      {assets.map(a => (
                        <option key={a.assetId} value={a.assetId}>{a.name}</option>
                      ))}
                    </select>
                    <select id={`liability-income-${categoryGroup.categoryId || categoryGroup.categoryName}`} className="h-9 text-sm border rounded px-2 w-full lg:max-w-[200px]">
                      <option value="">Pasivo (opcional)</option>
                      {liabilities.map(l => (
                        <option key={l.liabilityId} value={l.liabilityId}>{l.name}</option>
                      ))}
                    </select>
                    <Button
                      onClick={async () => {
                        if (!user?.userId) return;
                        const amountInput = document.getElementById(`amount-income-${categoryGroup.categoryId || categoryGroup.categoryName}`) as HTMLInputElement;
                        const dateInput = document.getElementById(`date-income-${categoryGroup.categoryId || categoryGroup.categoryName}`) as HTMLInputElement;
                        const assetInput = document.getElementById(`asset-income-${categoryGroup.categoryId || categoryGroup.categoryName}`) as HTMLSelectElement;
                        const relatedAssetInput = document.getElementById(`related-asset-income-${categoryGroup.categoryId || categoryGroup.categoryName}`) as HTMLSelectElement;
                        const liabilityInput = document.getElementById(`liability-income-${categoryGroup.categoryId || categoryGroup.categoryName}`) as HTMLSelectElement;
                        const amount = amountInput?.value ? parseFloat(amountInput.value) : NaN;
                        const lastDate = transactions.length > 0 
                          ? [...transactions].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0].transactionDate
                          : defaultStartDate;
                        const date = dateInput?.value || lastDate;
                        const assetId = assetInput && assetInput.value ? parseInt(assetInput.value) : undefined;
                        const relatedAssetId = relatedAssetInput && relatedAssetInput.value ? parseInt(relatedAssetInput.value) : undefined;
                        const liabilityId = liabilityInput && liabilityInput.value ? parseInt(liabilityInput.value) : undefined;
                        
                        if (!isNaN(amount) && amount > 0) {
                          try {
                            // Construir el payload para guardar directamente
                            const payload = await buildPayloadFromRow({
                              localId: 'temp',
                              isNew: true,
                              type: 'income',
                              categoryName: categoryGroup.categoryName,
                              categoryId: categoryGroup.categoryId,
                              transactionDate: date,
                              description: '',
                              amount: amount,
                              assetId,
                              relatedAssetId,
                              liabilityId,
                            });
                            
                            // Guardar directamente
                            await createTransaction(user.userId, payload);
                            toast.success('Transacción guardada correctamente');
                            
                            // Limpiar campos
                            if (amountInput) amountInput.value = '';
                            if (dateInput) {
                              const lastDate = transactions.length > 0 
                                ? [...transactions].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0].transactionDate
                                : defaultStartDate;
                              dateInput.value = lastDate;
                            }
                            if (assetInput) assetInput.value = '';
                            if (relatedAssetInput) relatedAssetInput.value = '';
                            if (liabilityInput) liabilityInput.value = '';
                            
                            // Recargar transacciones
                            fetchTransactions();
                          } catch (error) {
                            console.error('Error guardando transacción:', error);
                            toast.error('Error al guardar la transacción');
                          }
                        }
                      }}
                      className="h-9 w-full sm:w-auto bg-success hover:bg-success/90 text-white"
                      size="sm"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Guardar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Introduce el importe y haz clic en Guardar</p>
                </div>

                </CardContent>
              </Card>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Sección de Gastos agrupados por categoría */}
        <Card className="border-destructive/30 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-destructive/10 to-destructive/5 border-b border-destructive/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-destructive flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-destructive">Gastos</CardTitle>
                  <p className="text-sm text-destructive/80 mt-0.5">{expenseRows.length} {expenseRows.length === 1 ? 'transacción' : 'transacciones'}</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {expenseByCategory.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No hay gastos en el rango de fechas seleccionado</p>
            ) : (
              expenseByCategory.map((categoryGroup) => {
                const categoryKey = `expense-${categoryGroup.categoryId || 'none'}-${categoryGroup.categoryName.toLowerCase()}`;
                const isEditingThis = editingCategoryKey === categoryKey;
                
                return (
                <Card key={categoryGroup.categoryId || categoryGroup.categoryName} className="shadow-sm border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      {isEditingThis ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="h-8 text-base font-semibold max-w-[300px]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateCategoryForGroup(categoryGroup.categoryName, categoryGroup.categoryId, editingCategoryName, 'expense');
                              } else if (e.key === 'Escape') {
                                setEditingCategoryKey(null);
                                setEditingCategoryName('');
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-success hover:bg-success/10"
                            onClick={() => updateCategoryForGroup(categoryGroup.categoryName, categoryGroup.categoryId, editingCategoryName, 'expense')}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setEditingCategoryKey(null);
                              setEditingCategoryName('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => categoryGroup.categoryId && navigate(`/categories/${categoryGroup.categoryId}`)}
                              className="text-base font-semibold hover:text-primary transition-colors cursor-pointer flex items-center gap-1 group"
                            >
                              {categoryGroup.categoryName}
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-accent/40"
                              onClick={() => {
                                setEditingCategoryKey(categoryKey);
                                setEditingCategoryName(categoryGroup.categoryName);
                              }}
                            >
                              <Edit2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-sm">
                              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(categoryGroup.total)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {categoryGroup.rows.length} {categoryGroup.rows.length === 1 ? 'transacción' : 'transacciones'}
                            </Badge>
                          </div>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Histórico de transacciones de esta categoría */}
                    {categoryGroup.rows.filter(r => !r.isNew).length > 0 && (
                      <div className="border rounded-lg p-3 bg-accent/5">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Transacciones registradas</h4>
                        <div className="space-y-2">
                          {categoryGroup.rows.filter(r => !r.isNew).map((r) => (
                            <div key={r.localId} className="flex items-center justify-between p-2 bg-white rounded border border-accent hover:bg-accent/10 transition-colors">
                              <div className="flex items-center gap-3 flex-1">
                                {editingRowIds[r.localId] ? (
                                  <>
                                    <Input
                                      type="date"
                                      value={r.transactionDate}
                                      onChange={(e) => updateRow(r.localId, { transactionDate: e.target.value })}
                                      className="h-8 text-xs"
                                      style={{ width: 120 }}
                                    />
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={getAmountDisplayValue(r)}
                                      onChange={(e) => handleAmountChange(r.localId, e.target.value)}
                                      className="h-8 text-sm font-medium max-w-[120px]"
                                    />
                                    <select
                                      value={r.assetId ? String(r.assetId) : ''}
                                      onChange={(e) => updateRow(r.localId, { assetId: e.target.value ? parseInt(e.target.value) : undefined })}
                                      className="h-8 text-xs border rounded px-2 min-w-[140px]"
                                    >
                                      <option value="">Activo</option>
                                      {assets.map(a => (<option key={a.assetId} value={a.assetId}>{a.name}</option>))}
                                    </select>
                                    <select
                                      value={r.relatedAssetId ? String(r.relatedAssetId) : ''}
                                      onChange={(e) => updateRow(r.localId, { relatedAssetId: e.target.value ? parseInt(e.target.value) : undefined })}
                                      className="h-8 text-xs border rounded px-2 min-w-[160px]"
                                    >
                                      <option value="">Activo relacionado</option>
                                      {assets.map(a => (<option key={a.assetId} value={a.assetId}>{a.name}</option>))}
                                    </select>
                                    <select
                                      value={r.liabilityId ? String(r.liabilityId) : ''}
                                      onChange={(e) => updateRow(r.localId, { liabilityId: e.target.value ? parseInt(e.target.value) : undefined })}
                                      className="h-8 text-xs border rounded px-2 min-w-[140px]"
                                    >
                                      <option value="">Pasivo</option>
                                      {liabilities.map(l => (<option key={l.liabilityId} value={l.liabilityId}>{l.name}</option>))}
                                    </select>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xs text-muted-foreground min-w-[80px]">{safeFormatDate(r.transactionDate)}</span>
                                    <span className={`font-semibold ${r.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                                      {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(r.amount || 0)}
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {editingRowIds[r.localId] ? (
                                  <>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => saveIndividualTransaction(r.localId)}
                                      className="h-7 px-2 bg-success hover:bg-success/90 text-white"
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      Guardar
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleEdit(r.localId)}
                                      className="h-7 px-2 hover:bg-accent"
                                    >
                                      Cancelar
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleEdit(r.localId)}
                                      className="h-7 px-2 hover:bg-primary/10 hover:text-primary"
                                    >
                                      Editar
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeRow(r.localId)}
                                      className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Formulario compacto para añadir nueva transacción */}
                    <div className="border-2 border-dashed border-accent rounded-lg p-3 bg-accent/5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 items-start">
                        <Input
                          type="date"
                          id={`date-expense-${categoryGroup.categoryId || categoryGroup.categoryName}`}
                          defaultValue={transactions.length > 0 
                            ? [...transactions].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0].transactionDate
                            : defaultStartDate}
                          className="h-9 text-sm w-full"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Importe"
                          id={`amount-expense-${categoryGroup.categoryId || categoryGroup.categoryName}`}
                          className="h-9 w-full text-sm font-medium"
                        />
                        <select 
                          id={`asset-expense-${categoryGroup.categoryId || categoryGroup.categoryName}`} 
                          className="h-9 text-sm border rounded px-2 w-full lg:max-w-[180px]"
                          defaultValue={user?.userId ? (localStorage.getItem(`primaryAsset_${user.userId}`) || '') : ''}
                        >
                          <option value="">Activo</option>
                          {assets.map(a => (
                            <option key={a.assetId} value={a.assetId}>{a.name}</option>
                          ))}
                        </select>
                        <select id={`related-asset-expense-${categoryGroup.categoryId || categoryGroup.categoryName}`} className="h-9 text-sm border rounded px-2 w-full lg:max-w-[220px]">
                          <option value="">Activo relacionado (opcional)</option>
                          {assets.map(a => (
                            <option key={a.assetId} value={a.assetId}>{a.name}</option>
                          ))}
                        </select>
                        <select id={`liability-expense-${categoryGroup.categoryId || categoryGroup.categoryName}`} className="h-9 text-sm border rounded px-2 w-full lg:max-w-[200px]">
                          <option value="">Pasivo (opcional)</option>
                          {liabilities.map(l => (
                            <option key={l.liabilityId} value={l.liabilityId}>{l.name}</option>
                          ))}
                        </select>
                        <Button
                          onClick={async () => {
                            if (!user?.userId) return;
                            const amountInput = document.getElementById(`amount-expense-${categoryGroup.categoryId || categoryGroup.categoryName}`) as HTMLInputElement;
                            const dateInput = document.getElementById(`date-expense-${categoryGroup.categoryId || categoryGroup.categoryName}`) as HTMLInputElement;
                            const assetInput = document.getElementById(`asset-expense-${categoryGroup.categoryId || categoryGroup.categoryName}`) as HTMLSelectElement;
                            const relatedAssetInput = document.getElementById(`related-asset-expense-${categoryGroup.categoryId || categoryGroup.categoryName}`) as HTMLSelectElement;
                            const liabilityInput = document.getElementById(`liability-expense-${categoryGroup.categoryId || categoryGroup.categoryName}`) as HTMLSelectElement;
                            const amount = amountInput?.value ? parseFloat(amountInput.value) : NaN;
                            const lastDate = transactions.length > 0 
                              ? [...transactions].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0].transactionDate
                              : defaultStartDate;
                            const date = dateInput?.value || lastDate;
                            const assetId = assetInput && assetInput.value ? parseInt(assetInput.value) : undefined;
                            const relatedAssetId = relatedAssetInput && relatedAssetInput.value ? parseInt(relatedAssetInput.value) : undefined;
                            const liabilityId = liabilityInput && liabilityInput.value ? parseInt(liabilityInput.value) : undefined;
                            
                            if (!isNaN(amount) && amount > 0) {
                              try {
                                // Construir el payload para guardar directamente
                                const payload = await buildPayloadFromRow({
                                  localId: 'temp',
                                  isNew: true,
                                  type: 'expense',
                                  categoryName: categoryGroup.categoryName,
                                  categoryId: categoryGroup.categoryId,
                                  transactionDate: date,
                                  description: '',
                                  amount: amount,
                                  assetId,
                                  relatedAssetId,
                                  liabilityId,
                                });
                                
                                // Guardar directamente
                                await createTransaction(user.userId, payload);
                                toast.success('Transacción guardada correctamente');
                                
                                // Limpiar campos
                                if (amountInput) amountInput.value = '';
                                if (dateInput) {
                                  const lastDate = transactions.length > 0 
                                    ? [...transactions].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0].transactionDate
                                    : defaultStartDate;
                                  dateInput.value = lastDate;
                                }
                                if (assetInput) assetInput.value = '';
                                if (relatedAssetInput) relatedAssetInput.value = '';
                                if (liabilityInput) liabilityInput.value = '';
                                
                                // Recargar transacciones
                                fetchTransactions();
                              } catch (error) {
                                console.error('Error guardando transacción:', error);
                                toast.error('Error al guardar la transacción');
                              }
                            }
                          }}
                          className="h-9 w-full sm:w-auto"
                          size="sm"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Introduce el importe y haz clic en + para añadir</p>
                    </div>

                  </CardContent>
                </Card>
                );
              })
            )}
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