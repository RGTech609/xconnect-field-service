import QRCode from 'qrcode';
import {
  loadJsPDF, drawFooters,
  XC_GREEN, XC_DARK, XC_BORDER, GRAY_TEXT, WHITE,
  MARGIN, CONT_W, PAGE_H, PAGE_W,
} from './pdfUtils';
import { XCONNECT_LOGO_B64 } from './brandAssets';

export interface TechnicalBulletinOptions {
  bulletinNumber: string;
  title: string;
  date: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Information';
  affectedProducts: string[];
  failedParts?: string[];
  distributionList?: string[];
  summary: string;
  background?: string;
  technicalDetails: string;
  recommendedActions: string[];
  roleType?: string | string[];
  customerFileUrl?: string;
  customerFileLabel?: string;
  problemImages?: Array<{ url: string; caption?: string }>;
  fixImages?: Array<{ url: string; caption?: string }>;
  compact?: boolean;
  returnBlob?: boolean;
}

// ── Severity palette ──────────────────────────────────────────────────────────
const SEV: Record<string, { bg: [number,number,number]; text: [number,number,number]; light: [number,number,number] }> = {
  Critical:    { bg: [220, 38,  38],  text: [255,255,255], light: [254,226,226] },
  High:        { bg: [234, 88,  12],  text: [255,255,255], light: [255,237,213] },
  Medium:      { bg: [202,138,   4],  text: [255,255,255], light: [254,249,195] },
  Low:         { bg: [37, 99,  235],  text: [255,255,255], light: [219,234,254] },
  Information: { bg: [37, 99,  235],  text: [255,255,255], light: [219,234,254] },
};

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }); }
  catch { return d; }
};

// ── Canvas-based image load (preserves EXIF orientation via browser renderer) ─
// compact=true: caps pixels at MAX_PX and encodes as JPEG to keep PDF under ~25 MB
const COMPACT_MAX_PX = 1400;
const COMPACT_JPEG_Q = 0.72;

function loadImageViaCanvas(
  url: string,
  compress = false,
): Promise<{ dataUrl: string; fmt: string; nw: number; nh: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let w = img.naturalWidth  || img.width;
        let h = img.naturalHeight || img.height;

        if (compress && Math.max(w, h) > COMPACT_MAX_PX) {
          const s = COMPACT_MAX_PX / Math.max(w, h);
          w = Math.round(w * s);
          h = Math.round(h * s);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, w, h);

        const fmt    = compress ? 'image/jpeg' : 'image/png';
        const quality = compress ? COMPACT_JPEG_Q : undefined;
        resolve({ dataUrl: canvas.toDataURL(fmt, quality), fmt: compress ? 'JPEG' : 'PNG', nw: w, nh: h });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// object-fit: contain within (maxW × maxH), returns rendered height
async function addContainedImage(
  doc: any, url: string,
  x: number, y: number, maxW: number, maxH: number,
  compress = false,
): Promise<number> {
  const res = await loadImageViaCanvas(url, compress);
  if (!res) return 0;
  const scale = Math.min(maxW / res.nw, maxH / res.nh);
  const rw = res.nw * scale;
  const rh = res.nh * scale;
  const cx = x + (maxW - rw) / 2;
  try { doc.addImage(res.dataUrl, res.fmt, cx, y, rw, rh); return rh; }
  catch { return 0; }
}

async function qrDataUrl(url: string): Promise<string | null> {
  try { return await QRCode.toDataURL(url, { width: 120, margin: 1, color: { dark: '#1e1e1e', light: '#ffffff' } }); }
  catch { return null; }
}

function drawLogo(doc: any, x: number, y: number, targetH: number): number {
  try {
    const props = doc.getImageProperties(XCONNECT_LOGO_B64);
    const w = (props.width / props.height) * targetH;
    doc.addImage(XCONNECT_LOGO_B64, 'PNG', x, y, w, targetH);
    return w;
  } catch {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...XC_GREEN);
    doc.text('XCONNECT', x, y + targetH * 0.7);
    return 28;
  }
}

