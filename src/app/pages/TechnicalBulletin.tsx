import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { FileText, Download, Plus, X, Upload, Image as ImageIcon, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { generateTechnicalBulletinPDF } from '../lib/generateTechnicalBulletinPDF';
import { supabase } from '../lib/supabase';

const SEVERITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low', 'Information'] as const;
const PRODUCT_OPTIONS = [
  'mRAIL', 'XC 2.75"', 'XC', 'DSX', 'RAIL', 'LynX',
  'ReConnect', 'Haptix', 'XC Oriented', 'XFire', 'All Products'
];
const ROLE_OPTIONS = ['Service Quality Rep', 'District Rep', 'Sales Rep', 'Executive Management'] as const;
const PART_OPTIONS = [
  'Detonator', 'Charge', 'Gun Body', 'Tandem Sub', 'Bulkhead', 
  'Initiator', 'Seal/O-Ring', 'Circuit Board', 'Booster', 
  'Connector', 'Housing', 'Wire/Cable', 'Switch', 'Battery',
  'Sensor', 'Other'
];

const LS_BULLETIN_FILES = 'xc_bulletin_files';
const getBulletinFileStore = (): Record<string, { url: string; label: string }> => {
  try { return JSON.parse(localStorage.getItem(LS_BULLETIN_FILES) || '{}'); } catch { return {}; }
};

export default function TechnicalBulletin() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bulletinNumber, setBulletinNumber] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [severity, setSeverity] = useState<'Critical' | 'High' | 'Medium' | 'Low' | 'Information'>('Information');
  const [affectedProducts, setAffectedProducts] = useState<string[]>([]);
  const [affectedParts, setAffectedParts] = useState<string[]>([]);
  const [availableParts, setAvailableParts] = useState<string[]>([]);
  const [loadingParts, setLoadingParts] = useState(true);
  const [distributionList, setDistributionList] = useState('');
  const [summary, setSummary] = useState('');
  const [background, setBackground] = useState('');
  const [technicalDetails, setTechnicalDetails] = useState('');
  const [recommendedActions, setRecommendedActions] = useState<string[]>(['']);
  const [roleTypes, setRoleTypes] = useState<string[]>([]);
  const [customerFileUrl,   setCustomerFileUrl]   = useState('');
  const [customerFileLabel, setCustomerFileLabel] = useState('');
  const [images, setImages] = useState<Array<{ url: string; caption: string }>>([]);
  const [problemImages, setProblemImages] = useState<Array<{ url: string; caption: string }>>([]);
  const [fixImages, setFixImages] = useState<Array<{ url: string; caption: string }>>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEditMode = id && id !== 'new';

  // Load existing bulletin if editing
  useEffect(() => {
    if (isEditMode) {
      loadBulletin();
    }
  }, [id]);

  const loadBulletin = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('technical_bulletins')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error loading bulletin:', error);
      toast.error('Failed to load bulletin');
      navigate('/technical-bulletins');
    } else if (data) {
      setBulletinNumber(data.bulletin_number);
      setTitle(data.title);
      setDate(data.date);
      setSeverity(data.severity);
      setAffectedProducts(data.affected_products || []);
      setAffectedParts(data.affected_parts || []);
      setDistributionList(data.distribution_list?.join(', ') || '');
      setSummary(data.summary);
      setBackground(data.background || '');
      setTechnicalDetails(data.technical_details);
      setRecommendedActions(data.recommended_actions || ['']);
      setRoleTypes(data.role_types || []);
      setProblemImages(data.problem_images || []);
      setFixImages(data.fix_images || []);
      // customer file link is stored in localStorage keyed by bulletin id
      const fileEntry = getBulletinFileStore()[data.id] || {};
      setCustomerFileUrl(fileEntry.url || '');
      setCustomerFileLabel(fileEntry.label || '');
    }
    setLoading(false);
  };

  const toggleProduct = (product: string) => {
    setAffectedProducts(prev =>
      prev.includes(product)
        ? prev.filter(p => p !== product)
        : [...prev, product]
    );
  };

  const togglePart = (part: string) => {
    setAffectedParts(prev =>
      prev.includes(part)
        ? prev.filter(p => p !== part)
        : [...prev, part]
    );
  };

  const addAction = () => {
    setRecommendedActions([...recommendedActions, '']);
  };

  const updateAction = (index: number, value: string) => {
    const updated = [...recommendedActions];
    updated[index] = value;
    setRecommendedActions(updated);
  };

  const removeAction = (index: number) => {
    setRecommendedActions(recommendedActions.filter((_, i) => i !== index));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages(prev => [...prev, { url: event.target!.result as string, caption: '' }]);
          toast.success(`${file.name} added successfully`);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  const updateImageCaption = (index: number, caption: string) => {
    setImages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], caption };
      return updated;
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleProblemImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProblemImages(prev => [...prev, { url: event.target!.result as string, caption: '' }]);
          toast.success(`${file.name} added successfully`);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const updateProblemImageCaption = (index: number, caption: string) => {
    setProblemImages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], caption };
      return updated;
    });
  };

  const removeProblemImage = (index: number) => {
    setProblemImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleFixImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFixImages(prev => [...prev, { url: event.target!.result as string, caption: '' }]);
          toast.success(`${file.name} added successfully`);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const updateFixImageCaption = (index: number, caption: string) => {
    setFixImages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], caption };
      return updated;
    });
  };

  const removeFixImage = (index: number) => {
    setFixImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGeneratePDF = async (compact = false) => {
    if (!bulletinNumber.trim() || !title.trim() || !summary.trim() || !technicalDetails.trim()) {
      toast.error('Please fill out all required fields');
      return;
    }

    setGenerating(true);
    try {
      await generateTechnicalBulletinPDF({
        bulletinNumber: bulletinNumber.trim(),
        title: title.trim(),
        date,
        severity,
        affectedProducts: affectedProducts.length > 0 ? affectedProducts : ['All Products'],
        failedParts: affectedParts.length > 0 ? affectedParts : undefined,
        distributionList: distributionList.trim() ? distributionList.split(',').map(s => s.trim()) : undefined,
        summary: summary.trim(),
        background: background.trim() || undefined,
        technicalDetails: technicalDetails.trim(),
        recommendedActions: recommendedActions.filter(a => a.trim()),
        roleType: roleTypes.length > 0 ? roleTypes : undefined,
        customerFileUrl:   customerFileUrl.trim()   || undefined,
        customerFileLabel: customerFileLabel.trim() || undefined,
        problemImages: problemImages.length > 0 ? problemImages : undefined,
        fixImages: fixImages.length > 0 ? fixImages : undefined,
        compact,
        returnBlob: false,
      });
      toast.success(`${compact ? 'Compact' : 'Standard'} PDF generated successfully!`);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!bulletinNumber.trim()) {
      toast.error('Please enter a bulletin number');
      return;
    }
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!summary.trim()) {
      toast.error('Please enter a summary');
      return;
    }
    if (!technicalDetails.trim()) {
      toast.error('Please enter technical details');
      return;
    }
    if (recommendedActions.filter(a => a.trim()).length === 0) {
      toast.error('Please add at least one recommended action');
      return;
    }

    setSaving(true);
    const bulletinData = {
      bulletin_number: bulletinNumber.trim(),
      title: title.trim(),
      date,
      severity,
      affected_products: affectedProducts,
      affected_parts: affectedParts,
      distribution_list: distributionList.trim() ? distributionList.split(',').map(s => s.trim()) : [],
      summary: summary.trim(),
      background: background.trim() || null,
      technical_details: technicalDetails.trim(),
      recommended_actions: recommendedActions.filter(a => a.trim()),
      role_types: roleTypes,
      problem_images: problemImages,
      fix_images: fixImages,
      updated_at: new Date().toISOString(),
    };

    let error, data;
    if (isEditMode) {
      // Update existing bulletin
      ({ error, data } = await supabase
        .from('technical_bulletins')
        .update(bulletinData)
        .eq('id', id)
        .select()
        .single());
    } else {
      // Create new bulletin
      ({ error, data } = await supabase
        .from('technical_bulletins')
        .insert({
          ...bulletinData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single());
    }

    setSaving(false);

    if (error) {
      console.error('Error saving bulletin:', error);
      if ((error as any).code === '42501') {
        toast.error(
          'Row-Level Security is blocking saves. Run this in Supabase SQL Editor: ALTER TABLE technical_bulletins DISABLE ROW LEVEL SECURITY;',
          { duration: 12000 }
        );
      } else {
        toast.error(`Failed to save bulletin: ${error.message || 'Unknown error'}`);
      }
    } else {
      // Persist customer file link to localStorage (no DB column needed)
      const savedId = data?.id || id;
      if (savedId) {
        const store = getBulletinFileStore();
        store[savedId] = { url: customerFileUrl.trim(), label: customerFileLabel.trim() };
        localStorage.setItem(LS_BULLETIN_FILES, JSON.stringify(store));
      }
      toast.success(isEditMode ? 'Bulletin updated successfully!' : 'Bulletin created successfully!');
      if (!isEditMode && data) {
        navigate(`/technical-bulletin/${data.id}/edit`);
      }
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      case 'Information': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  useEffect(() => {
    const fetchParts = async () => {
      const { data, error } = await supabase
        .from('lists')
        .select('failed_component')
        .not('failed_component', 'is', null)
        .order('failed_component', { ascending: true });

      if (error) {
        console.error('Error fetching parts:', error);
        toast.error('Failed to load parts from database');
        setLoadingParts(false);
        return;
      }

      if (data) {
        // Extract unique component names and filter out null/empty values
        const components = data
          .map(part => part.failed_component)
          .filter(component => component && component.trim())
          .filter((component, index, self) => self.indexOf(component) === index); // Remove duplicates
        
        setAvailableParts(components);
        setLoadingParts(false);
      }
    };

    fetchParts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/technical-bulletins')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to List
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {loading ? 'Loading...' : isEditMode ? 'Edit Technical Bulletin' : 'Create Technical Bulletin'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isEditMode ? 'Update and manage your technical bulletin' : 'Create professional technical bulletins for customer distribution'}
              </p>
            </div>
          </div>
          <FileText className="w-12 h-12 text-blue-600" />
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Loading bulletin data...
            </CardContent>
          </Card>
        ) : (
          <>
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Bulletin Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bulletinNumber">Bulletin Number *</Label>
                <Input
                  id="bulletinNumber"
                  placeholder="e.g., 2024-001"
                  value={bulletinNumber}
                  onChange={(e) => setBulletinNumber(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="title">Title/Subject *</Label>
              <Input
                id="title"
                placeholder="e.g., Critical Safety Update for XFire Panels"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Severity */}
            <div>
              <Label>Severity Level *</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {SEVERITY_OPTIONS.map(sev => (
                  <Badge
                    key={sev}
                    className={`cursor-pointer ${
                      severity === sev
                        ? getSeverityColor(sev) + ' border-2'
                        : 'bg-gray-100 text-gray-600 border border-gray-300'
                    }`}
                    onClick={() => setSeverity(sev)}
                  >
                    {sev}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Affected Products */}
            <div>
              <Label>Affected Products</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {PRODUCT_OPTIONS.map(product => (
                  <Badge
                    key={product}
                    className={`cursor-pointer ${
                      affectedProducts.includes(product)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 border border-gray-300'
                    }`}
                    onClick={() => toggleProduct(product)}
                  >
                    {product}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {affectedProducts.length === 0 ? 'No products selected (will default to "All Products")' : `${affectedProducts.length} selected`}
              </p>
            </div>

            {/* Affected Parts */}
            <div>
              <Label htmlFor="affectedParts">Affected Parts</Label>
              {loadingParts ? (
                <p className="text-sm text-gray-500 mt-2">Loading parts...</p>
              ) : (
                <>
                  <select
                    id="affectedParts"
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      const selectedPart = e.target.value;
                      if (selectedPart && !affectedParts.includes(selectedPart)) {
                        setAffectedParts([...affectedParts, selectedPart]);
                      }
                      e.target.value = '';
                    }}
                  >
                    <option value="">Select an affected part...</option>
                    {availableParts.map(part => (
                      <option key={part} value={part}>{part}</option>
                    ))}
                  </select>
                  {affectedParts.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {affectedParts.map(part => (
                        <Badge
                          key={part}
                          className="bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
                          onClick={() => togglePart(part)}
                        >
                          {part}
                          <X className="w-3 h-3 ml-1 inline" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {affectedParts.length === 0 ? 'No parts selected' : `${affectedParts.length} selected`}
              </p>
            </div>

            {/* Distribution List */}
            <div>
              <Label htmlFor="distributionList">Distribution List (optional)</Label>
              <Input
                id="distributionList"
                placeholder="e.g., West Texas District, Permian Basin, All Customers"
                value={distributionList}
                onChange={(e) => setDistributionList(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated list of recipients/districts</p>
            </div>

            {/* Customer File Download Link */}
            <div>
              <Label>Customer Download Link (optional)</Label>
              <div className="grid grid-cols-3 gap-3 mt-1">
                <div className="col-span-1">
                  <Input
                    id="customerFileLabel"
                    placeholder="e.g., Download Firmware v189"
                    value={customerFileLabel}
                    onChange={(e) => setCustomerFileLabel(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Link label shown on PDF</p>
                </div>
                <div className="col-span-2">
                  <Input
                    id="customerFileUrl"
                    type="url"
                    placeholder="https://example.com/file.pdf"
                    value={customerFileUrl}
                    onChange={(e) => setCustomerFileUrl(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">URL (printed below the label)</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div>
              <Label htmlFor="summary">Summary *</Label>
              <Textarea
                id="summary"
                rows={3}
                placeholder="Brief overview of the bulletin purpose and key takeaways..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>

            {/* Background */}
            <div>
              <Label htmlFor="background">Background (optional)</Label>
              <Textarea
                id="background"
                rows={3}
                placeholder="Context or history that led to this bulletin..."
                value={background}
                onChange={(e) => setBackground(e.target.value)}
              />
            </div>

            {/* Technical Details */}
            <div>
              <Label htmlFor="technicalDetails">Technical Details *</Label>
              <Textarea
                id="technicalDetails"
                rows={5}
                placeholder="Detailed technical information, analysis, specifications, or findings..."
                value={technicalDetails}
                onChange={(e) => setTechnicalDetails(e.target.value)}
              />
            </div>

            {/* Recommended Actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Recommended Actions *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAction}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Action
                </Button>
              </div>
              <div className="space-y-2">
                {recommendedActions.map((action, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Action ${index + 1}...`}
                      value={action}
                      onChange={(e) => updateAction(index, e.target.value)}
                    />
                    {recommendedActions.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAction(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Role Type */}
            <div>
              <Label className="text-base font-semibold">Role Type (optional)</Label>
              <p className="text-xs text-gray-500 mb-3">Select the role type for the bulletin contact</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {ROLE_OPTIONS.map(role => (
                  <Badge
                    key={role}
                    className={`cursor-pointer ${
                      roleTypes.includes(role)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 border border-gray-300'
                    }`}
                    onClick={() => {
                      if (roleTypes.includes(role)) {
                        setRoleTypes(roleTypes.filter(r => r !== role));
                      } else {
                        setRoleTypes([...roleTypes, role]);
                      }
                    }}
                  >
                    {role}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Problem/Failure Images */}
            <div>
              <Label className="text-base font-semibold">Problem/Failure Images (optional)</Label>
              <p className="text-xs text-gray-500 mb-3">Upload images showing the failure or concern</p>
              
              <label htmlFor="problem-image-upload">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('problem-image-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Upload Problem Images
                </Button>
              </label>
              <input
                id="problem-image-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleProblemImageUpload}
              />
              
              {problemImages.length > 0 && (
                <div className="space-y-3 mt-4">
                  {problemImages.map((image, index) => (
                    <div key={index} className="border border-red-200 bg-red-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <img 
                          src={image.url} 
                          alt={`Problem ${index + 1}`}
                          className="w-20 h-20 object-cover rounded border border-red-300"
                        />
                        <div className="flex-1">
                          <Input
                            placeholder={`Caption for problem image ${index + 1} (optional)...`}
                            value={image.caption}
                            onChange={(e) => updateProblemImageCaption(index, e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeProblemImage(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fix/Solution Images */}
            <div>
              <Label className="text-base font-semibold">Fix/Solution Images (optional)</Label>
              <p className="text-xs text-gray-500 mb-3">Upload images showing the fix or solution</p>
              
              <label htmlFor="fix-image-upload">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('fix-image-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Upload Fix Images
                </Button>
              </label>
              <input
                id="fix-image-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFixImageUpload}
              />
              
              {fixImages.length > 0 && (
                <div className="space-y-3 mt-4">
                  {fixImages.map((image, index) => (
                    <div key={index} className="border border-green-200 bg-green-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <img 
                          src={image.url} 
                          alt={`Fix ${index + 1}`}
                          className="w-20 h-20 object-cover rounded border border-green-300"
                        />
                        <div className="flex-1">
                          <Input
                            placeholder={`Caption for fix image ${index + 1} (optional)...`}
                            value={image.caption}
                            onChange={(e) => updateFixImageCaption(index, e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeFixImage(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="pt-4 border-t space-y-2">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Export PDF</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleGeneratePDF(false)}
                  disabled={generating}
                  size="lg"
                  variant="outline"
                  className="w-full border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white"
                >
                  {generating ? (
                    <>Generating…</>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Standard (Multi-page)
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleGeneratePDF(true)}
                  disabled={generating}
                  size="lg"
                  className="w-full bg-gray-900 hover:bg-gray-700 text-white"
                >
                  {generating ? (
                    <>Generating…</>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Compact (One-page)
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-400">Compact mode targets a single page — tighter spacing, side-panel image, condensed layout.</p>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving}
                size="lg"
                className="w-full"
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    {isEditMode ? 'Update Bulletin' : 'Save Bulletin'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Preview Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Bulletin:</span>
                <span className="font-mono">TB-{bulletinNumber || '___'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Severity:</span>
                <Badge className={getSeverityColor(severity)}>{severity}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Products:</span>
                <span>{affectedProducts.length > 0 ? affectedProducts.length : 'All'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Actions:</span>
                <span>{recommendedActions.filter(a => a.trim()).length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
          </>
        )}
      </div>
    </div>
  );
}