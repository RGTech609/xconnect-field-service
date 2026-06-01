-- QC slip integration: capture core build/packing-slip header fields.
-- sales_order grouping key; fulfillment_id = per-pallet build; operator from slip.
ALTER TABLE qc_pallets
  ADD COLUMN IF NOT EXISTS sales_order text,
  ADD COLUMN IF NOT EXISTS fulfillment_id text,
  ADD COLUMN IF NOT EXISTS operator text;

CREATE INDEX IF NOT EXISTS qc_pallets_sales_order_idx ON qc_pallets (sales_order);

COMMENT ON COLUMN qc_pallets.sales_order IS 'Sales Order, e.g. SO4698 — grouping key for pallets/slips';
COMMENT ON COLUMN qc_pallets.fulfillment_id IS 'Order Fulfillment ID, e.g. IF37624 — one fulfillment = one pallet/build slip';
COMMENT ON COLUMN qc_pallets.operator IS 'Operator on the build/packing slip, e.g. Kraken Operating';