// ── Branded header ────────────────────────────────────────────────────────────
function drawBrandedHeader(
  doc: any, bulletinNumber: string, severity: string, date: string, compact: boolean,
): number {
  const sev     = SEV[severity] || SEV.Information;
  const headerH = compact ? 18 : 22;
  const logoH   = compact ? 11 : 14;
  const logoY   = (headerH - logoH) / 2;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, headerH, 'F');
  doc.setFillColor(...sev.bg);
  doc.rect(0, headerH - 1.5, PAGE_W, 1.5, 'F');

  drawLogo(doc, MARGIN, logoY, logoH);

  const cx = PAGE_W / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(compact ? 9.5 : 11);
  doc.setTextColor(...XC_DARK);
  doc.text('TECHNICAL BULLETIN', cx, compact ? 8 : 9.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(compact ? 7 : 8);
  doc.setTextColor(...GRAY_TEXT);
  doc.text(`TB-${bulletinNumber}`, cx, compact ? 13 : 15, { align: 'center' });

  const rightX = PAGE_W - MARGIN;
  const pillW  = compact ? 22 : 26;
  const pillH  = compact ? 6 : 7;
  const pillY  = (headerH - pillH) / 2 - (compact ? 2 : 2.5);
  doc.setFillColor(...sev.bg);
  doc.roundedRect(rightX - pillW, pillY, pillW, pillH, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(compact ? 6.5 : 7.5);
  doc.setTextColor(...sev.text);
  doc.text(severity.toUpperCase(), rightX - pillW / 2, pillY + pillH - 1.8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(compact ? 7 : 7.5);
  doc.setTextColor(...GRAY_TEXT);
  doc.text(fmtDate(date), rightX, pillY + pillH + (compact ? 4 : 5), { align: 'right' });

  return headerH + 2;
}

// ── Severity title bar ────────────────────────────────────────────────────────
function drawTitleBar(doc: any, title: string, severity: string, y: number, compact: boolean): number {
  const sev  = SEV[severity] || SEV.Information;
  const fs   = compact ? 10.5 : 12;
  const padV = compact ? 4 : 5;
  const lines: string[] = doc.splitTextToSize(title, CONT_W - 4);
  const barH = lines.length * (fs * 0.353 + 1.2) + padV * 2;
  doc.setFillColor(...sev.bg);
  doc.rect(MARGIN - 2, y, CONT_W + 4, barH, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(fs); doc.setTextColor(...WHITE);
  lines.forEach((l: string, i: number) => {
    doc.text(l, MARGIN, y + padV + (fs * 0.353 + 1.2) * i + fs * 0.353);
  });
  return y + barH + (compact ? 4 : 6);
}

// ── 3-col metadata grid — sm scales trailing gap ──────────────────────────────
function drawMetadata(
  doc: any, y: number,
  products: string, parts: string, distribution: string,
  compact: boolean, sm = 1,
): number {
  const colW    = CONT_W / 3;
  const padH    = compact ? 3.5 : 4.5;
  const lbSize  = compact ? 6.5 : 7;
  const valSize = compact ? 9 : 10;
  const lineH   = compact ? 3.8 : 4.2;

  const cols = [
    { label: 'AFFECTED PRODUCTS', val: products },
    { label: 'FAILED PARTS',      val: parts },
    { label: 'DISTRIBUTION',      val: distribution },
  ];

  const colLines = cols.map(c => doc.splitTextToSize(c.val, colW - 8) as string[]);
  const maxRows  = Math.max(...colLines.map((a: string[]) => a.length));
  const boxH     = padH + 4 + maxRows * lineH + padH;

  doc.setFillColor(248, 250, 252); doc.setDrawColor(...XC_BORDER); doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, y, CONT_W, boxH, 1, 1, 'FD');
  [1, 2].forEach(n => {
    doc.setDrawColor(...XC_BORDER); doc.setLineWidth(0.2);
    doc.line(MARGIN + colW * n, y + 2.5, MARGIN + colW * n, y + boxH - 2.5);
  });

  cols.forEach((col, ci) => {
    const cx = MARGIN + ci * colW + 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(lbSize); doc.setTextColor(...GRAY_TEXT);
    doc.text(col.label, cx, y + padH);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(valSize); doc.setTextColor(...XC_DARK);
    colLines[ci].forEach((l: string, li: number) => doc.text(l, cx, y + padH + 4 + li * lineH));
  });

  return y + boxH + (compact ? 4 * sm : 6);
}

// ── Summary (unlabeled) — sm scales trailing gap ──────────────────────────────
function drawSummary(doc: any, text: string, y: number, severity: string, compact: boolean, sm = 1): number {
  const sev   = SEV[severity] || SEV.Information;
  const fs    = compact ? 9.5 : 11;
  const lineH = compact ? 4.2 : 4.8;
  const padV  = compact ? 4 : 5;
  const lines: string[] = doc.splitTextToSize(text, CONT_W - 8);
  const boxH  = lines.length * lineH + padV * 2;
  doc.setFillColor(...sev.light); doc.setDrawColor(...sev.bg); doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, CONT_W, boxH, 1, 1, 'FD');
  doc.setFillColor(...sev.bg); doc.rect(MARGIN, y, 2, boxH, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(fs); doc.setTextColor(40,40,40);
  lines.forEach((l: string, i: number) => doc.text(l, MARGIN + 6, y + padV + fs * 0.353 + i * lineH));
  return y + boxH + (compact ? 4 * sm : 6);
}

// ── Section label with rule ───────────────────────────────────────────────────
function sectionLabel(doc: any, label: string, y: number, compact: boolean): number {
  const fs = compact ? 7.5 : 8;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(fs); doc.setTextColor(...GRAY_TEXT);
  doc.text(label.toUpperCase(), MARGIN, y);
  doc.setDrawColor(...XC_BORDER); doc.setLineWidth(0.3);
  doc.line(MARGIN + doc.getTextWidth(label.toUpperCase()) + 2, y - 1, MARGIN + CONT_W, y - 1);
  return y + (compact ? 3 : 4);
}

// ── Tech details + side image — sm scales trailing gap ────────────────────────
async function drawTechWithImage(
  doc: any, y: number,
  techText: string,
  image: { url: string; caption?: string } | undefined,
  compact: boolean,
  maxPageY: number,
  sm = 1,
): Promise<number> {
  const hasImg  = !!image;
  const detailW = hasImg ? CONT_W * 0.57 : CONT_W;
  const imgW    = hasImg ? CONT_W * 0.40  : 0;
  const imgX    = MARGIN + detailW + CONT_W * 0.03;
  const maxImgH = compact ? 42 : 72;
  const fs      = compact ? 9.5 : 11;
  const lineH   = compact ? 4.2 : 4.8;

  y = sectionLabel(doc, 'Technical Details', y, compact);

  const techLines: string[] = doc.splitTextToSize(techText, detailW - 2);
  const textH   = techLines.length * lineH;
  let   imgRendH = 0;

  if (hasImg) {
    imgRendH = await addContainedImage(doc, image!.url, imgX, y, imgW, maxImgH, compact);
  }

  doc.setFont('helvetica', 'normal'); doc.setFontSize(fs); doc.setTextColor(40,40,40);
  techLines.forEach((l: string, i: number) => doc.text(l, MARGIN, y + i * lineH));

  if (hasImg && image!.caption && imgRendH > 0) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(...GRAY_TEXT);
    doc.text(image!.caption, imgX, y + imgRendH + 3, { maxWidth: imgW });
  }

  return y + Math.max(textH, imgRendH) + (compact ? 5 * sm : 7);
}

// ── Recommended actions — sm scales trailing gap ──────────────────────────────
function drawActions(doc: any, actions: string[], y: number, compact: boolean, sm = 1): number {
  y = sectionLabel(doc, 'Recommended Actions', y, compact);
  const fs    = compact ? 9.5 : 11;
  const lineH = compact ? 4.2 : 4.8;
  const padV  = compact ? 3.5 : 4.5;

  const lineArrays = actions.map(a => doc.splitTextToSize(a, CONT_W - 14) as string[]);
  const boxH = lineArrays.reduce((s, ls) => s + ls.length * lineH + 2, padV * 2);

  doc.setFillColor(240,253,244); doc.setDrawColor(34,197,94); doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, CONT_W, boxH, 1, 1, 'FD');
  doc.setFillColor(34,197,94); doc.rect(MARGIN, y, 2, boxH, 'F');

  let ay = y + padV;
  lineArrays.forEach((ls, idx) => {
    doc.setFillColor(34,197,94);
    doc.circle(MARGIN + 7, ay + fs * 0.176, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255,255,255);
    doc.text(String(idx + 1), MARGIN + 7, ay + fs * 0.176 + 0.8, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(fs); doc.setTextColor(30,30,30);
    ls.forEach((l: string, i: number) => doc.text(l, MARGIN + 12, ay + i * lineH));
    ay += ls.length * lineH + 2;
  });

  return y + boxH + (compact ? 5 * sm : 7);
}

// ── Contact + download row — sm scales trailing gap ───────────────────────────
async function drawContactDownload(
  doc: any, y: number,
  roleText: string,
  fileUrl: string | undefined,
  fileLabel: string | undefined,
  compact: boolean,
  sm = 1,
): Promise<number> {
  const rowH = compact ? 16 : 19;
  const fs   = compact ? 9.5 : 10;

  const hasDownload = !!fileUrl;
  const contactW    = hasDownload ? CONT_W * 0.48 : CONT_W;
  const dlX         = MARGIN + contactW + CONT_W * 0.04;
  const dlW         = hasDownload ? CONT_W * 0.48 : 0;

  doc.setFillColor(248,250,252); doc.setDrawColor(...XC_BORDER); doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, y, contactW, rowH, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(fs * 0.8); doc.setTextColor(...GRAY_TEXT);
  doc.text('CONTACT', MARGIN + 4, y + (compact ? 5 : 5.5));
  doc.setFont('helvetica', 'normal'); doc.setFontSize(fs); doc.setTextColor(40,40,40);
  const contactText = roleText
    ? `For questions, contact your XConnect ${roleText}.`
    : 'For questions, contact your XConnect Service Quality Manager.';
  const ctLines: string[] = doc.splitTextToSize(contactText, contactW - 8);
  ctLines.slice(0, 2).forEach((l: string, i: number) => doc.text(l, MARGIN + 4, y + (compact ? 9 : 10) + i * (compact ? 3.8 : 4.2)));

  if (hasDownload && fileUrl) {
    const label  = fileLabel?.trim() || 'Customer Download';
    const qrSize = compact ? 12 : 14;
    const qrY    = y + (rowH - qrSize) / 2;

    doc.setFillColor(239,246,255); doc.setDrawColor(147,197,253); doc.setLineWidth(0.2);
    doc.roundedRect(dlX, y, dlW, rowH, 1, 1, 'FD');
    doc.setFillColor(59,130,246); doc.rect(dlX, y, 1.5, rowH, 'F');

    const qr = await qrDataUrl(fileUrl);
    if (qr) doc.addImage(qr, 'PNG', dlX + 4, qrY, qrSize, qrSize);

    const textX    = dlX + 4 + qrSize + 3;
    const maxTW    = dlW - qrSize - 12;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...GRAY_TEXT);
    doc.text('DOWNLOAD', textX, y + (compact ? 5.5 : 6));
    doc.setFont('helvetica', 'bold'); doc.setFontSize(compact ? 9 : 10); doc.setTextColor(37,99,235);
    const truncLabel: string = doc.splitTextToSize(label, maxTW)[0];
    const labelY = y + (compact ? 10 : 11);
    doc.textWithLink(truncLabel, textX, labelY, { url: fileUrl });
    const lw = doc.getTextWidth(truncLabel);
    doc.setDrawColor(37,99,235); doc.setLineWidth(0.3);
    doc.line(textX, labelY + 0.8, textX + lw, labelY + 0.8);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(110,110,110);
    doc.text('Scan QR or click link', textX, y + (compact ? 14 : 15.5));
  }

  return y + rowH + (compact ? 4 * sm : 6);
}

