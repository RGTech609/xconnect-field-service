import { XCONNECT_LOGO_B64, XCONNECT_HEADER_B64 } from './brandAssets';

export const XC_GREEN    = [93, 184, 72]   as [number, number, number];
export const XC_DARK     = [35, 35, 35]    as [number, number, number];
export const XC_GRAY     = [245, 245, 245] as [number, number, number];
export const XC_BORDER   = [220, 220, 220] as [number, number, number];
export const WHITE       = [255, 255, 255] as [number, number, number];
export const GRAY_TEXT   = [100, 100, 100] as [number, number, number];
export const LIGHT_GREEN = [232, 248, 228] as [number, number, number];

export const PAGE_W = 210;
export const PAGE_H = 297;
export const MARGIN = 14;
export const CONT_W = PAGE_W - MARGIN * 2;

export function loadJsPDF(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).jspdf?.jsPDF) {
      resolve(new (window as any).jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => resolve(new (window as any).jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }));
    script.onerror = () => reject(new Error('Failed to load jsPDF'));
    document.head.appendChild(script);
  });
}

// ── Perfect Ratio Header ──
export function drawHeader(doc: any, subtitle?: string): number {
  let headerHeight = 35;
  try {
    const imgProps = doc.getImageProperties(XCONNECT_HEADER_B64);
    headerHeight = (imgProps.height * PAGE_W) / imgProps.width;
    doc.addImage(XCONNECT_HEADER_B64, 'PNG', 0, 0, PAGE_W, headerHeight);
  } catch {
    doc.setFillColor(...XC_GREEN);
    doc.rect(0, 0, PAGE_W, headerHeight, 'F');
  }
  if (subtitle) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text(subtitle, PAGE_W - MARGIN, headerHeight - 4, { align: 'right' });
  }
  return headerHeight;
}

// ── Small Logo for Secondary Pages ──
export function drawSmallLogo(doc: any): number {
  const logoHeight = 12;
  try {
    doc.addImage(XCONNECT_LOGO_B64, 'PNG', MARGIN, 8, 30, logoHeight);
  } catch {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...XC_GREEN);
    doc.text('XCONNECT', MARGIN, 8);
  }
  return logoHeight + 12; // Logo height + spacing
}

export function drawWatermark(_doc: any) {
  // watermark removed
}

export function drawFooters(doc: any) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...XC_GRAY);
    doc.rect(0, PAGE_H - 12, PAGE_W, 12, 'F');
    doc.setDrawColor(...XC_BORDER);
    doc.setLineWidth(0.5);
    doc.line(0, PAGE_H - 12, PAGE_W, PAGE_H - 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY_TEXT);
    doc.text('XConnect Proprietary & Confidential', MARGIN, PAGE_H - 5);
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 5, { align: 'right' });
  }
}

export function drawSectionHeading(doc: any, label: string, y: number): number {
  doc.setFillColor(...XC_GREEN);
  doc.rect(MARGIN, y - 1, 3, 6, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...XC_DARK);
  doc.text(label.toUpperCase(), MARGIN + 5, y + 4);
  doc.setDrawColor(...XC_GREEN); doc.setLineWidth(0.6);
  doc.line(MARGIN, y + 6, PAGE_W - MARGIN, y + 6);
  return y + 10;
}

// ── RESTORED: Exact Array-based Table function your app expects ──
export function drawTable(
  doc: any,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  startY: number,
): number {
  const rowH = 7;
  const headerH = 8;
  const drawH = (y: number) => {
    doc.setFillColor(...XC_DARK); doc.rect(MARGIN, y, CONT_W, headerH, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...WHITE);
    let hx = MARGIN;
    headers.forEach((h, i) => { doc.text(h, hx + 2, y + 5.5); hx += colWidths[i]; });
    return y + headerH;
  };
  let y = drawH(startY);
  rows.forEach((row, ri) => {
    if (y + rowH > PAGE_H - 15) { doc.addPage(); drawHeader(doc); y = drawH(40); }
    doc.setFillColor(ri % 2 === 0 ? 255 : 248, ri % 2 === 0 ? 255 : 250, ri % 2 === 0 ? 255 : 252);
    doc.rect(MARGIN, y, CONT_W, rowH, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...XC_DARK);
    let rx = MARGIN;
    row.forEach((cell, ci) => {
      const maxLen = Math.floor(colWidths[ci] / 1.7);
      const txt = (cell || '').length > maxLen ? (cell || '').slice(0, maxLen - 1) + '…' : (cell || '');
      doc.text(txt, rx + 2, y + 4.8); rx += colWidths[ci];
    });
    y += rowH;
  });
  return y;
}

// ── RESTORED: Info Grid function ──
export function drawInfoGrid(
  doc: any,
  fields: { label: string; value: string | null | undefined }[],
  startY: number,
  cols = 2,
): number {
  const colW = CONT_W / cols;
  let y = startY;

  for (let i = 0; i < fields.length; i += cols) {
    const rowItems = fields.slice(i, i + cols);
    rowItems.forEach((field, ci) => {
      const x = MARGIN + ci * colW;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY_TEXT);
      doc.text(field.label.toUpperCase(), x, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...XC_DARK);
      doc.text(field.value || '—', x, y + 5);
    });
    y += 12;
    if (y > PAGE_H - 20) {
      doc.addPage();
      drawHeader(doc);
      y = 45;
    }
  }
  return y + 5;
}