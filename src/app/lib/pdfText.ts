// Browser-side PDF text extraction using PDF.js loaded from a CDN.
// We load it dynamically (no bundled dependency) and cache the module.
// Returns the concatenated text of every page, with newlines between text items,
// which is what the edge slip parser (POST /qc-slip/parse) expects.

const PDFJS_VERSION = '4.7.76';
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs`;
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

let pdfjsLib: any = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  // Vite-friendly dynamic import from a full URL.
  const mod = await import(/* @vite-ignore */ PDFJS_CDN);
  const lib = (mod as any).default ?? mod;
  lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  pdfjsLib = lib;
  return lib;
}

export async function extractPdfText(file: File): Promise<string> {
  const lib = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Join items with newlines so label/value pairs land on separate lines,
    // matching the parser's line-based regexes.
    const text = content.items
      .map((it: any) => (typeof it.str === 'string' ? it.str : ''))
      .join('\n');
    pages.push(text);
  }
  return pages.join('\n');
}
