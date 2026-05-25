import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '../lib/auth-context';
import { detailApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Calendar, MapPin, Clock, User, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function FieldVisitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisit();
  }, [id]);

  const loadVisit = async () => {
    if (!id || !accessToken) {
      setLoading(false);
      return;
    }

    try {
      const data = await detailApi.getFieldVisit(id, accessToken);
      setVisit(data);
    } catch (error: any) {
      console.error('Error loading field visit:', error);
      toast.error('Failed to load field visit details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-5xl mx-auto text-center py-12">Loading...</div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="p-8">
        <div className="max-w-5xl mx-auto text-center py-12">
          <p className="text-gray-500 mb-4">Field visit not found</p>
          <Button onClick={() => navigate('/field-visits')}>Back to Field Visits</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/field-visits')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Field Visits
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Field Visit Details</h1>
          <p className="text-gray-600 mt-2">{visit.field_visit_id || 'N/A'}</p>
        </div>

        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Visit Information</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Customer</label>
                <p className="text-gray-900 mt-1">{visit.customerName || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">District</label>
                <p className="text-gray-900 mt-1">{visit.districtName || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Arrival Date</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-900">{visit.arrival_date ? new Date(visit.arrival_date).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Departure Date</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-900">{visit.departure_date ? new Date(visit.departure_date).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Duration</label>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-900">{visit.visit_duration || '0'} hours</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">XC Representative</label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-900">{visit.xc_rep || 'N/A'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Customer Representative</label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-900">{visit.customer_rep || 'N/A'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Location</label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-900">{visit.field_or_facility || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visit Details */}
          <Card>
            <CardHeader>
              <CardTitle>Visit Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Visit Purpose</label>
                <p className="text-gray-900 mt-1">{visit.visit_purpose || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Pad Name</label>
                <p className="text-gray-900 mt-1">{visit.pad_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Operating Company</label>
                <p className="text-gray-900 mt-1">{visit.operating_company || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Coordinates</label>
                <p className="text-gray-900 mt-1">{visit.lat_long || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Equipment */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Communication Panel</label>
                <p className="text-gray-900 mt-1">{visit.communication_panel || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Digital Shooting Panel</label>
                <p className="text-gray-900 mt-1">{visit.digital_shooting_panel || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Surface Tester</label>
                <p className="text-gray-900 mt-1">{visit.surface_tester || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Visit Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Visit Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans">
                  {visit.visit_summary || 'No summary provided'}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
