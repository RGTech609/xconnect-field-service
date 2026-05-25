import {
  loadJsPDF, drawHeader, drawFooters, drawSectionHeading, drawWatermark,
  XC_GREEN, XC_DARK, XC_BORDER, WHITE, GRAY_TEXT,
  MARGIN, CONT_W, PAGE_H, PAGE_W,
} from './pdfUtils';

export interface ReportData {
  customerName: string;
  districtName?: string;
  timeFilter: string;
  generatedAt: string;
  totalVisits: number;
  totalHours: number;
  avgHours: number | string;
  totalBarrels: number;
  totalStages: number;
  totalPanels: number;
  totalIncidents: number; 
  xcCaused: number;       
  openIncidents: number;
  panelBreakdown?: { type: string; count: number }[];
  visitPurposeBreakdown?: { purpose: string; count: number }[];
}

export async function generateReportPDF(data: ReportData): Promise<void> {
  const doc = await loadJsPDF();
  
  // ── PAGE 1: PREMIUM COVER PAGE ──
  const coverH = drawHeader(doc);
  drawWatermark(doc);
  
  doc.setFont('helvetica', 'bold'); doc.setFontSize(36); doc.setTextColor(...XC_DARK);
  doc.text('Executive', MARGIN, coverH + 60);
  doc.text('Performance Summary', MARGIN, coverH + 75);
  
  doc.setFillColor(...XC_GREEN);
  doc.rect(MARGIN, coverH + 85, 20, 2, 'F');
  
  doc.setFontSize(16); doc.setTextColor(...GRAY_TEXT);
  doc.text(`Prepared for:`, MARGIN, coverH + 110);
  doc.setFontSize(24); doc.setTextColor(...XC_DARK);
  doc.text(data.customerName || 'All Customers', MARGIN, coverH + 120);
  
  if (data.districtName) {
    doc.setFontSize(14); doc.setTextColor(...GRAY_TEXT);
    doc.text(`District: ${data.districtName}`, MARGIN, coverH + 130);
  }

  doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(...GRAY_TEXT);
  doc.text(`Reporting Period: ${data.timeFilter.replace('_', ' ').toUpperCase()}`, MARGIN, PAGE_H - 40);
  doc.text(`Generated on: ${new Date(data.generatedAt).toLocaleDateString()}`, MARGIN, PAGE_H - 32);

  // ── PAGE 2: DATA DASHBOARD ──
  doc.addPage();
  let y = drawHeader(doc, "Performance Analytics") + 10;
  drawWatermark(doc);

  const checkPage = (needed: number) => {
    if (y + needed > PAGE_H - 15) { 
      doc.addPage(); 
      y = drawHeader(doc, "Performance Analytics") + 10;
      drawWatermark(doc);
    }
  };

  y = drawSectionHeading(doc, 'Core Performance Metrics', y);
  
  const barrelsPerIncident = data.xcCaused > 0 ? Math.round(data.totalBarrels / data.xcCaused) : data.totalBarrels;
  const stagesPerIncident = data.xcCaused > 0 ? Math.round(data.totalStages / data.xcCaused) : data.totalStages;

  const cards = [
    { label: 'Field Activity', value: data.totalVisits, sub: `${data.totalHours.toLocaleString()} Total Hrs (${data.avgHours} avg)`, color: XC_GREEN },
    { label: 'Production Volume', value: `${data.totalBarrels.toLocaleString()} bbls`, sub: `${data.totalStages.toLocaleString()} Stages Completed`, color: [37, 99, 235] },
    { label: 'Hardware Reliability', value: `${data.xcCaused} Incidents`, sub: `${data.totalIncidents} Total Investigations`, color: [220, 38, 38] },
    { label: 'Operational Efficiency', value: `${stagesPerIncident.toLocaleString()}:1`, sub: `Stages per XC Incident`, color: [14, 165, 119] },
  ];

  const cardW = (CONT_W - 5) / 2;
  cards.forEach((card, i) => {
    const cx = MARGIN + (i % 2) * (cardW + 5);
    const cy = y + Math.floor(i / 2) * 30;
    doc.setFillColor(255, 255, 255); doc.setDrawColor(...XC_BORDER);
    doc.roundedRect(cx, cy, cardW, 26, 1, 1, 'FD');
    doc.setFillColor(...card.color as [number,number,number]); doc.rect(cx, cy, 2, 26, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...GRAY_TEXT);
    doc.text(card.label.toUpperCase(), cx + 6, cy + 7);
    doc.setFontSize(14); doc.setTextColor(...XC_DARK);
    doc.text(String(card.value), cx + 6, cy + 15);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY_TEXT);
    doc.text(card.sub, cx + 6, cy + 21);
  });
  y += 75;

  // ── BREAKDOWNS (WITH ZEBRA STRIPING) ──
  if (data.visitPurposeBreakdown?.length) {
    checkPage(60);
    y = drawSectionHeading(doc, 'Service Focus Breakdown', y);
    data.visitPurposeBreakdown.forEach((item, idx) => {
        checkPage(12);
        // Zebra Stripe Background
        if (idx % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(MARGIN, y - 4, CONT_W, 9, 'F'); }
        
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...XC_DARK);
        doc.text(item.purpose, MARGIN + 2, y + 2.5);
        
        const pct = item.count / data.totalVisits;
        doc.setFillColor(230, 230, 230); doc.rect(MARGIN + 60, y - 1, 80, 4, 'F');
        doc.setFillColor(...XC_GREEN); doc.rect(MARGIN + 60, y - 1, 80 * pct, 4, 'F');
        
        doc.setFontSize(10); doc.text(`${item.count} Visits`, MARGIN + 145, y + 2.5);
        y += 9;
    });
    y += 10;
  }

  if (data.panelBreakdown?.length) {
    checkPage(60);
    y = drawSectionHeading(doc, 'XFire Deployment Snapshot', y);
    data.panelBreakdown.forEach((panel, idx) => {
        checkPage(12);
        // Zebra Stripe Background
        if (idx % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(MARGIN, y - 4, CONT_W, 9, 'F'); }
        
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...XC_DARK);
        doc.text(panel.type, MARGIN + 2, y + 2.5);
        
        const pct = panel.count / data.totalPanels;
        doc.setFillColor(230, 230, 230); doc.rect(MARGIN + 60, y - 1, 80, 4, 'F');
        doc.setFillColor(35, 35, 35); doc.rect(MARGIN + 60, y - 1, 80 * pct, 4, 'F');
        
        doc.setFontSize(10); doc.text(`${panel.count} Units`, MARGIN + 145, y + 2.5);
        y += 9;
    });
    y += 12;
  }

  // ── UPDATED FINAL SUMMARY TEXT ──
  checkPage(40);
  doc.setFillColor(248, 250, 252); doc.setDrawColor(...XC_BORDER);
  doc.roundedRect(MARGIN, y, CONT_W, 20, 1, 1, 'FD');
  doc.setFillColor(...XC_GREEN); doc.rect(MARGIN, y, 2, 20, 'F'); // Left Accent Line
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(60, 60, 60);
  
  const summaryText = `XConnect operations supported ${data.totalStages.toLocaleString()} stages with ${data.xcCaused} hardware-related events, representing a production efficiency ratio of ${barrelsPerIncident.toLocaleString()} barrels and ${stagesPerIncident.toLocaleString()} stages per event. All reported events were thoroughly investigated to identify root causes and maintain fleet uptime.`;
  doc.text(doc.splitTextToSize(summaryText, CONT_W - 12), MARGIN + 6, y + 8);

  drawFooters(doc);
  doc.save(`${data.customerName.replace(/\s+/g, '_')}_Summary.pdf`);
}