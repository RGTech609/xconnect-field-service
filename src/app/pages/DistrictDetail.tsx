import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '../lib/auth-context';
import { detailApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, MapPin, Phone, Mail, TrendingUp, AlertTriangle, Package, Clock, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export default function DistrictDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDistrict();
  }, [id]);

  const loadDistrict = async () => {
    if (!id || !accessToken) {
      setLoading(false);
      return;
    }

    try {
      const result = await detailApi.getDistrict(id, accessToken);
      setData(result);
    } catch (error: any) {
      console.error('Error loading district:', error);
      toast.error('Failed to load district details');
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
          <p className="text-gray-500 mb-4">District not found</p>
          <Button onClick={() => navigate('/customers')}>Back to Customers</Button>
        </div>
      </div>
    );
  }

  const { district, customerInfo, kpis } = data;
  const isSqm = user?.role === 'sqm';
  const customerNameParam = customerInfo?.customer
    ? `customerName=${encodeURIComponent(customerInfo.customer)}`
    : '';
  const districtNameParam = district?.customer_district
    ? `districtName=${encodeURIComponent(district.customer_district)}`
    : '';
  const linkQuery = [customerNameParam, districtNameParam].filter(Boolean).join('&');
  const linkBase = linkQuery ? `?${linkQuery}` : '';

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/customers')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>
          <div className="flex items-start gap-4">
            {customerInfo?.customer_logo && (
              <div className="bg-white dark:bg-gray-900 p-3 rounded-lg shadow-sm border">
                <img src={customerInfo.customer_logo} alt={customerInfo.customer} className="h-16 w-16 object-contain" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-6 h-6 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{district.customer_district}</h1>
              </div>
              <p className="text-gray-600 dark:text-gray-300">{customerInfo?.customer || 'Unknown Customer'}</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="text-gray-900 dark:text-gray-100 mt-1">{district.customer_address || 'No address provided'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Contact Person</label>
              <p className="text-gray-900 dark:text-gray-100 mt-1">{district.district_contact || 'No contact provided'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              {district.customer_phone_number ? (
                <a href={`tel:${district.customer_phone_number}`} className="flex items-center gap-2 text-blue-600 hover:underline mt-1">
                  <Phone className="w-4 h-4" />
                  {district.customer_phone_number}
                </a>
              ) : (
                <p className="text-gray-500 mt-1">No phone provided</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              {district.customer_email ? (
                <a href={`mailto:${district.customer_email}`} className="flex items-center gap-2 text-blue-600 hover:underline mt-1">
                  <Mail className="w-4 h-4" />
                  {district.customer_email}
                </a>
              ) : (
                <p className="text-gray-500 mt-1">No email provided</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className={`grid ${isSqm ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4 mb-6`}>
          <Link to={`/field-visits${linkBase}`} className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg">
            <Card className="hover:shadow-md hover:border-blue-300 transition-all cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Field Visits</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.visitCount}</p>
                    <p className="text-xs text-gray-500 mt-1">{kpis.totalVisitHours}h total • {kpis.avgVisitHours}h avg</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={`/incidents${linkBase}`} className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg">
            <Card className="hover:shadow-md hover:border-blue-300 transition-all cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Incidents</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.totalIncidents}</p>
                    <p className="text-xs text-gray-500 mt-1">{kpis.xcCausedYes} XC caused</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={`/panels${linkBase}`} className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg">
            <Card className="hover:shadow-md hover:border-blue-300 transition-all cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Panels</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.totalPanels}</p>
                    <p className="text-xs text-gray-500 mt-1">Total panels</p>
                  </div>
                  <Package className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {!isSqm && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Barrels Sold</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.totalBarrels.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Total barrels</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Additional Sales Metric */}
        {!isSqm && (
          <div className="grid md:grid-cols-1 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Stages Sold</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{kpis.totalStages.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Total stages</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Metrics */}
        {!isSqm && (
          <Card>
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
                      <span className="text-sm text-gray-600 dark:text-gray-300">XC Caused Incidents:</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {kpis.totalBarrels > 0 ? ((kpis.xcCausedYes / kpis.totalBarrels) * 10000).toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Percentage:</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{kpis.incidentsPerBarrelPct.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Incidents Per 1,000 Stages</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">XC Caused Incidents:</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {kpis.totalStages > 0 ? ((kpis.xcCausedYes / kpis.totalStages) * 1000).toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Percentage:</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{kpis.incidentsPerStagePct.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}