// ── Continuation header ───────────────────────────────────────────────────────
function drawContinuationHeader(doc: any): number {
  const H = 14;
  doc.setFillColor(248,250,252); doc.rect(0, 0, PAGE_W, H, 'F');
  doc.setFillColor(...XC_GREEN); doc.rect(0, H - 1, PAGE_W, 1, 'F');
  drawLogo(doc, MARGIN, 2, 9);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRAY_TEXT);
  doc.text('TECHNICAL BULLETIN (continued)', PAGE_W - MARGIN, 8, { align: 'right' });
  return H + 4;
}

// ── Core render function (used for measure pass + final pass) ─────────────────
// sm = spacing multiplier — scales only inter-section trailing gaps
async function renderBulletin(
  doc: any,
  opts: TechnicalBulletinOptions,
  compact: boolean,
  sm: number,
): Promise<number> {
  const FOOTER_H = 12;
  const USABLE_H = PAGE_H - FOOTER_H;

  const {
    bulletinNumber, title, date, severity,
    affectedProducts, failedParts, distributionList,
    summary, background, technicalDetails, recommendedActions,
    roleType, customerFileUrl, customerFileLabel,
    problemImages, fixImages,
  } = opts;

  const productsText = affectedProducts.length ? affectedProducts.join(', ') : 'All Products';
  const partsText    = failedParts?.length       ? failedParts.join(', ')    : '—';
  const distText     = distributionList?.length   ? distributionList.join(', ') : '—';
  const roleText     = Array.isArray(roleType) ? roleType.join(', ') : (roleType || '');
  const actions      = recommendedActions.filter(a => a.trim());

  let y = 0;
  let pageCount = 1;

  const newPage = () => {
    doc.addPage();
    pageCount++;
    y = drawContinuationHeader(doc);
  };
  const checkPage = (needed: number) => { if (y + needed > USABLE_H) newPage(); };

  y = drawBrandedHeader(doc, bulletinNumber, severity, date, compact);
  y = drawTitleBar(doc, title, severity, y, compact);

  checkPage(20);
  y = drawMetadata(doc, y, productsText, partsText, distText, compact, sm);

  checkPage(14);
  y = drawSummary(doc, summary, y, severity, compact, sm);

  if (background) {
    checkPage(14);
    y = sectionLabel(doc, 'Background', y, compact);
    const fs = compact ? 9.5 : 11; const lineH = compact ? 4.2 : 4.8;
    const bgLines: string[] = doc.splitTextToSize(background, CONT_W - 2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(fs); doc.setTextColor(40,40,40);
    bgLines.forEach((l: string, i: number) => doc.text(l, MARGIN, y + i * lineH));
    y += bgLines.length * lineH + (compact ? 5 * sm : 7);
  }

  checkPage(compact ? 30 : 50);
  const firstProblem = problemImages && problemImages.length > 0 ? problemImages[0] : undefined;
  y = await drawTechWithImage(doc, y, technicalDetails, firstProblem, compact, USABLE_H, sm);

  const extraProblems = problemImages ? problemImages.slice(1) : [];
  if (extraProblems.length > 0) {
    checkPage(20);
    y = sectionLabel(doc, 'Failure Examples', y, compact);
    for (const img of extraProblems) {
      checkPage(compact ? 28 : 50);
      if (img.caption) {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...GRAY_TEXT);
        doc.text(img.caption, MARGIN, y); y += 4;
      }
      const h = await addContainedImage(doc, img.url, MARGIN, y, CONT_W, compact ? 35 : 70, compact);
      y += (h || 0) + (compact ? 4 * sm : 6);
    }
  }

  if (actions.length > 0) {
    checkPage(compact ? 20 : 30);
    y = drawActions(doc, actions, y, compact, sm);
  }

  if (fixImages && fixImages.length > 0) {
    checkPage(20);
    y = sectionLabel(doc, 'Corrected Example', y, compact);
    for (const img of fixImages) {
      checkPage(compact ? 28 : 50);
      if (img.caption) {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...GRAY_TEXT);
        doc.text(img.caption, MARGIN, y); y += 4;
      }
      const h = await addContainedImage(doc, img.url, MARGIN, y, CONT_W, compact ? 35 : 70, compact);
      y += (h || 0) + (compact ? 4 * sm : 6);
    }
  }

  checkPage(compact ? 22 : 28);
  y = await drawContactDownload(doc, y, roleText, customerFileUrl, customerFileLabel, compact, sm);

  // Disclaimer
  checkPage(10);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(...GRAY_TEXT);
  const disc = 'This technical bulletin is provided for informational purposes. Contact XConnect technical support for specific guidance related to your operations.';
  const discLines: string[] = doc.splitTextToSize(disc, CONT_W);
  discLines.forEach((l: string, i: number) => doc.text(l, MARGIN, y + i * 3.5));
  y += discLines.length * 3.5;

  drawFooters(doc);

  return pageCount === 1 ? y : PAGE_H; // if multi-page, signal overflow
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════════
export async function generateTechnicalBulletinPDF(opts: TechnicalBulletinOptions): Promise<Blob | void> {
  const { bulletinNumber, compact = false, returnBlob = false } = opts;

  const FOOTER_H    = 12;
  const USABLE_H    = PAGE_H - FOOTER_H;
  const DISC_H      = 8;  // height reserved for disclaimer at bottom

  let finalDoc = await loadJsPDF();

  if (compact) {
    // ── Pass 1: measure with sm=1 ─────────────────────────────────────────────
    const measureDoc = await loadJsPDF();
    const measuredY  = await renderBulletin(measureDoc, opts, true, 1);

    // Only try to fill if all content fit on one page
    const fitsOnePage = measuredY < PAGE_H; // PAGE_H signals overflow from renderBulletin
    if (fitsOnePage) {
      const available  = USABLE_H - DISC_H;
      const remaining  = available - measuredY;

      if (remaining > 8) {
        // Estimate total gap space in compact mode (inter-section trailing gaps)
        // ~7 gaps × 4mm average = ~28mm base gap space
        const BASE_GAP_SPACE = 28;
        const sm = Math.min(3.0, 1 + remaining / BASE_GAP_SPACE);
        finalDoc = await loadJsPDF();
        await renderBulletin(finalDoc, opts, true, sm);
      } else {
        // Content already fills page — use the measure doc output
        finalDoc = measureDoc;
      }
    } else {
      // Content overflows to page 2 — render normally, no fill needed
      finalDoc = await loadJsPDF();
      await renderBulletin(finalDoc, opts, true, 1);
    }
  } else {
    await renderBulletin(finalDoc, opts, false, 1);
  }

  if (returnBlob) return finalDoc.output('blob') as Blob;
  finalDoc.save(`Technical_Bulletin_TB-${bulletinNumber}_${compact ? 'Compact' : 'Standard'}.pdf`);
}
