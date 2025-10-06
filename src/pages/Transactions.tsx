import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  getCategories,
} from '@/services/api';
import type { Transaction, Category, CreateTransactionRequest } from '@/types/api';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Transactions: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  // New transaction form
  const [newTransaction, setNewTransaction] = useState<CreateTransactionRequest>({
    amount: 0,
    description: '',
    transactionDate: format(new Date(), 'yyyy-MM-dd'),
  });

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
      const categoriesData = await getCategories(user.userId);
      setCategories(categoriesData);
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

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.userId) return;
    
    try {
      await createTransaction(user.userId, newTransaction);
      toast.success('Transacción creada exitosamente');
      setDialogOpen(false);
      setNewTransaction({
        amount: 0,
        description: '',
        transactionDate: format(new Date(), 'yyyy-MM-dd'),
      });
      fetchTransactions();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Error al crear la transacción');
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!user?.userId) return;
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta transacción?')) return;
    
    try {
      await deleteTransaction(user.userId, transactionId);
      toast.success('Transacción eliminada');
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Error al eliminar la transacción');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const getCategoryName = (categoryId?: number) => {
    const category = categories.find(c => c.categoryId === categoryId);
    return category?.name || '-';
  };

  const filteredTransactions = transactions.filter((transaction) => {
    if (filterCategory && transaction.categoryId?.toString() !== filterCategory) return false;
    return true;
  });

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
          <h2 className="text-3xl font-bold tracking-tight">Transacciones</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Transacción
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Transacción</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTransaction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Cantidad</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={newTransaction.amount}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    value={newTransaction.description}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, description: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transactionDate">Fecha</Label>
                  <Input
                    id="transactionDate"
                    type="date"
                    value={newTransaction.transactionDate}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, transactionDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría (opcional)</Label>
                  <Select
                    value={newTransaction.categoryId?.toString() || ''}
                    onValueChange={(value) =>
                      setNewTransaction({
                        ...newTransaction,
                        categoryId: value ? parseInt(value) : undefined,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.categoryId} value={category.categoryId.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Crear Transacción
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.categoryId} value={category.categoryId.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Todas las Transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay transacciones que coincidan con los filtros seleccionados
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
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.transactionId}>
                        <TableCell>{format(new Date(transaction.transactionDate), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="font-medium">{transaction.description}</TableCell>
                        <TableCell>{getCategoryName(transaction.categoryId)}</TableCell>
                        <TableCell className={`text-right font-semibold ${
                          transaction.amount >= 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTransaction(transaction.transactionId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
      </div>
    </Layout>
  );
};

export default Transactions;
