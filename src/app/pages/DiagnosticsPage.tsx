import { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { AlertTriangle, CheckCircle, Copy, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

export default function DiagnosticsPage() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<any>(null);

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-64775d98`;

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/diagnose-row-id`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      const data = await response.json();
      setDiagnosis(data);
    } catch (error) {
      console.error('Diagnostic error:', error);
      toast.error('Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const generateFix = (tableName: string, dataType: string, columnDefault: string | null) => {
    if (dataType === 'text' || dataType === 'character varying') {
      return `-- Fix for ${tableName} table (text-based row_id)\nALTER TABLE ${tableName} \nALTER COLUMN row_id SET DEFAULT gen_random_uuid()::text;`;
    } else if (dataType === 'bigint' || dataType === 'integer') {
      if (columnDefault?.includes('nextval')) {
        return `-- ✅ ${tableName} already has auto-increment configured`;
      }
      return `-- Fix for ${tableName} table (numeric row_id)\nALTER TABLE ${tableName} \nALTER COLUMN row_id ADD GENERATED ALWAYS AS IDENTITY;`;
    } else if (dataType === 'uuid') {
      return `-- Fix for ${tableName} table (UUID row_id)\nALTER TABLE ${tableName} \nALTER COLUMN row_id SET DEFAULT gen_random_uuid();`;
    }
    return `-- Unknown data type for ${tableName}: ${dataType}`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-6 h-6" />
            Database Diagnostics - row_id Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              This diagnostic tool checks if your database tables have proper auto-generation configured for the <code className="bg-gray-100 px-2 py-1 rounded">row_id</code> column.
            </p>
            <Button onClick={runDiagnostics} disabled={loading}>
              {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
            </Button>
          </div>

          {diagnosis && (
            <div className="space-y-4">
              {diagnosis.message && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-yellow-900 mb-2">{diagnosis.message}</p>
                      <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm overflow-x-auto">
                        <pre>{diagnosis.sql}</pre>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => copyToClipboard(diagnosis.sql)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy SQL
                      </Button>
                      <p className="text-sm text-yellow-800 mt-3">
                        📋 <strong>Next Steps:</strong>
                        <br />
                        1. Copy the SQL above
                        <br />
                        2. Go to your Supabase Dashboard → SQL Editor
                        <br />
                        3. Run the query
                        <br />
                        4. Share the results here or with support
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {diagnosis.fallbackInstructions && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900 mb-2">
                        {diagnosis.fallbackInstructions.message}
                      </p>
                      <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm overflow-x-auto">
                        <pre>{diagnosis.fallbackInstructions.sql}</pre>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => copyToClipboard(diagnosis.fallbackInstructions.sql)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy SQL
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {diagnosis.diagnosis && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Diagnosis Results
                  </h3>
                  
                  {diagnosis.diagnosis.map((table: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">
                        Table: <code className="bg-gray-100 px-2 py-1 rounded">{table.table_name}</code>
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Data Type:</span>{' '}
                          <code className="bg-gray-100 px-2 py-1 rounded">{table.data_type}</code>
                        </div>
                        <div>
                          <span className="text-gray-600">Nullable:</span>{' '}
                          <span className={table.is_nullable === 'NO' ? 'text-red-600 font-semibold' : 'text-green-600'}>
                            {table.is_nullable}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">Default Value:</span>{' '}
                          {table.column_default ? (
                            <code className="bg-green-100 px-2 py-1 rounded text-green-800">{table.column_default}</code>
                          ) : (
                            <span className="bg-red-100 px-2 py-1 rounded text-red-800 font-semibold">❌ NULL (PROBLEM!)</span>
                          )}
                        </div>
                      </div>

                      {!table.column_default && (
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <p className="text-sm font-semibold text-red-900 mb-2">⚠️ Fix Required:</p>
                          <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs overflow-x-auto mb-2">
                            <pre>{generateFix(table.table_name, table.data_type, table.column_default)}</pre>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(generateFix(table.table_name, table.data_type, table.column_default))}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Fix SQL
                          </Button>
                        </div>
                      )}

                      {table.column_default && (
                        <div className="bg-green-50 border border-green-200 rounded p-3">
                          <p className="text-sm text-green-800">
                            ✅ This table is properly configured with auto-generation
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <p className="font-semibold text-blue-900 mb-2">📋 How to Apply the Fixes:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                      <li>Copy the SQL fix for each problematic table using the buttons above</li>
                      <li>Go to your <strong>Supabase Dashboard</strong></li>
                      <li>Navigate to <strong>SQL Editor</strong></li>
                      <li>Paste and run each SQL statement</li>
                      <li>Verify the fix by running diagnostics again</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
