import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAssets, getAssetPerformance } from '@/services/api';
import type { Asset, AssetPerformance } from '@/types/api';
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
import { TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { toast } from 'sonner';

const Assets: React.FC = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<AssetPerformance | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchAssets = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const data = await getAssets(user.id);
      setAssets(data);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Error al cargar los activos');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (assetId: number) => {
    if (!user?.id) return;
    
    try {
      const performance = await getAssetPerformance(user.id, assetId);
      setSelectedAsset(performance);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error fetching asset performance:', error);
      toast.error('Error al cargar los detalles del activo');
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [user]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
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
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor Adquisición</TableHead>
                      <TableHead className="text-right">Valor Actual</TableHead>
                      <TableHead className="text-right">Rentabilidad</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>{asset.type}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(asset.acquisitionValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(asset.currentValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              asset.profitability >= 0
                                ? 'text-success flex items-center justify-end gap-1'
                                : 'text-destructive flex items-center justify-end gap-1'
                            }
                          >
                            {asset.profitability >= 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {asset.profitability.toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(asset.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rendimiento del Activo</DialogTitle>
            </DialogHeader>
            {selectedAsset && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="text-lg font-semibold">{selectedAsset.assetName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Capital Invertido</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(selectedAsset.investedCapital)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(selectedAsset.totalValue)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Beneficio Absoluto</p>
                    <p
                      className={`text-lg font-semibold ${
                        selectedAsset.absoluteProfit >= 0 ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {formatCurrency(selectedAsset.absoluteProfit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rentabilidad</p>
                    <p
                      className={`text-lg font-semibold ${
                        selectedAsset.profitability >= 0 ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {selectedAsset.profitability.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Assets;
