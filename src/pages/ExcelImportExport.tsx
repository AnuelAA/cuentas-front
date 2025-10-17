import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { importExcel, exportExcel } from '@/services/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const ExcelImportExport: React.FC = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.userId) { toast.error('Usuario no autenticado'); return; }
    if (!file) { toast.error('Selecciona un fichero .xlsx'); return; }

    setLoading(true);
    try {
      await importExcel(user.userId, file, Number(year));
      toast.success('Fichero subido e importado correctamente');
      setFile(null);
    } catch (err) {
      console.error('Error importando excel:', err);
      toast.error('Error al importar el fichero');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!user?.userId) { toast.error('Usuario no autenticado'); return; }
    setExporting(true);
    try {
      const { blob, filename } = await exportExcel(user.userId, Number(year));
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export descargado');
    } catch (err) {
      console.error('Error exportando excel:', err);
      toast.error('Error al exportar el fichero');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Excel - Importar / Exportar</h2>

        <Card>
          <CardHeader>
            <CardTitle>Subir archivo .xlsx</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Fichero Excel</Label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0];
                    setFile(f ?? null);
                  }}
                />
                {file && <div className="text-sm text-muted-foreground">{file.name}</div>}
              </div>

              <div className="space-y-2">
                <Label>Año (opcional)</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min={2000}
                  max={2100}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Subiendo...' : 'Subir e Importar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setFile(null); setYear(String(new Date().getFullYear())); }}>
                  Limpiar
                </Button>
                <Button type="button" onClick={handleExport} disabled={exporting}>
                  {exporting ? 'Generando...' : 'Exportar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ExcelImportExport;