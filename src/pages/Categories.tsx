import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getCategories, createCategory, updateCategory, deleteCategory, reassignCategoryTransactions, getTransactions } from '@/services/api';
import type { Category } from '@/types/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderOpen, FolderPlus, Edit2, Trash2, Plus, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface CategoryTree extends Category {
  children: CategoryTree[];
}

const Categories: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  
  // Form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [reassignToCategoryId, setReassignToCategoryId] = useState<number | null>(null);
  const [transactionCount, setTransactionCount] = useState(0);

  useEffect(() => {
    fetchCategories();
    fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
    if (!user?.userId) return;
    try {
      const data = await getTransactions(user.userId);
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  useEffect(() => {
    if (categories.length > 0) {
      buildTree();
    }
  }, [categories]);

  const fetchCategories = async () => {
    if (!user?.userId) return;
    setLoading(true);
    try {
      const data = await getCategories(user.userId);
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryFirstDate = (categoryId: number): string | null => {
    // Get first transaction date for this category
    const categoryTransactions = transactions.filter(t => t.categoryId === categoryId);
    if (categoryTransactions.length > 0) {
      const sorted = [...categoryTransactions].sort((a, b) => 
        new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
      );
      return sorted[0].transactionDate;
    }
    return null;
  };

  const buildTree = () => {
    // Sort categories by name
    const sortedCategories = [...categories].sort((a, b) => 
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    );
    const roots = sortedCategories.filter(c => c.parentCategoryId === null || c.parentCategoryId === undefined);
    const tree = roots.map(root => buildNode(root));
    // Sort tree by name
    tree.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    setCategoryTree(tree);
  };

  const buildNode = (category: Category): CategoryTree => {
    const children = categories
      .filter(c => c.parentCategoryId === category.categoryId)
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
      .map(child => buildNode(child));
    return { ...category, children };
  };

  const toggleExpand = (categoryId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleCreateCategory = async () => {
    if (!user?.userId || !newCategoryName.trim()) {
      toast.error('El nombre de la categoría es obligatorio');
      return;
    }

    try {
      await createCategory(user.userId, {
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
        parentCategoryId: newCategoryParentId,
      });
      toast.success('Categoría creada correctamente');
      setCreateDialogOpen(false);
      setNewCategoryName('');
      setNewCategoryDescription('');
      setNewCategoryParentId(null);
      fetchCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Error al crear la categoría');
    }
  };

  const handleUpdateCategory = async () => {
    if (!user?.userId || !editingCategory) return;

    try {
      await updateCategory(user.userId, editingCategory.categoryId, {
        name: editingCategory.name,
        description: editingCategory.description,
        parentCategoryId: editingCategory.parentCategoryId,
      });
      toast.success('Categoría actualizada correctamente');
      setEditDialogOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Error al actualizar la categoría');
    }
  };

  const handleDeleteCategory = async () => {
    if (!user?.userId || !deletingCategory) return;

    try {
      await deleteCategory(user.userId, deletingCategory.categoryId);
      toast.success('Categoría eliminada correctamente');
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      
      // Check if error is 409 (Conflict - has transactions)
      if (error.response?.status === 409) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || '';
        // Extract transaction count from error message
        const match = errorMessage.match(/(\d+) transacciones/i) || errorMessage.match(/(\d+) transactions/i);
        const count = match ? parseInt(match[1]) : 0;
        
        setTransactionCount(count);
        setDeleteDialogOpen(false);
        setReassignDialogOpen(true);
      } else {
        toast.error('Error al eliminar la categoría');
      }
    }
  };

  const handleReassignAndDelete = async () => {
    if (!user?.userId || !deletingCategory || !reassignToCategoryId) {
      toast.error('Debes seleccionar una categoría destino');
      return;
    }

    try {
      // First, reassign transactions
      await reassignCategoryTransactions(user.userId, deletingCategory.categoryId, reassignToCategoryId);
      
      // Then, delete the category
      await deleteCategory(user.userId, deletingCategory.categoryId);
      
      toast.success(`Categoría eliminada y ${transactionCount} transacciones reasignadas`);
      setReassignDialogOpen(false);
      setDeletingCategory(null);
      setReassignToCategoryId(null);
      setTransactionCount(0);
      fetchCategories();
    } catch (error) {
      console.error('Error reassigning transactions:', error);
      toast.error('Error al reasignar las transacciones');
    }
  };

  const renderCategoryNode = (node: CategoryTree, level: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedCategories.has(node.categoryId);
    const indent = level * 24;

    return (
      <div key={node.categoryId} className="mb-1">
        <div
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
          style={{ paddingLeft: `${indent + 8}px` }}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => toggleExpand(node.categoryId)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="w-6" />
          )}
          
          <FolderOpen className="h-5 w-5 text-primary" />
          
          <button
            onClick={() => navigate(`/categories/${node.categoryId}`)}
            className="flex-1 text-left font-medium hover:text-primary transition-colors"
          >
            {node.name}
          </button>
          
          <span className="text-sm text-muted-foreground hidden md:block">
            {(() => {
              const firstTransactionDate = getCategoryFirstDate(node.categoryId);
              if (firstTransactionDate) {
                try {
                  return `Primera transacción: ${format(parseISO(firstTransactionDate), 'dd/MM/yyyy')}`;
                } catch {
                  return `Primera transacción: ${firstTransactionDate}`;
                }
              } else if (node.createdAt) {
                try {
                  return `Creada: ${format(parseISO(node.createdAt), 'dd/MM/yyyy')}`;
                } catch {
                  return `Creada: ${node.createdAt}`;
                }
              }
              return '';
            })()}
          </span>
          
          {node.description && (
            <span className="text-sm text-muted-foreground hidden lg:block">
              {node.description}
            </span>
          )}
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => navigate(`/categories/${node.categoryId}`)}
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                setNewCategoryParentId(node.categoryId);
                setCreateDialogOpen(true);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                setEditingCategory(node);
                setEditDialogOpen(true);
              }}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setDeletingCategory(node);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {node.children.map(child => renderCategoryNode(child, level + 1))}
          </div>
        )}
      </div>
    );
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
      <div className="space-y-6 max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Categorías
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona las categorías de tus transacciones
            </p>
          </div>
          <Button
            onClick={() => {
              setNewCategoryParentId(null);
              setCreateDialogOpen(true);
            }}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Crear Grupo
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Estructura de Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryTree.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No hay categorías creadas</p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Crear primera categoría
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {categoryTree.map(node => renderCategoryNode(node))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={createDialogOpen || editDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditDialogOpen(false);
            setEditingCategory(null);
            setNewCategoryName('');
            setNewCategoryDescription('');
            setNewCategoryParentId(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editDialogOpen ? 'Editar Categoría' : 'Crear Categoría'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={editDialogOpen ? editingCategory?.name || '' : newCategoryName}
                  onChange={(e) => {
                    if (editDialogOpen && editingCategory) {
                      setEditingCategory({ ...editingCategory, name: e.target.value });
                    } else {
                      setNewCategoryName(e.target.value);
                    }
                  }}
                  placeholder="Nombre de la categoría"
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={editDialogOpen ? editingCategory?.description || '' : newCategoryDescription}
                  onChange={(e) => {
                    if (editDialogOpen && editingCategory) {
                      setEditingCategory({ ...editingCategory, description: e.target.value });
                    } else {
                      setNewCategoryDescription(e.target.value);
                    }
                  }}
                  placeholder="Descripción (opcional)"
                />
              </div>
              <div>
                <Label htmlFor="parent">Categoría Padre</Label>
                <Select
                  value={editDialogOpen 
                    ? (editingCategory?.parentCategoryId?.toString() || 'none')
                    : (newCategoryParentId?.toString() || 'none')
                  }
                  onValueChange={(value) => {
                    const parentId = value === 'none' ? null : parseInt(value);
                    if (editDialogOpen && editingCategory) {
                      setEditingCategory({ ...editingCategory, parentCategoryId: parentId });
                    } else {
                      setNewCategoryParentId(parentId);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin padre (categoría raíz)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin padre (categoría raíz)</SelectItem>
                    {categories
                      .filter(c => !editingCategory || c.categoryId !== editingCategory.categoryId)
                      .map(c => (
                        <SelectItem key={c.categoryId} value={c.categoryId.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setEditDialogOpen(false);
                  setEditingCategory(null);
                  setNewCategoryName('');
                  setNewCategoryDescription('');
                  setNewCategoryParentId(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={editDialogOpen ? handleUpdateCategory : handleCreateCategory}>
                {editDialogOpen ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará la categoría "{deletingCategory?.name}".
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingCategory(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reassign Transactions Dialog */}
        <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reasignar Transacciones</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                La categoría "{deletingCategory?.name}" tiene {transactionCount} transacciones asociadas.
                Selecciona una categoría para reasignarlas antes de eliminar:
              </p>
              <div>
                <Label htmlFor="reassign-category">Categoría destino *</Label>
                <Select
                  value={reassignToCategoryId?.toString() || ''}
                  onValueChange={(value) => setReassignToCategoryId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(c => c.categoryId !== deletingCategory?.categoryId)
                      .map(c => (
                        <SelectItem key={c.categoryId} value={c.categoryId.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setReassignDialogOpen(false);
                  setDeletingCategory(null);
                  setReassignToCategoryId(null);
                  setTransactionCount(0);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleReassignAndDelete} className="bg-destructive hover:bg-destructive/90">
                Reasignar y Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Categories;

