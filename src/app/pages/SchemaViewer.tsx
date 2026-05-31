import { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Database, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

export default function SchemaViewer() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<any>(null);
  const [rawData, setRawData] = useState<any>(null);

  const fetchSchema = async () => {
    if (!accessToken) {
      toast.error('Please log in first');
      return;
    }

    setLoading(true);

    try {
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-64775d98`;
      
      const response = await fetch(`${baseUrl}/schema`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      const data = await response.json();
      
      if (response.ok) {
        setSchema(data);
        setRawData(JSON.stringify(data, null, 2));
        toast.success('Schema loaded successfully!');
      } else {
        toast.error('Failed to load schema: ' + (data.error || 'Unknown error'));
        setRawData(JSON.stringify(data, null, 2));
      }
    } catch (error: any) {
      console.error('Error fetching schema:', error);
      toast.error('Failed to fetch schema: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Database Schema Viewer</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            View your actual Supabase database tables, columns, types, and relationships
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Load Database Schema</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={fetchSchema} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Loading Schema...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Fetch Database Schema
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {schema && (
          <>
            {/* All Tables from pg_catalog */}
            {schema.allTables && schema.allTables.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>All Tables in Database ({schema.allTables.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {schema.allTables.map((tableName: string) => (
                      <Badge 
                        key={tableName} 
                        variant={schema.tables.includes(tableName) ? "default" : "outline"} 
                        className="text-sm"
                      >
                        {tableName}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-4">
                    Highlighted tables have data accessible through the API
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Tables with Sample Data */}
            {schema.tables && schema.tables.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Accessible Tables ({schema.tables.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {schema.tables.map((tableName: string) => (
                      <div key={tableName} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-3">{tableName}</h3>
                        
                        {/* Columns */}
                        {schema.columns[tableName] && (
                          <div className="mb-4">
                            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-200 mb-2">Columns:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {schema.columns[tableName].map((col: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <Badge variant="outline">{col.name}</Badge>
                                  <span className="text-gray-600 dark:text-gray-300">{col.type}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sample Data */}
                        {schema.samples[tableName] && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-200 mb-2">Sample Row:</h4>
                            <pre className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded text-xs overflow-auto">
                              {JSON.stringify(schema.samples[tableName], null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Raw Data Display */}
        {rawData && (
          <Card>
            <CardHeader>
              <CardTitle>Raw Schema Data (JSON)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 font-mono text-sm">
                <pre>{rawData}</pre>
              </div>
            </CardContent>
          </Card>
        )}

        {!schema && !loading && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Click the button above to load your database schema</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}