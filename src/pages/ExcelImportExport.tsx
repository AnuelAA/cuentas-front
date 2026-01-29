import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { importExcel, exportExcel, exportDatabase } from '@/services/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, FileSpreadsheet, Calendar, X, Database } from 'lucide-react';
import { toast } from 'sonner';

const ExcelImportExport: React.FC = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingDatabase, setExportingDatabase] = useState(false);

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

  const handleExportDatabase = async () => {
    if (!user?.userId) { toast.error('Usuario no autenticado'); return; }
    setExportingDatabase(true);
    try {
      const { blob, filename } = await exportDatabase(user.userId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Base de datos exportada correctamente');
    } catch (err: any) {
      console.error('Error exportando base de datos:', err);
      const errorMessage = err?.message || 'Error al exportar la base de datos';
      toast.error(errorMessage);
    } finally {
      setExportingDatabase(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 px-2 sm:px-0">
        {/* Header mejorado */}
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Excel - Importar / Exportar
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Gestiona tus datos financieros mediante archivos Excel</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Card de Importar */}
          <Card className="border-blue-100 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-50/50 border-b border-blue-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-blue-900">Importar desde Excel</CardTitle>
                  <p className="text-sm text-blue-700/70 mt-0.5">Sube un archivo .xlsx o .xls</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Fichero Excel</Label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        setFile(f ?? null);
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer bg-blue-50/50 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileSpreadsheet className="w-10 h-10 mb-3 text-blue-500" />
                        <p className="mb-2 text-sm text-blue-700">
                          <span className="font-semibold">Haz clic para subir</span> o arrastra el archivo
                        </p>
                        <p className="text-xs text-blue-600">Excel (.xlsx, .xls)</p>
                      </div>
                    </label>
                  </div>
                  {file && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                      <span className="flex-1 text-sm font-medium text-blue-900">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFile(null)}
                        className="h-6 w-6 p-0 hover:bg-blue-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Año (opcional)
                  </Label>
                  <Input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    min={2000}
                    max={2100}
                    className="text-lg"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button 
                    type="submit" 
                    disabled={loading || !file}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Subiendo e importando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Subir e Importar
                      </>
                    )}
                  </Button>
                  {file && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => { setFile(null); setYear(String(new Date().getFullYear())); }}
                      className="w-full"
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Card de Exportar */}
          <Card className="border-green-100 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-50/50 border-b border-green-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
                  <Download className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-green-900">Exportar a Excel</CardTitle>
                  <p className="text-sm text-green-700/70 mt-0.5">Descarga tus datos en formato Excel</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Año
                  </Label>
                  <Input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    min={2000}
                    max={2100}
                    className="text-lg"
                  />
                </div>

                <div className="pt-2">
                  <Button 
                    onClick={handleExport} 
                    disabled={exporting}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md"
                  >
                    {exporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Generando archivo...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar a Excel
                      </>
                    )}
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    El archivo exportado incluirá todas tus transacciones, activos y pasivos del año seleccionado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card de Exportar Base de Datos */}
        <Card className="border-purple-100 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-50/50 border-b border-purple-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-purple-900">Exportar Base de Datos</CardTitle>
                <p className="text-sm text-purple-700/70 mt-0.5">Descarga un archivo .txt con todo el DDL y los datos</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="pt-2">
                <Button 
                  onClick={handleExportDatabase} 
                  disabled={exportingDatabase}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md"
                >
                  {exportingDatabase ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Exportando base de datos...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Descargar Exportación de Base de Datos
                    </>
                  )}
                </Button>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Descarga un archivo .txt con todo el DDL (CREATE TABLE statements) y todos los INSERTs de tu base de datos filtrados por tu usuario. 
                  El archivo puede ser grande si tienes muchos datos, por lo que la descarga puede tardar unos momentos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ExcelImportExport;