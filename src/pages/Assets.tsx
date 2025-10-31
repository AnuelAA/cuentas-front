import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAssets, getAssetRoi, getTransactions, getCategories, getAssetTypes, createAsset, updateAsset, addAssetValuation, deleteAsset } from '@/services/api';
import type { Asset, AssetRoi, Transaction, Category, AssetType } from '@/types/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Eye, Save, Plus, RefreshCw, BarChart3, DollarSign, Calendar, Trash2, Pencil } from 'lucide-react';
import { format, parseISO, endOfMonth, subYears, isValid } from 'date-fns';
import { toast } from 'sonner';
import { MonthNavigator } from '@/components/MonthNavigator';
import { startOfMonth, format as formatDate } from 'date-fns';

const Assets: React.FC = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssetRoi, setSelectedAssetRoi] = useState<AssetRoi | null>(null);
  const [selectedAssetData, setSelectedAssetData] = useState<Asset | null>(null);
  const [assetTransactions, setAssetTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
    const [assetModalOpen, setAssetModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [assetForm, setAssetForm] = useState<{ name: string; acquisitionValue: number; currentValue: number }>({
      name: '',
      acquisitionValue: 0,
      currentValue: 0,
    });
    const [valuationModalOpen, setValuationModalOpen] = useState(false);
    const [valuationDate, setValuationDate] = useState<string>(formatDate(selectedMonth, 'yyyy-MM-01'));
    const [assetValuations, setAssetValuations] = useState<Record<number, { currentValue: string; acquisitionValue?: string }>>({});
    const [deleteAssetDialogOpen, setDeleteAssetDialogOpen] = useState(false);
    const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  // Obtiene el assetValue para el mes seleccionado (valor + fecha)
  const getAssetValueForMonth = (asset: Asset, month: Date): { value: number; date: Date | null } => {
    if (!Array.isArray(asset.assetValues) || asset.assetValues.length === 0) {
      return { value: Number(asset.currentValue ?? 0), date: asset.currentValue ? new Date() : null };
    }
    const targetEnd = endOfMonth(month).getTime();
    const candidates = asset.assetValues
      .map(av => ({ ...av, _date: parseISO(av.valuationDate) }))
      .filter(av => isValid(av._date) && av._date.getTime() <= targetEnd)
      .sort((a, b) => b._date.getTime() - a._date.getTime());
    if (candidates.length === 0) {
      // Si no hay valor para ese mes, usar el más reciente antes de ese mes o el currentValue
      return { value: Number(asset.currentValue ?? 0), date: null };
    }
    // Preferir uno dentro del mismo mes/año, si existe
    const sameMonth = candidates.find(c => 
      c._date.getMonth() === month.getMonth() && 
      c._date.getFullYear() === month.getFullYear()
    );
    const chosen = sameMonth ?? candidates[0];
    return { value: Number(chosen.currentValue ?? 0), date: chosen._date };
  };

  // Busca el valor correspondiente al mes/año de referencia (elige el último <= fin de ese mes)
  const getValueForMonth = (asset: Asset, refDate: Date): number | null => {
    if (!Array.isArray(asset.assetValues) || asset.assetValues.length === 0) return null;
    const targetEnd = endOfMonth(refDate).getTime();
    const candidates = asset.assetValues
      .map(av => ({ ...av, _date: parseISO(av.valuationDate) }))
      .filter(av => isValid(av._date) && av._date.getTime() <= targetEnd)
      .sort((a, b) => b._date.getTime() - a._date.getTime());
    if (candidates.length === 0) return null;
    // Preferir uno dentro del mismo mes/año, si existe
    const sameMonth = candidates.find(c => c._date.getMonth() === refDate.getMonth() && c._date.getFullYear() === refDate.getFullYear());
    const chosen = sameMonth ?? candidates[0];
    return Number(chosen.currentValue ?? 0);
  };

  const fetchAssets = async () => {
    if (!user?.userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getAssets(user.userId);
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Error al cargar los activos');
      setAssets([]);
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
      fetchAssets();
      fetchCategories();
      getAssetTypes().then(setAssetTypes).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleViewDetails = async (asset: Asset) => {
    if (!user?.userId) return;
    try {
      const startDate = '2000-01-01';
      const endDate = '2099-12-31';
      const [roi, transactions] = await Promise.all([
        getAssetRoi(user.userId, asset.assetId, startDate, endDate),
        getTransactions(user.userId, startDate, endDate, asset.assetId)
      ]);
      setSelectedAssetRoi(roi);
      setSelectedAssetData(asset);
      setAssetTransactions(transactions);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error fetching asset details:', error);
      toast.error('Error al cargar los detalles del activo');
    }
  };

    useEffect(() => {
      if (!assets || assets.length === 0) return;
      let latest: Date | null = null;
      assets.forEach(a => {
        if (Array.isArray(a.assetValues)) {
          a.assetValues.forEach(v => {
            try {
              const d = parseISO(v.valuationDate);
              if (!isNaN(d.getTime())) {
                if (!latest || d.getTime() > latest.getTime()) latest = d;
              }
            } catch {}
          });
        }
      });
      if (latest) {
        const defaultMonth = startOfMonth(new Date());
        const inSelectedMonth = assets.some(a =>
          (a.assetValues || []).some(v => startOfMonth(parseISO(v.valuationDate)).getTime() === startOfMonth(defaultMonth).getTime())
        );
        if (!inSelectedMonth) {
          setSelectedMonth(startOfMonth(latest));
        }
      }
    }, [assets]);
    const openAssetModal = (asset: Asset | null) => {
      setEditingAsset(asset);
      setAssetForm({
        name: asset?.name ?? '',
        acquisitionValue: Number(asset?.acquisitionValue ?? 0),
        currentValue: Number(asset?.currentValue ?? 0),
      });
      setAssetModalOpen(true);
    };

    const saveAssetForMonth = async () => {
      if (!user?.userId) return;
      try {
        let saved: Asset;
        const typeSelect = document.getElementById('asset-type-select') as HTMLSelectElement | null;
        if (editingAsset) {
          const maybeTypeId = typeSelect && typeSelect.value ? parseInt(typeSelect.value) : undefined;
          saved = await updateAsset(user.userId, editingAsset.assetId, { name: assetForm.name, assetTypeId: maybeTypeId, acquisitionValue: assetForm.acquisitionValue });
        } else {
          const assetTypeId = typeSelect && typeSelect.value ? parseInt(typeSelect.value) : NaN;
          if (!assetTypeId || isNaN(assetTypeId)) {
            toast.error('Selecciona el tipo de activo');
            return;
          }
          saved = await createAsset(user.userId, { name: assetForm.name, assetTypeId, acquisitionValue: assetForm.acquisitionValue, currentValue: assetForm.currentValue });
        }
        if (!editingAsset) {
          await addAssetValuation(user.userId, saved.assetId, {
            valuationDate: formatDate(selectedMonth, 'yyyy-MM-01'),
            currentValue: assetForm.currentValue,
            acquisitionValue: assetForm.acquisitionValue,
          });
          toast.success('Activo guardado y valoración añadida');
        } else {
          toast.success('Activo actualizado correctamente');
        }
        setAssetModalOpen(false);
        fetchAssets();
      } catch (err) {
        console.error(err);
        toast.error('Error guardando activo');
      }
    };

    const handleDeleteAsset = async () => {
      if (!user?.userId || !assetToDelete) return;
      try {
        await deleteAsset(user.userId, assetToDelete.assetId);
        toast.success('Activo eliminado correctamente');
        setDeleteAssetDialogOpen(false);
        setAssetToDelete(null);
        fetchAssets();
      } catch (err) {
        console.error(err);
        toast.error('Error eliminando activo');
      }
    };

    const saveValuations = async () => {
      if (!user?.userId) return;
      try {
        const promises: Promise<any>[] = [];
        let count = 0;
        
        for (const [assetIdStr, values] of Object.entries(assetValuations)) {
          const assetId = Number(assetIdStr);
          const currentValue = Number(values.currentValue || 0);
          
          if (currentValue > 0) {
            promises.push(
              addAssetValuation(user.userId, assetId, {
                valuationDate: valuationDate,
                currentValue: currentValue,
                acquisitionValue: values.acquisitionValue ? Number(values.acquisitionValue) : undefined,
              })
            );
            count++;
          }
        }

        if (promises.length === 0) {
          toast.error('Debes añadir al menos un valor');
          return;
        }

        await Promise.all(promises);
        toast.success(`${count} valoración${count > 1 ? 'es' : ''} añadida${count > 1 ? 's' : ''} correctamente`);
        setValuationModalOpen(false);
        setAssetValuations({});
        fetchAssets();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Error guardando valoraciones');
      }
    };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(Number(value || 0));
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

  const totalValue = assets.reduce((sum, a) => {
    const { value } = getAssetValueForMonth(a, selectedMonth);
    return sum + value;
  }, 0);
  const totalAcquisition = assets.reduce((sum, a) => sum + (a.acquisitionValue || 0), 0);
  const overallROI = totalAcquisition > 0 ? ((totalValue - totalAcquisition) / totalAcquisition) * 100 : 0;

  return (
    <Layout>
      <div className="space-y-6 px-2 sm:px-0">
        {/* Header mejorado */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Activos
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Gestiona y monitorea el valor de tus activos</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 sm:flex-none">
                <MonthNavigator month={selectedMonth} onChange={setSelectedMonth} />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => fetchAssets()} 
                  variant="outline" 
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualizar
                </Button>
                <Button 
                  onClick={() => openAssetModal(null)} 
                  className="flex-1 sm:flex-none bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo activo
                </Button>
                <Button 
                  onClick={() => {
                    setValuationDate(formatDate(selectedMonth, 'yyyy-MM-01'));
                    setAssetValuations({});
                    setValuationModalOpen(true);
                  }}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Añadir valoración
                </Button>
              </div>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700/80 mb-1">Valor Total</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalValue)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700/80 mb-1">Valor Adquisición</p>
                    <p className="text-2xl font-bold text-purple-700">{formatCurrency(totalAcquisition)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={`border-2 ${overallROI >= 0 ? 'border-green-200 bg-gradient-to-br from-green-50 to-green-50/50' : 'border-red-200 bg-gradient-to-br from-red-50 to-red-50/50'}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">ROI Promedio</p>
                    <p className={`text-2xl font-bold ${overallROI >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {overallROI.toFixed(2)}%
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${overallROI >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {overallROI >= 0 ? (
                      <TrendingUp className={`h-6 w-6 text-green-600`} />
                    ) : (
                      <TrendingDown className={`h-6 w-6 text-red-600`} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/5 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Listado de Activos</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{assets.length} {assets.length === 1 ? 'activo registrado' : 'activos registrados'}</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {assets.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay activos registrados
              </p>
            ) : (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b-2">
                      <TableHead className="min-w-[150px] font-semibold">Nombre</TableHead>
                      <TableHead className="min-w-[140px] font-semibold">Tipo</TableHead>
                      <TableHead className="text-right min-w-[140px] font-semibold">Valor Adquisición</TableHead>
                      <TableHead className="text-right min-w-[120px] font-semibold">Valor Actual</TableHead>
                      <TableHead className="text-right min-w-[120px] font-semibold">ROI</TableHead>
                      <TableHead className="text-right min-w-[150px] font-semibold">Rentabilidad anual</TableHead>
                      <TableHead className="text-center min-w-[100px] font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => {
                      const { value: currentValue, date: latestDate } = getAssetValueForMonth(asset, selectedMonth);
                      // Para calcular ROI, usar el valor del mes seleccionado vs valor de adquisición
                      const acquisition = Number(asset.acquisitionValue ?? 0);
                      const roi = acquisition > 0 ? ((currentValue - acquisition) / acquisition) * 100 : 0;

                      // Para calcular rentabilidad anual: comparar con el valor del mismo mes hace un año
                      const lastYearRef = subYears(selectedMonth, 1);
                      const lastYearValue = getValueForMonth(asset, lastYearRef);

                      // calcular % anual
                      let annualPct: number | null = null;
                      if (lastYearValue != null && lastYearValue !== 0) {
                        annualPct = ((currentValue - lastYearValue) / lastYearValue) * 100;
                      } else {
                        annualPct = null; // no disponible o división por cero
                      }

                      return (
                        <TableRow key={asset.assetId} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-semibold">{asset.name}</TableCell>
                          <TableCell className="text-muted-foreground">{assetTypes.find(t => t.assetTypeId === asset.assetTypeId)?.name ?? `#${asset.assetTypeId}`}</TableCell>
                          <TableCell className="text-right font-medium text-muted-foreground">
                            {formatCurrency(asset.acquisitionValue)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {formatCurrency(currentValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`inline-flex items-center justify-end gap-1 px-2 py-1 rounded-md font-semibold ${
                                roi >= 0
                                  ? 'text-green-700 bg-green-50'
                                  : 'text-red-700 bg-red-50'
                              }`}
                            >
                              {roi >= 0 ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : (
                                <TrendingDown className="h-4 w-4" />
                              )}
                              {roi.toFixed(2)}%
                            </span>
                          </TableCell>

                          {/* Nueva columna: Rentabilidad anual */}
                          <TableCell className="text-right">
                            {annualPct == null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span
                                className={`inline-flex items-center justify-end gap-1 px-2 py-1 rounded-md font-semibold ${
                                  annualPct >= 0
                                    ? 'text-green-700 bg-green-50'
                                    : 'text-red-700 bg-red-50'
                                }`}
                              >
                                {annualPct >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                {annualPct.toFixed(2)}%
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAssetModal(asset)}
                                className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                title="Editar activo"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(asset)}
                                className="hover:bg-primary/10 hover:text-primary transition-colors"
                                title="Ver detalles"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setAssetToDelete(asset);
                                  setDeleteAssetDialogOpen(true);
                                }}
                                className="hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Eliminar activo"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
        <Dialog open={assetModalOpen} onOpenChange={setAssetModalOpen}>
          <DialogContent className="max-w-lg w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle>{editingAsset ? 'Editar activo' : 'Nuevo activo'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <Label>Nombre</Label>
              <Input value={assetForm.name} onChange={(e) => setAssetForm(f => ({ ...f, name: e.target.value }))} />
              <Label>Tipo de activo</Label>
              <select id="asset-type-select" className="h-9 text-sm border rounded px-2" defaultValue={editingAsset ? String(editingAsset.assetTypeId) : ''}>
                <option value="">Selecciona un tipo</option>
                {assetTypes.map(t => (
                  <option key={t.assetTypeId} value={t.assetTypeId}>{t.name}</option>
                ))}
              </select>
              <Label>Valor adquisición</Label>
              <Input type="number" value={String(assetForm.acquisitionValue)} onChange={(e) => setAssetForm(f => ({ ...f, acquisitionValue: Number(e.target.value || 0) }))} />
              {!editingAsset && (
                <>
                  <Label>Valor actual (para la valoración del mes)</Label>
                  <Input type="number" value={String(assetForm.currentValue)} onChange={(e) => setAssetForm(f => ({ ...f, currentValue: Number(e.target.value || 0) }))} />
                </>
              )}
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setAssetModalOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
                <Button onClick={saveAssetForMonth} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" /> 
                  {editingAsset ? 'Guardar cambios' : `Guardar y añadir valoración (${formatDate(selectedMonth, 'MMMM yyyy')})`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={valuationModalOpen} onOpenChange={setValuationModalOpen}>
          <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Añadir valoración de activos</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Fecha de valoración</Label>
                <Input
                  type="date"
                  value={valuationDate}
                  onChange={(e) => setValuationDate(e.target.value)}
                />
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Valores por activo:</p>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {assets.map(asset => (
                    <div key={asset.assetId} className="border rounded-lg p-4 space-y-3">
                      <h4 className="font-semibold">{asset.name}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label>Valor actual *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={assetValuations[asset.assetId]?.currentValue || ''}
                            onChange={(e) => setAssetValuations(prev => ({
                              ...prev,
                              [asset.assetId]: {
                                ...prev[asset.assetId],
                                currentValue: e.target.value,
                              }
                            }))}
                          />
                        </div>
                        <div>
                          <Label>Valor adquisición (opcional)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={assetValuations[asset.assetId]?.acquisitionValue || ''}
                            onChange={(e) => setAssetValuations(prev => ({
                              ...prev,
                              [asset.assetId]: {
                                ...prev[asset.assetId],
                                acquisitionValue: e.target.value,
                              }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                <Button variant="ghost" onClick={() => setValuationModalOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
                <Button onClick={saveValuations} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar valoraciones
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalles del Activo</DialogTitle>
            </DialogHeader>
            {selectedAssetRoi && selectedAssetData && (
              <Tabs defaultValue="performance" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="performance">Rendimiento</TabsTrigger>
                  <TabsTrigger value="transactions">Transacciones</TabsTrigger>
                </TabsList>
                <TabsContent value="performance" className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="text-lg font-semibold">{selectedAssetData.name}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                      <p className="text-lg font-semibold text-success">
                        {formatCurrency(selectedAssetRoi.totalIncome)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gastos Totales</p>
                      <p className="text-lg font-semibold text-destructive">
                        {formatCurrency(selectedAssetRoi.totalExpenses)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Beneficio Neto</p>
                      <p
                        className={`text-lg font-semibold ${
                          selectedAssetRoi.netProfit >= 0 ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {formatCurrency(selectedAssetRoi.netProfit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ROI %</p>
                      <p
                        className={`text-lg font-semibold ${
                          selectedAssetRoi.roiPercentage >= 0 ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {selectedAssetRoi.roiPercentage.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="transactions">
                  {assetTransactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No hay transacciones asociadas a este activo
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {/* Ingresos */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-success">Ingresos</h3>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead className="text-right">Importe</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {assetTransactions
                                .filter(t => String(t.type ?? '').toLowerCase() === 'income')
                                .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
                                .map(tx => (
                                  <TableRow key={tx.transactionId}>
                                    <TableCell>{format(parseISO(tx.transactionDate), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{getCategoryInfo(tx.categoryId)?.name ?? '—'}</TableCell>
                                    <TableCell className="max-w-xs truncate">{tx.description ?? '—'}</TableCell>
                                    <TableCell className="text-right">
                                      <span className="text-success">{formatCurrency(Math.abs(Number(tx.amount || 0)))}</span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Gastos */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-destructive">Gastos</h3>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead className="text-right">Importe</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {assetTransactions
                                .filter(t => String(t.type ?? '').toLowerCase() === 'expense')
                                .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
                                .map(tx => (
                                  <TableRow key={tx.transactionId}>
                                    <TableCell>{format(parseISO(tx.transactionDate), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{getCategoryInfo(tx.categoryId)?.name ?? '—'}</TableCell>
                                    <TableCell className="max-w-xs truncate">{tx.description ?? '—'}</TableCell>
                                    <TableCell className="text-right">
                                      <span className="text-destructive">-{formatCurrency(Math.abs(Number(tx.amount || 0)))}</span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
        <AlertDialog open={deleteAssetDialogOpen} onOpenChange={setDeleteAssetDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente el activo "{assetToDelete?.name}" y todos sus datos relacionados:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Todos los valores asociados</li>
                  <li>Todas las transacciones relacionadas</li>
                </ul>
                <strong className="text-destructive mt-2 block">Esta operación NO SE PUEDE DESHACER.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAsset}
                className="bg-red-600 hover:bg-red-700"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Assets;
