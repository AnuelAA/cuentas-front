import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getLiabilities, getLiabilityProgress } from '@/services/api';
import type { Liability, LiabilityProgress } from '@/types/api';
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
import { Eye } from 'lucide-react';
import { toast } from 'sonner';

const Liabilities: React.FC = () => {
  const { user } = useAuth();
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLiability, setSelectedLiability] = useState<LiabilityProgress | null>(null);
  const [selectedLiabilityName, setSelectedLiabilityName] = useState<string>('');
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

  const handleViewDetails = async (liability: Liability) => {
    if (!user?.userId) return;
    
    try {
      const progress = await getLiabilityProgress(user.userId, liability.liabilityId);
      setSelectedLiability(progress);
      setSelectedLiabilityName(liability.name);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error fetching liability progress:', error);
      toast.error('Error al cargar el progreso del pasivo');
    }
  };

  useEffect(() => {
    fetchLiabilities();
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
                      <TableHead>Descripción</TableHead>
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
                          <TableCell>{liability.description || '-'}</TableCell>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Progreso del Pasivo</DialogTitle>
            </DialogHeader>
            {selectedLiability && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="text-lg font-semibold">{selectedLiabilityName}</p>
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
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Liabilities;
