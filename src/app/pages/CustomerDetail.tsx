import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '../lib/auth-context';
import { detailApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Building2, MapPin, TrendingUp, AlertTriangle, Package, Clock, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    if (!id || !accessToken) {
      setLoading(false);
      return;
    }

    try {
      const result = await detailApi.getCustomer(id, accessToken);
      setData(result);
    } catch (error: any) {
      console.error('Error loading customer:', error);
      toast.error('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8"><div className="max-w-6xl mx-auto text-center py-12">Loading...</div></div>;
  }

  if (!data) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto text-center py-12">
          <p className="text-gray-500 mb-4">Customer not found</p>
          <Button onClick={() => navigate('/customers')}>Back to Customers</Button>
        </div>
      </div>
    );
  }

  const { customer, districts, kpis } = data;

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/customers')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>
          <div className="flex items-start gap-4">
            {customer.customer_logo && (
              <div className="bg-white p-3 rounded-lg shadow-sm border">
                <img src={customer.customer_logo} alt={customer.customer} className="h-20 w-20 object-contain" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{customer.customer}</h1>
              <p className="text-gray-600 mt-2">{districts?.length || 0} Districts</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Field Visits</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis.visitCount}</p>
                  <p className="text-xs text-gray-500 mt-1">{kpis.totalVisitHours}h total • {kpis.avgVisitHours}h avg</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Incidents</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis.totalIncidents}</p>
                  <p className="text-xs text-gray-500 mt-1">{kpis.xcCausedYes} XC caused</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Panels</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis.totalPanels}</p>
                  <p className="text-xs text-gray-500 mt-1">Total panels</p>
                </div>
                <Package className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Barrels Sold</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis.totalBarrels.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Total barrels</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Sales Metric */}
        <div className="grid md:grid-cols-1 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Stages Sold</p>
                  <p className="text-2xl font-bold text-gray-900">{kpis.totalStages.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Total stages</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Incidents Per 10,000 Barrels</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">XC Caused Incidents:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {kpis.totalBarrels > 0 ? ((kpis.xcCausedYes / kpis.totalBarrels) * 10000).toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Percentage:</span>
                    <span className="text-lg font-bold text-gray-900">{kpis.incidentsPerBarrelPct.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Incidents Per 1,000 Stages</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">XC Caused Incidents:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {kpis.totalStages > 0 ? ((kpis.xcCausedYes / kpis.totalStages) * 1000).toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Percentage:</span>
                    <span className="text-lg font-bold text-gray-900">{kpis.incidentsPerStagePct.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Districts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Districts ({districts?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!districts || districts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No districts found</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {districts.map((district: any) => (
                  <Link
                    key={district.row_id}
                    to={`/districts/${district.row_id}`}
                    className="block border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <h3 className="font-semibold text-gray-900">{district.customer_district}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{district.customer_address || 'No address'}</p>
                    {district.district_contact && (
                      <p className="text-sm text-gray-500 mt-2">{district.district_contact}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}