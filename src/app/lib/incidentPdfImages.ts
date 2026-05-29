/**
 * Pure helpers for the incident PDF image picker / generator pipeline.
 *
 * Kept DOM-free so it can be imported by both the React picker component
 * and the (browser-only) PDF generator, and exercised under tsx/node tests.
 */

export interface IncidentReportImage {
  url: string;
  label?: string;
}

export interface PickerImageRecord {
  id?: string;
  url: string;
  caption?: string | null;
  fieldName?: string | null;
}

export type PickerSelectionState = Record<
  string,
  { selected: boolean; caption: string }
>;

/**
 * Pick the list of images that should be rendered in the PDF's Visual
 * Evidence section.
 *
 * - If `selectedImages` is an array (even empty), it is used verbatim,
 *   filtering blank URLs and defaulting empty labels.
 * - Otherwise, falls back to the legacy `image1` / `image2` fields on
 *   the incident row so the existing pre-picker flow keeps working.
 */
export function resolveEvidenceList(
  incident: Record<string, any>,
  selectedImages?: IncidentReportImage[],
): { url: string; label: string }[] {
  if (Array.isArray(selectedImages)) {
    return selectedImages
      .filter(
        (item) =>
          item && typeof item.url === 'string' && item.url.trim().length > 0,
      )
      .map((item, idx) => ({
        url: item.url,
        label: (item.label && item.label.trim()) || `Image ${idx + 1}`,
      }));
  }
  return [
    { url: incident.image1, label: 'Image 1' },
    { url: incident.image2, label: 'Image 2' },
  ].filter((e): e is { url: string; label: string } => !!e.url);
}

/**
 * Build the default picker selection state — every image selected, with a
 * sensible default caption (existing caption / fieldName / "Image N").
 */
export function buildDefaultSelection(
  images: PickerImageRecord[],
): PickerSelectionState {
  const out: PickerSelectionState = {};
  images.forEach((img, idx) => {
    if (!img.id) return;
    out[img.id] = {
      selected: true,
      caption: img.caption || img.fieldName || `Image ${idx + 1}`,
    };
  });
  return out;
}

/**
 * Map picker state + image records to the array the PDF generator expects.
 * Skips entries that are missing a URL, missing an id, or unselected.
 */
export function selectionToPdfImages(
  images: PickerImageRecord[],
  state: PickerSelectionState,
): IncidentReportImage[] {
  return images
    .filter(
      (img) =>
        img.id && img.url && state[img.id]?.selected === true,
    )
    .map((img) => ({
      url: img.url,
      label:
        state[img.id!]?.caption?.trim() ||
        img.fieldName ||
        'Image',
    }));
}
