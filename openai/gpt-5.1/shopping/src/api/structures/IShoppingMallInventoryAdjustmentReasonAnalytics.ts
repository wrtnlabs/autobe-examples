import { tags } from "typia";

import { IShoppingMallInventoryAdjustmentReason } from "./IShoppingMallInventoryAdjustmentReason";

export namespace IShoppingMallInventoryAdjustmentReasonAnalytics {
  /**
   * Summary metrics for a single standardized inventory adjustment reason
   * within a larger analytics result.
   *
   * The record aggregates how often a given reason code was used and how much
   * stock it added or removed during a specific period. It is designed to be
   * embedded inside higher‑level analytics DTOs rather than used as a
   * standalone entity.
   *
   * This summary helps sellers and admins understand which operational
   * reasons, such as damage, shrinkage, or inbound receipts, contribute most
   * to inventory movement.
   */
  export type ISummary = {
    /**
     * Reference to the standardized inventory adjustment reason that this
     * summary describes.
     *
     * The reason summary exposes the business code and display name used
     * across the platform while hiding internal management flags.
     *
     * Linking to a reason summary allows UI layers to render consistent
     * labels and tooltips alongside the aggregated metrics.
     */
    reason: IShoppingMallInventoryAdjustmentReason.ISummary;

    /**
     * Number of adjustment events that used this reason within the
     * aggregation period.
     *
     * This count indicates how frequently the reason is applied and serves
     * as the primary frequency measure for ranking reasons in dashboards.
     *
     * Sudden spikes in this count can highlight emerging operational
     * problems or changes in business processes.
     */
    adjustmentCount: number & tags.Type<"int32">;

    /**
     * Total quantity added to stock for all adjustment events using this
     * reason in the period.
     *
     * Only adjustments classified as increasing inventory are included in
     * this sum. Typical examples include inbound shipments, corrections
     * that add stock, or positive reconciliation differences.
     *
     * Comparing this metric across reasons helps explain where additional
     * stock originates.
     */
    totalIncreaseQuantity: number;

    /**
     * Total quantity removed from stock for all adjustment events using
     * this reason in the period.
     *
     * This metric focuses on adjustments that reduce inventory, such as
     * damage, shrinkage, expiry, or corrective write‑offs.
     *
     * Large decrease volumes for a particular reason may signal quality
     * issues, process gaps, or fraud risk that require attention.
     */
    totalDecreaseQuantity: number;

    /**
     * Net quantity change for this reason, calculated as
     * totalIncreaseQuantity minus totalDecreaseQuantity.
     *
     * A positive value indicates that, on balance, this reason increased
     * available stock, while a negative value indicates net removal.
     *
     * The net metric enables quick interpretation of whether the reason
     * primarily contributes to gains or losses in inventory.
     */
    netQuantityChange: number;
  };
}
