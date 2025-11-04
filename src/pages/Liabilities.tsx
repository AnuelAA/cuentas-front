import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getLiabilities, getLiabilityProgress, getTransactions, getCategories, getLiabilityTypes, createLiability, updateLiability, addLiabilitySnapshot, createLiabilityInterest, deleteLiability, getLiabilityInterests } from '@/services/api';
import type { Liability, LiabilityProgress, Transaction, Category, LiabilityType, Interest } from '@/types/api';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, Save, Plus, RefreshCw, CreditCard, AlertCircle, TrendingDown, DollarSign, Calendar, Trash2, Pencil } from 'lucide-react';
import { format, parseISO, isValid, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { MonthNavigator } from '@/components/MonthNavigator';
import { startOfMonth, format as formatDate, parseISO as parseISODate } from 'date-fns';

const Liabilities: React.FC = () => {
  const { user } = useAuth();
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [liabilityTypes, setLiabilityTypes] = useState<LiabilityType[]>([]);
  const [liabilityInterests, setLiabilityInterests] = useState<Record<number, Interest[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedLiability, setSelectedLiability] = useState<LiabilityProgress | null>(null);
  const [selectedLiabilityData, setSelectedLiabilityData] = useState<Liability | null>(null);
  const [liabilityTransactions, setLiabilityTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
    const [liabilityModalOpen, setLiabilityModalOpen] = useState(false);
    const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
    const [liabilityForm, setLiabilityForm] = useState<{ 
      name: string; 
      liabilityTypeId: number | null; 
      description: string; 
      principalAmount: number; 
      outstandingBalance: number;
      startDate: string;
      endDate: string;
    }>({
      name: '',
      liabilityTypeId: null,
      description: '',
      principalAmount: 0,
      outstandingBalance: 0,
      startDate: '',
      endDate: '',
    });
    const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);
    const [snapshotDate, setSnapshotDate] = useState<string>(formatDate(selectedMonth, 'yyyy-MM-01'));
    const [liabilitySnapshots, setLiabilitySnapshots] = useState<Record<number, { outstandingBalance: string; endDate?: string }>>({});
    const [deleteLiabilityDialogOpen, setDeleteLiabilityDialogOpen] = useState(false);
    const [liabilityToDelete, setLiabilityToDelete] = useState<Liability | null>(null);
    const [interestModalOpen, setInterestModalOpen] = useState(false);
    const [selectedLiabilityForInterest, setSelectedLiabilityForInterest] = useState<Liability | null>(null);
    const [interestForm, setInterestForm] = useState<{ type: 'fixed' | 'variable' | 'general'; annualRate: number; startDate: string }>({
      type: 'fixed',
      annualRate: 0,
      startDate: '',
    });
  // Calcular cuota mensual basada en el sistema de amortización francés
  const calculateMonthlyPayment = (
    principal: number,
    annualRate: number,
    startDate: string,
    endDate: string
  ): number | null => {
    if (!startDate || !endDate || principal <= 0 || annualRate < 0) return null;
    
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      if (!isValid(start) || !isValid(end) || end <= start) return null;

      // Calcular número exacto de meses entre dos fechas
      const startYear = start.getFullYear();
      const startMonth = start.getMonth();
      const endYear = end.getFullYear();
      const endMonth = end.getMonth();
      
      // Calcular diferencia en meses (número de pagos mensuales)
      // Si el préstamo empieza en junio y termina en diciembre del mismo año, son 7 pagos
      // Si empieza en junio de un año y termina en diciembre de otro, calculamos los meses completos
      const yearsDiff = endYear - startYear;
      const monthsDiff = endMonth - startMonth;
      const totalMonths = yearsDiff * 12 + monthsDiff;
      
      // Si la fecha de inicio es el primer día del mes y la de fin es el último día,
      // el número de meses es la diferencia exacta
      // En un préstamo, si empiezas a pagar el mes X y terminas el mes Y, pagas Y-X+1 meses
      // Pero si el cálculo debe ser preciso, usamos la diferencia exacta sin +1
      const months = Math.max(1, totalMonths);
      
      if (months <= 0) return null;
      
      const monthlyRate = annualRate / 100 / 12;

      if (monthlyRate === 0) {
        // Sin interés: cuota = principal / meses
        return principal / months;
      }

      // Fórmula de amortización francés: P * (r * (1 + r)^n) / ((1 + r)^n - 1)
      const factor = Math.pow(1 + monthlyRate, months);
      const monthlyPayment = principal * (monthlyRate * factor) / (factor - 1);
      
      return Math.round(monthlyPayment * 100) / 100; // Redondear a 2 decimales
    } catch {
      return null;
    }
  };

  // Helper: obtener el endDate del último valor registrado
  const getLatestEndDate = (liability: Liability): string | null => {
    if (!Array.isArray(liability.liabilityValues) || liability.liabilityValues.length === 0) {
      return null;
    }
    // Ordenar por valuationDate (más reciente primero) y tomar el primero
    const sorted = [...liability.liabilityValues]
      .map(v => ({ ...v, _date: parseISO(v.valuationDate) }))
      .filter(v => isValid(v._date))
      .sort((a, b) => b._date.getTime() - a._date.getTime());
    
    return sorted.length > 0 && sorted[0].endDate ? sorted[0].endDate : null;
  };

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
      
      // Cargar intereses para cada pasivo
      if (data && data.length > 0) {
        const interestsMap: Record<number, Interest[]> = {};
        await Promise.all(
          data.map(async (liability) => {
            try {
              const interests = await getLiabilityInterests(user.userId, liability.liabilityId);
              interestsMap[liability.liabilityId] = interests || [];
            } catch (error) {
              console.error(`Error fetching interests for liability ${liability.liabilityId}:`, error);
              interestsMap[liability.liabilityId] = [];
            }
          })
        );
        setLiabilityInterests(interestsMap);
      }
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

  const fetchLiabilityTypes = async () => {
    try {
      const data = await getLiabilityTypes();
      setLiabilityTypes(data);
    } catch (error) {
      console.error('Error fetching liability types:', error);
      toast.error('Error al cargar los tipos de pasivos');
    }
  };

  useEffect(() => {
    if (user?.userId) {
      fetchLiabilities();
      fetchCategories();
      fetchLiabilityTypes();
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
      const latestEndDate = liability ? getLatestEndDate(liability) : null;
      setLiabilityForm({
        name: liability?.name ?? '',
        liabilityTypeId: liability?.liabilityTypeId ?? null,
        description: liability?.description ?? '',
        principalAmount: Number(liability?.principalAmount ?? 0),
        outstandingBalance: Number(liability?.outstandingBalance ?? 0),
        startDate: liability?.startDate ?? '',
        endDate: latestEndDate ?? '',
      });
      setLiabilityModalOpen(true);
    };

    const saveLiabilityForMonth = async () => {
      if (!user?.userId) return;
      if (!liabilityForm.liabilityTypeId) {
        toast.error('Debes seleccionar un tipo de pasivo');
        return;
      }
      if (!liabilityForm.name.trim()) {
        toast.error('Debes introducir un nombre');
        return;
      }
      try {
        let saved: Liability;
        if (editingLiability) {
          saved = await updateLiability(user.userId, editingLiability.liabilityId, { 
            name: liabilityForm.name,
            liabilityTypeId: liabilityForm.liabilityTypeId,
            description: liabilityForm.description || undefined,
            principalAmount: liabilityForm.principalAmount,
            startDate: liabilityForm.startDate || undefined,
          });
          // Si se cambió endDate, actualizarlo en el valor más reciente
          const currentLatestEndDate = getLatestEndDate(saved);
          let endDateUpdated = false;
          if (liabilityForm.endDate && liabilityForm.endDate !== currentLatestEndDate) {
            const latestSnapshot = getLiabilitySnapshotForMonth(saved, selectedMonth);
            await addLiabilitySnapshot(user.userId, saved.liabilityId, {
              valuationDate: latestSnapshot.valuationDate 
                ? format(latestSnapshot.valuationDate, 'yyyy-MM-dd')
                : formatDate(selectedMonth, 'yyyy-MM-01'),
              outstandingBalance: latestSnapshot.outstandingBalance,
              endDate: liabilityForm.endDate,
            });
            endDateUpdated = true;
          }
          toast.success(endDateUpdated ? 'Pasivo y fecha fin actualizados correctamente' : 'Pasivo actualizado correctamente');
        } else {
          saved = await createLiability(user.userId, { 
            name: liabilityForm.name,
            liabilityTypeId: liabilityForm.liabilityTypeId,
            description: liabilityForm.description || undefined,
            principalAmount: liabilityForm.principalAmount,
            startDate: liabilityForm.startDate || undefined,
          });
          // endDate se guarda en el snapshot, no en el pasivo
          await addLiabilitySnapshot(user.userId, saved.liabilityId, {
            valuationDate: formatDate(selectedMonth, 'yyyy-MM-01'),
            outstandingBalance: liabilityForm.outstandingBalance,
            endDate: liabilityForm.endDate || undefined,
          });
          toast.success('Pasivo guardado y registro del mes añadido');
        }
        setLiabilityModalOpen(false);
        fetchLiabilities();
      } catch (err) {
        console.error(err);
        toast.error('Error guardando pasivo');
      }
    };

    const handleDeleteLiability = async () => {
      if (!user?.userId || !liabilityToDelete) return;
      try {
        await deleteLiability(user.userId, liabilityToDelete.liabilityId);
        toast.success('Pasivo eliminado correctamente');
        setDeleteLiabilityDialogOpen(false);
        setLiabilityToDelete(null);
        fetchLiabilities();
      } catch (err) {
        console.error(err);
        toast.error('Error eliminando pasivo');
      }
    };

    const handleSaveInterest = async () => {
      if (!user?.userId || !selectedLiabilityForInterest) return;
      if (!interestForm.startDate) {
        toast.error('Debes introducir una fecha de inicio');
        return;
      }
      try {
        const payload = {
          type: interestForm.type,
          annualRate: interestForm.annualRate, // Se envía siempre, incluso si es 0
          startDate: interestForm.startDate,
        };
        console.log('Enviando payload de interés:', payload); // Debug
        await createLiabilityInterest(user.userId, selectedLiabilityForInterest.liabilityId, payload);
        // Recargar intereses para este pasivo
        const updatedInterests = await getLiabilityInterests(user.userId, selectedLiabilityForInterest.liabilityId);
        setLiabilityInterests(prev => ({
          ...prev,
          [selectedLiabilityForInterest.liabilityId]: updatedInterests || []
        }));
        toast.success('Interés registrado correctamente');
        setInterestModalOpen(false);
        setSelectedLiabilityForInterest(null);
        setInterestForm({ type: 'fixed', annualRate: 0, startDate: '' });
      } catch (err) {
        console.error(err);
        toast.error('Error registrando interés');
      }
    };

    const saveSnapshots = async () => {
      if (!user?.userId) return;
      try {
        const promises: Promise<any>[] = [];
        let count = 0;
        
        for (const [liabilityIdStr, snapshot] of Object.entries(liabilitySnapshots)) {
          const liabilityId = Number(liabilityIdStr);
          const outstandingBalance = Number(snapshot.outstandingBalance || 0);
          
          if (outstandingBalance > 0) {
            const payload: { valuationDate: string; outstandingBalance: number; endDate?: string } = {
              valuationDate: snapshotDate,
              outstandingBalance: outstandingBalance,
            };
            
            if (snapshot.endDate) {
              payload.endDate = snapshot.endDate;
            }
            
            promises.push(addLiabilitySnapshot(user.userId, liabilityId, payload));
            count++;
          }
        }

        if (promises.length === 0) {
          toast.error('Debes añadir al menos un valor');
          return;
        }

        await Promise.all(promises);
        toast.success(`${count} registro${count > 1 ? 's' : ''} añadido${count > 1 ? 's' : ''} correctamente`);
        setSnapshotModalOpen(false);
        setLiabilitySnapshots({});
        fetchLiabilities();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Error guardando registros');
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
                <Button 
                  onClick={() => {
                    setSnapshotDate(formatDate(selectedMonth, 'yyyy-MM-01'));
                    setLiabilitySnapshots({});
                    setSnapshotModalOpen(true);
                  }}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Añadir registro
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
                    <p className="text-sm font-medium text-orange-700/80 mb-1">Importe Total</p>
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
                      <TableHead className="min-w-[120px] font-semibold">Tipo</TableHead>
                      <TableHead className="text-right min-w-[120px] font-semibold">Capital inicial</TableHead>
                      <TableHead className="text-right min-w-[120px] font-semibold">Saldo pendiente</TableHead>
                      <TableHead className="min-w-[140px] font-semibold">Interés</TableHead>
                      <TableHead className="text-right min-w-[100px] font-semibold">Cuota</TableHead>
                      <TableHead className="text-right min-w-[140px] font-semibold">Última fecha registrada</TableHead>
                      <TableHead className="text-center min-w-[200px] font-semibold">Progreso</TableHead>
                      <TableHead className="text-center min-w-[100px] font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liabilities.map(l => {
                      const snapshot = getLiabilitySnapshotForMonth(l, selectedMonth);
                      const progress = calculateProgress(l);
                      const liabilityType = liabilityTypes.find(t => t.liabilityTypeId === l.liabilityTypeId);
                      const interests = liabilityInterests[l.liabilityId] || [];
                      const activeInterest = interests.length > 0 ? interests[0] : null; // Usamos el primero (normalmente solo hay uno)
                      const annualRate = activeInterest?.annualRate ?? 0;
                      const latestEndDate = getLatestEndDate(l);
                      const endDateForCalculation = latestEndDate || (snapshot.endDate ? format(snapshot.endDate, 'yyyy-MM-dd') : null);
                      // Calcular cuota usando el saldo pendiente actual y los meses restantes
                      // La cuota se calcula desde la fecha de referencia (mes seleccionado) hasta la fecha fin
                      const monthlyPayment = l.startDate && endDateForCalculation && annualRate !== undefined && snapshot.outstandingBalance > 0
                        ? calculateMonthlyPayment(snapshot.outstandingBalance, annualRate, format(selectedMonth, 'yyyy-MM-dd'), endDateForCalculation)
                        : null;
                      const interestTypeLabel = activeInterest 
                        ? (annualRate === 0 ? 'Sin interés' : `${annualRate.toFixed(2)}% ${activeInterest.type === 'fixed' ? 'Fijo' : activeInterest.type === 'variable' ? 'Variable' : 'General'}`)
                        : 'No registrado';
                      return (
                        <TableRow key={l.liabilityId} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-semibold">{l.name}</TableCell>
                          <TableCell className="font-medium text-muted-foreground">
                            {liabilityType?.name ?? `Tipo ${l.liabilityTypeId}`}
                          </TableCell>
                          <TableCell className="text-right font-medium text-orange-700">{formatCurrency(Number(l.principalAmount ?? 0))}</TableCell>
                          <TableCell className="text-right font-semibold text-red-700">{formatCurrency(snapshot.outstandingBalance)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col gap-1 flex-1">
                                <span className="text-sm font-medium">{interestTypeLabel}</span>
                                {activeInterest && annualRate > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {activeInterest.startDate ? format(parseISO(activeInterest.startDate), 'dd/MM/yyyy') : ''}
                                    {activeInterest.startDate && latestEndDate ? ' - ' : ''}
                                    {latestEndDate ? format(parseISO(latestEndDate), 'dd/MM/yyyy') : ''}
                                  </span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs shrink-0"
                                onClick={() => {
                                  setSelectedLiabilityForInterest(l);
                                  const existingInterest = liabilityInterests[l.liabilityId]?.[0];
                                  setInterestForm({ 
                                    type: existingInterest?.type || 'fixed', 
                                    annualRate: existingInterest?.annualRate || 0, 
                                    startDate: existingInterest?.startDate || l.startDate || formatDate(new Date(), 'yyyy-MM-dd') 
                                  });
                                  setInterestModalOpen(true);
                                }}
                              >
                                <DollarSign className="h-3 w-3 mr-1" />
                                Interés
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {monthlyPayment !== null ? (
                              formatCurrency(monthlyPayment)
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                {!latestEndDate ? 'Falta fecha fin' : !l.startDate ? 'Falta fecha inicio' : !activeInterest ? 'Sin interés' : '—'}
                              </span>
                            )}
                          </TableCell>
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
                            <div className="flex items-center justify-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => openLiabilityModal(l)}
                                className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                title="Editar pasivo"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleViewDetails(l)}
                                className="hover:bg-orange-50 hover:text-orange-600 transition-colors"
                                title="Ver detalles"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  setLiabilityToDelete(l);
                                  setDeleteLiabilityDialogOpen(true);
                                }}
                                className="hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Eliminar pasivo"
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
        <Dialog open={liabilityModalOpen} onOpenChange={setLiabilityModalOpen}>
          <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLiability ? 'Editar pasivo' : 'Nuevo pasivo'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="liabilityName">Nombre *</Label>
                <Input 
                  id="liabilityName"
                  value={liabilityForm.name} 
                  onChange={(e) => setLiabilityForm(f => ({ ...f, name: e.target.value }))} 
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="liabilityType">Tipo de pasivo *</Label>
                <Select
                  value={liabilityForm.liabilityTypeId ? String(liabilityForm.liabilityTypeId) : ''}
                  onValueChange={(value) => setLiabilityForm(f => ({ ...f, liabilityTypeId: parseInt(value) }))}
                >
                  <SelectTrigger id="liabilityType">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {liabilityTypes.map(type => (
                      <SelectItem key={type.liabilityTypeId} value={String(type.liabilityTypeId)}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="liabilityDescription">Descripción</Label>
                <Textarea
                  id="liabilityDescription"
                  value={liabilityForm.description}
                  onChange={(e) => setLiabilityForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Descripción opcional del pasivo"
                />
              </div>
              <div>
                <Label htmlFor="liabilityPrincipal">Capital inicial del préstamo</Label>
                <Input 
                  id="liabilityPrincipal"
                  type="number" 
                  step="0.01"
                  value={String(liabilityForm.principalAmount)} 
                  onChange={(e) => setLiabilityForm(f => ({ ...f, principalAmount: Number(e.target.value || 0) }))} 
                />
              </div>
              {!editingLiability && (
                <div>
                  <Label htmlFor="liabilityOutstandingBalance">Saldo pendiente (para registro del mes)</Label>
                  <Input 
                    id="liabilityOutstandingBalance"
                    type="number" 
                    step="0.01"
                    value={String(liabilityForm.outstandingBalance)} 
                    onChange={(e) => setLiabilityForm(f => ({ ...f, outstandingBalance: Number(e.target.value || 0) }))} 
                  />
                </div>
              )}
              <div>
                <Label htmlFor="liabilityStartDate">Fecha de inicio</Label>
                <Input 
                  id="liabilityStartDate"
                  type="date" 
                  value={liabilityForm.startDate} 
                  onChange={(e) => setLiabilityForm(f => ({ ...f, startDate: e.target.value }))} 
                />
              </div>
              <div>
                <Label htmlFor="liabilityEndDate">Fecha de fin *</Label>
                <Input 
                  id="liabilityEndDate"
                  type="date" 
                  value={liabilityForm.endDate} 
                  onChange={(e) => setLiabilityForm(f => ({ ...f, endDate: e.target.value }))} 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Necesaria para calcular la cuota mensual
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setLiabilityModalOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
                {!editingLiability && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (liabilityForm.name.trim() && liabilityForm.liabilityTypeId) {
                        // Guardar primero, luego abrir modal de interés
                        saveLiabilityForMonth().then(() => {
                          // Buscar el pasivo recién creado para abrir el modal de interés
                          setTimeout(() => {
                            fetchLiabilities().then(() => {
                              const newLiability = liabilities.find(l => l.name === liabilityForm.name);
                              if (newLiability) {
                                setSelectedLiabilityForInterest(newLiability);
                                setInterestForm({ type: 'fixed', annualRate: 0, startDate: liabilityForm.startDate || formatDate(new Date(), 'yyyy-MM-dd') });
                                setInterestModalOpen(true);
                              }
                            });
                          }, 500);
                        });
                      }
                    }}
                    className="w-full sm:w-auto"
                    disabled={!liabilityForm.liabilityTypeId || !liabilityForm.name.trim()}
                  >
                    Guardar y añadir interés
                  </Button>
                )}
                <Button 
                  onClick={saveLiabilityForMonth} 
                  className="w-full sm:w-auto"
                  disabled={!liabilityForm.liabilityTypeId || !liabilityForm.name.trim()}
                >
                  <Save className="h-4 w-4 mr-2" /> {editingLiability ? 'Guardar cambios' : `Guardar y añadir registro del mes (${formatDate(selectedMonth, 'MMMM yyyy')})`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={snapshotModalOpen} onOpenChange={setSnapshotModalOpen}>
          <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Añadir registro de pasivos</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Fecha de registro</Label>
                <Input
                  type="date"
                  value={snapshotDate}
                  onChange={(e) => setSnapshotDate(e.target.value)}
                />
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Valores por pasivo:</p>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {liabilities.map(liability => (
                    <div key={liability.liabilityId} className="border rounded-lg p-4 space-y-3">
                      <h4 className="font-semibold">{liability.name}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label>Saldo pendiente *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={liabilitySnapshots[liability.liabilityId]?.outstandingBalance || ''}
                            onChange={(e) => setLiabilitySnapshots(prev => ({
                              ...prev,
                              [liability.liabilityId]: {
                                ...prev[liability.liabilityId],
                                outstandingBalance: e.target.value,
                              }
                            }))}
                          />
                        </div>
                        <div>
                          <Label>Fecha fin (opcional)</Label>
                          <Input
                            type="date"
                            value={liabilitySnapshots[liability.liabilityId]?.endDate || ''}
                            onChange={(e) => setLiabilitySnapshots(prev => ({
                              ...prev,
                              [liability.liabilityId]: {
                                ...prev[liability.liabilityId],
                                endDate: e.target.value,
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
                <Button variant="ghost" onClick={() => setSnapshotModalOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
                <Button onClick={saveSnapshots} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar registros
                </Button>
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
                      <p className="text-sm text-muted-foreground">Importe Total Pagado</p>
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
        <AlertDialog open={deleteLiabilityDialogOpen} onOpenChange={setDeleteLiabilityDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente el pasivo "{liabilityToDelete?.name}" y todos sus datos relacionados:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Todos los valores asociados</li>
                  <li>Todos los intereses asociados</li>
                  <li>Todo el historial de intereses</li>
                  <li>Todas las transacciones relacionadas</li>
                </ul>
                <strong className="text-destructive mt-2 block">Esta operación NO SE PUEDE DESHACER.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteLiability}
                className="bg-red-600 hover:bg-red-700"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Dialog open={interestModalOpen} onOpenChange={setInterestModalOpen}>
          <DialogContent className="max-w-lg w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle>Registrar interés - {selectedLiabilityForInterest?.name}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label htmlFor="interestType">Tipo de interés</Label>
                <Select
                  value={interestForm.type}
                  onValueChange={(value: 'fixed' | 'variable' | 'general') => setInterestForm(f => ({ ...f, type: value }))}
                >
                  <SelectTrigger id="interestType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fijo</SelectItem>
                    <SelectItem value="variable">Variable</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="interestAnnualRate">Tasa anual (%)</Label>
                <Input 
                  id="interestAnnualRate"
                  type="number" 
                  step="0.01"
                  placeholder="2.5"
                  value={String(interestForm.annualRate)} 
                  onChange={(e) => {
                    const value = e.target.value;
                    setInterestForm(f => ({ ...f, annualRate: value ? Number(value) : 0 }));
                  }} 
                />
                <p className="text-xs text-muted-foreground mt-1">Ejemplo: 2.5 para 2.5% anual, o 0 para sin interés</p>
              </div>
              <div>
                <Label htmlFor="interestStartDate">Fecha de inicio *</Label>
                <Input 
                  id="interestStartDate"
                  type="date" 
                  value={interestForm.startDate} 
                  onChange={(e) => setInterestForm(f => ({ ...f, startDate: e.target.value }))} 
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => {
                  setInterestModalOpen(false);
                  setSelectedLiabilityForInterest(null);
                  setInterestForm({ type: 'fixed', annualRate: 0, startDate: '' });
                }} className="w-full sm:w-auto">Cancelar</Button>
                <Button 
                  onClick={handleSaveInterest} 
                  className="w-full sm:w-auto"
                  disabled={!interestForm.startDate}
                >
                  <Save className="h-4 w-4 mr-2" /> Guardar interés
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Liabilities;
