import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAssets, getAssetRoi, getTransactions, getCategories } from '@/services/api';
import type { Asset, AssetRoi, Transaction, Category } from '@/types/api';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { format, parseISO, endOfMonth, subYears, isValid } from 'date-fns';
import { toast } from 'sonner';

const Assets: React.FC = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssetRoi, setSelectedAssetRoi] = useState<AssetRoi | null>(null);
  const [selectedAssetData, setSelectedAssetData] = useState<Asset | null>(null);
  const [assetTransactions, setAssetTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Obtiene el assetValue más reciente (valor + fecha)
  const getLatestAssetValue = (asset: Asset): { value: number; date: Date | null } => {
    if (!Array.isArray(asset.assetValues) || asset.assetValues.length === 0) {
      return { value: Number(asset.currentValue ?? 0), date: asset.currentValue ? new Date() : null };
    }
    const sorted = [...asset.assetValues]
      .map(av => ({ ...av, _date: parseISO(av.valuationDate) }))
      .filter(av => isValid(av._date))
      .sort((a, b) => b._date.getTime() - a._date.getTime());
    if (sorted.length === 0) return { value: Number(asset.currentValue ?? 0), date: null };
    return { value: Number(sorted[0].currentValue ?? 0), date: sorted[0]._date };
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
    if (!user?.userId) return;
    setLoading(true);
    try {
      const data = await getAssets(user.userId);
      setAssets(data);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Error al cargar los activos');
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
    fetchAssets();
    fetchCategories();
  }, [user]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(Number(value || 0));
  };

  // ROI usa el latest currentValue existente
  const calculateROI = (asset: Asset) => {
    const { value: current } = getLatestAssetValue(asset);
    const acquisition = Number(asset.acquisitionValue ?? 0);
    if (!acquisition) return 0;
    return ((current - acquisition) / acquisition) * 100;
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
          <h2 className="text-3xl font-bold tracking-tight">Activos</h2>
          <Button onClick={fetchAssets}>Actualizar</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Activos</CardTitle>
          </CardHeader>
          <CardContent>
            {assets.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay activos registrados
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Valor Adquisición</TableHead>
                      <TableHead className="text-right">Valor Actual</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                      <TableHead className="text-right">Rentabilidad anual</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => {
                      const { value: currentValue, date: latestDate } = getLatestAssetValue(asset);
                      const roi = calculateROI(asset);

                      // referencia para "este mes" = fecha del latest assetValue si existe, sino ahora
                      const refDate = latestDate ?? new Date();
                      const lastYearRef = subYears(refDate, 1);
                      const lastYearValue = getValueForMonth(asset, lastYearRef);

                      // calcular % anual
                      let annualPct: number | null = null;
                      if (lastYearValue != null && lastYearValue !== 0) {
                        annualPct = ((currentValue - lastYearValue) / lastYearValue) * 100;
                      } else {
                        annualPct = null; // no disponible o división por cero
                      }

                      return (
                        <TableRow key={asset.assetId}>
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(asset.acquisitionValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(currentValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                roi >= 0
                                  ? 'text-success flex items-center justify-end gap-1'
                                  : 'text-destructive flex items-center justify-end gap-1'
                              }
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
                                className={
                                  annualPct >= 0
                                    ? 'text-success flex items-center justify-end gap-1'
                                    : 'text-destructive flex items-center justify-end gap-1'
                                }
                              >
                                {annualPct >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                {annualPct.toFixed(2)}%
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(asset)}
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
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
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
      </div>
    </Layout>
  );
};

export default Assets;
