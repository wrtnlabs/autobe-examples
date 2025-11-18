import { tags } from "typia";

import { IShoppingMallSku } from "./IShoppingMallSku";

export namespace IShoppingMallSkuInventoryAdjustmentAnalytics {
  /**
   * Aggregated inventory adjustment analytics for a single SKU within a
   * seller’s catalog over a given period.
   *
   * This DTO condenses event‑level data into per‑SKU metrics, making it
   * suitable for ranking SKUs by volatility or operational attention
   * required. It does not map directly to a standalone Prisma table but is a
   * computed projection.
   *
   * The summary is typically embedded within seller‑level analytics responses
   * and used to power drill‑down reports and SKU health indicators.
   */
  export type ISummary = {
    /**
     * Summary reference to the SKU whose inventory adjustments are being
     * analyzed.
     *
     * The SKU summary includes key identification and catalog attributes
     * necessary to display the product variant in analytics UIs without
     * loading full product details.
     *
     * Linking via a summary keeps payloads small while still providing
     * enough context for users to understand which variant is affected.
     */
    sku: IShoppingMallSku.ISummary;

    /**
     * Total number of inventory adjustments recorded for this SKU within
     * the aggregation period.
     *
     * A higher count indicates more frequent manual or system‑initiated
     * changes, which can highlight catalog items with unstable stock.
     *
     * Merchants and admins can use this metric to prioritize which SKUs
     * need process improvements or configuration changes.
     */
    adjustmentCount: number & tags.Type<"int32">;

    /**
     * Total quantity increased for this SKU across all warehouses during
     * the period.
     *
     * Includes events such as inbound receipts, positive corrections, and
     * returns to stock that are associated with the SKU.
     *
     * The value helps explain how much supply entered the system for this
     * specific variant.
     */
    totalIncreaseQuantity: number;

    /**
     * Total quantity decreased for this SKU across all warehouses during
     * the period.
     *
     * This includes damage, shrinkage, write‑offs, and other negative
     * adjustments tied to the SKU.
     *
     * High negative volumes, especially relative to sales, may indicate
     * quality problems, theft, or mis‑configured processes.
     */
    totalDecreaseQuantity: number;

    /**
     * Net quantity change for the SKU during the period, calculated as
     * totalIncreaseQuantity minus totalDecreaseQuantity.
     *
     * Positive values signify net additions to stock, while negative values
     * show net removals.
     *
     * This metric is an important input when reconciling on‑hand quantities
     * and explaining stock level changes over time.
     */
    netQuantityChange: number;
  };
}
