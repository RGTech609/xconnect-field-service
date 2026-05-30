-- WS3: Executive read-only views
-- Zero-risk: views only, no table changes.

-- Monthly incident trend: total vs XC-caused, by month of date_incident.
CREATE OR REPLACE VIEW public.v_incident_trend_monthly AS
SELECT
  date_trunc('month', date_incident)::date AS month,
  COUNT(*)                                              AS total_incidents,
  COUNT(*) FILTER (WHERE xc_caused = 'Yes')             AS xc_caused_incidents,
  COUNT(*) FILTER (WHERE incident_severity = 'Critical') AS critical_incidents,
  COUNT(*) FILTER (WHERE incident_status = 'Closed')    AS closed_incidents,
  COUNT(*) FILTER (WHERE incident_status <> 'Closed')   AS open_incidents
FROM public.incidents
WHERE date_incident IS NOT NULL
GROUP BY 1
ORDER BY 1;

-- Open-incident aging: bucket currently-open incidents by age in days.
CREATE OR REPLACE VIEW public.v_incident_open_aging AS
WITH open_inc AS (
  SELECT
    event_id,
    incident_severity,
    xc_caused,
    reviewed_at,
    (CURRENT_DATE - date_incident) AS age_days
  FROM public.incidents
  WHERE incident_status <> 'Closed'
    AND date_incident IS NOT NULL
)
SELECT
  CASE
    WHEN age_days <= 7  THEN '0-7 days'
    WHEN age_days <= 30 THEN '8-30 days'
    WHEN age_days <= 90 THEN '31-90 days'
    ELSE '90+ days'
  END AS age_bucket,
  CASE
    WHEN age_days <= 7  THEN 1
    WHEN age_days <= 30 THEN 2
    WHEN age_days <= 90 THEN 3
    ELSE 4
  END AS bucket_order,
  COUNT(*)                                                 AS open_count,
  COUNT(*) FILTER (WHERE xc_caused = 'Yes')                AS xc_caused_count,
  COUNT(*) FILTER (WHERE incident_severity = 'Critical')   AS critical_count,
  COUNT(*) FILTER (WHERE reviewed_at IS NULL)              AS unreviewed_count
FROM open_inc
GROUP BY 1, 2
ORDER BY 2;
