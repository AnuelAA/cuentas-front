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
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
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
      // Obtener todas las transacciones y ROI del activo sin límite de fechas
      // Usamos fechas muy amplias para obtener todo el historial
      const startDate = '2000-01-01';
      const endDate = '2099-12-31';
      
      const [roi, transactions] = await Promise.all([
        getAssetRoi(user.userId, asset.assetId, startDate, endDate),
        getTransactions(user.userId, startDate, endDate, asset.assetId)
      ]);
      
      console.log('Asset ROI:', roi);
      console.log('Asset Transactions:', transactions);
      
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
    }).format(value);
  };

  const calculateROI = (asset: Asset) => {
    if (!asset.acquisitionValue) return 0;
    return ((asset.currentValue - asset.acquisitionValue) / asset.acquisitionValue) * 100;
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
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => {
                      const roi = calculateROI(asset);
                      return (
                        <TableRow key={asset.assetId}>
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(asset.acquisitionValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(asset.currentValue)}
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
                          {assetTransactions.map((transaction) => {
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

export default Assets;
