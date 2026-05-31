import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Read-only evidence gallery for an incident.
 *
 * Evidence photos live in the `images_legacy` table (public Supabase Storage
 * URLs) linked to incidents by `event_id` — NOT on the incident row itself
 * (incidents.image1/image2 are unused in the current data). This component
 * fetches images_legacy by event_id and renders them, falling back to any
 * inline image1/image2 if those are ever populated.
 *
 * Styling is intentionally minimal/Tailwind-based so it inherits the host
 * page's light/dark theme. Pass `className` to override the grid layout.
 */
interface Props {
  eventId: string | number | null | undefined;
  /** Inline fallbacks (incidents.image1 / image2) — used if no legacy rows. */
  inline?: (string | null | undefined)[];
  className?: string;
  /**
   * Optional section heading. When provided, the heading is rendered only if
   * at least one image exists (the whole component renders nothing otherwise).
   */
  title?: string;
}

export default function IncidentEvidenceImages({ eventId, inline = [], className, title }: Props) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const inlineUrls = inline.filter((u): u is string => !!u && String(u).trim() !== '');

    if (eventId === null || eventId === undefined || String(eventId).trim() === '') {
      setUrls(inlineUrls);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from('images_legacy')
        .select('pictures,description')
        .eq('event_id', String(eventId))
        .order('description', { ascending: true });
      if (cancelled) return;
      const fromLegacy = error
        ? []
        : ((data as any[]) || [])
            .map(row => row?.pictures)
            .filter((u): u is string => !!u && String(u).trim() !== '');
      // De-dupe while preserving order; legacy first, then any inline extras.
      setUrls(Array.from(new Set([...fromLegacy, ...inlineUrls])));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, inline.join('|')]);

  if (urls.length === 0) return null;

  const grid = (
    <div className={className ?? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'}>
      {urls.map((url, i) => (
        <a
          key={url + i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open full size in new tab"
          className="block rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
        >
          <img
            src={url}
            alt={`Evidence ${i + 1}`}
            loading="lazy"
            className="w-full h-40 object-cover bg-gray-50 dark:bg-gray-800/50"
            onError={e => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </a>
      ))}
    </div>
  );

  if (title) {
    return (
      <section>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200 dark:border-gray-700 pb-1">
          {title}
          {urls.length > 1 ? <span className="text-gray-400"> ({urls.length})</span> : null}
        </p>
        {grid}
      </section>
    );
  }

  return grid;
}
