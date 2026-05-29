import assert from 'node:assert';
import {
  buildDefaultSelection,
  resolveEvidenceList,
  selectionToPdfImages,
} from './incidentPdfImages';

// ── resolveEvidenceList ──────────────────────────────────────────────────────

// Falls back to legacy image1/image2 when no selectedImages provided
assert.deepStrictEqual(
  resolveEvidenceList(
    { image1: 'https://x/a.jpg', image2: 'https://x/b.jpg' },
  ),
  [
    { url: 'https://x/a.jpg', label: 'Image 1' },
    { url: 'https://x/b.jpg', label: 'Image 2' },
  ],
);

// Drops legacy fields that are empty/missing
assert.deepStrictEqual(
  resolveEvidenceList({ image1: 'https://x/a.jpg', image2: '' }),
  [{ url: 'https://x/a.jpg', label: 'Image 1' }],
);

// Empty selectedImages array => empty evidence (does NOT fall back to legacy)
assert.deepStrictEqual(
  resolveEvidenceList({ image1: 'https://x/a.jpg' }, []),
  [],
);

// selectedImages takes precedence over legacy fields
assert.deepStrictEqual(
  resolveEvidenceList(
    { image1: 'https://legacy/1.jpg' },
    [{ url: 'https://new/a.jpg', label: 'Front of panel' }],
  ),
  [{ url: 'https://new/a.jpg', label: 'Front of panel' }],
);

// Missing/blank labels fall back to "Image N" indexed from 1
assert.deepStrictEqual(
  resolveEvidenceList(
    {},
    [
      { url: 'https://x/1.jpg' },
      { url: 'https://x/2.jpg', label: '   ' },
      { url: 'https://x/3.jpg', label: 'Damaged grounding lug' },
    ],
  ),
  [
    { url: 'https://x/1.jpg', label: 'Image 1' },
    { url: 'https://x/2.jpg', label: 'Image 2' },
    { url: 'https://x/3.jpg', label: 'Damaged grounding lug' },
  ],
);

// Blank URL entries are dropped
assert.deepStrictEqual(
  resolveEvidenceList(
    {},
    [
      { url: '', label: 'skip me' },
      { url: '  ', label: 'also skip' },
      { url: 'https://x/keep.jpg', label: 'keep me' },
    ],
  ),
  [{ url: 'https://x/keep.jpg', label: 'keep me' }],
);

// ── buildDefaultSelection ────────────────────────────────────────────────────

const images = [
  { id: 'a', url: 'https://x/a.jpg', caption: 'Front', fieldName: 'Image1' },
  { id: 'b', url: 'https://x/b.jpg', caption: null, fieldName: 'Image2' },
  { id: 'c', url: 'https://x/c.jpg', caption: null, fieldName: null },
];

const defaultState = buildDefaultSelection(images);
assert.deepStrictEqual(defaultState, {
  a: { selected: true, caption: 'Front' },
  b: { selected: true, caption: 'Image2' },
  c: { selected: true, caption: 'Image 3' },
});

// Skips images without an id (defensive — those can't be tracked in state)
const stateNoId = buildDefaultSelection([
  { url: 'https://x/orphan.jpg' },
  { id: 'has-id', url: 'https://x/keep.jpg' },
]);
assert.deepStrictEqual(Object.keys(stateNoId), ['has-id']);

// ── selectionToPdfImages ─────────────────────────────────────────────────────

// Round-trip: build → map → matches input ordering and uses captions
assert.deepStrictEqual(
  selectionToPdfImages(images, defaultState),
  [
    { url: 'https://x/a.jpg', label: 'Front' },
    { url: 'https://x/b.jpg', label: 'Image2' },
    { url: 'https://x/c.jpg', label: 'Image 3' },
  ],
);

// Honors deselection
const partialState = {
  ...defaultState,
  b: { selected: false, caption: 'Image2' },
};
assert.deepStrictEqual(
  selectionToPdfImages(images, partialState),
  [
    { url: 'https://x/a.jpg', label: 'Front' },
    { url: 'https://x/c.jpg', label: 'Image 3' },
  ],
);

// Trims caption whitespace and falls back to fieldName then "Image"
const trimmedState = {
  a: { selected: true, caption: '   ' },
  b: { selected: true, caption: '  Cleaned up  ' },
};
assert.deepStrictEqual(
  selectionToPdfImages(
    [
      { id: 'a', url: 'https://x/a.jpg', fieldName: 'Image1' },
      { id: 'b', url: 'https://x/b.jpg', fieldName: 'Image2' },
    ],
    trimmedState,
  ),
  [
    { url: 'https://x/a.jpg', label: 'Image1' },
    { url: 'https://x/b.jpg', label: 'Cleaned up' },
  ],
);

// Empty inputs are safe
assert.deepStrictEqual(selectionToPdfImages([], {}), []);

console.log('incidentPdfImages tests passed');
