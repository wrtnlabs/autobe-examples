import { tags } from "typia";

import { IShoppingMallSellerWarehouse } from "./IShoppingMallSellerWarehouse";

export namespace IShoppingMallWarehouseInventoryAdjustmentAnalytics {
  /**
   * Aggregated inventory adjustment metrics for a single seller warehouse
   * over a specified period.
   *
   * This DTO condenses adjustment data to the warehouse level, enabling
   * dashboards and reports to rank locations by activity, volatility, or
   * potential issues.
   *
   * It is typically included inside seller‑centric analytics responses when
   * multi‑warehouse operations are in use.
   */
  export type ISummary = {
    /**
     * Summary reference to the seller warehouse whose inventory adjustments
     * are being analyzed.
     *
     * The warehouse summary provides enough metadata to identify the
     * location in UIs, including code and name, without loading full
     * address and configuration details.
     *
     * Embedding the summary keeps analytics payloads compact while still
     * supporting navigation to detailed warehouse pages.
     */
    warehouse: IShoppingMallSellerWarehouse.ISummary;

    /**
     * Number of inventory adjustment events recorded for this warehouse in
     * the aggregation period.
     *
     * This metric reflects how frequently staff or systems are modifying
     * stock counts at the location.
     *
     * High counts may indicate operational churn, frequent corrections, or
     * high throughput of non‑order movements.
     */
    adjustmentCount: number & tags.Type<"int32">;

    /**
     * Total quantity added to inventory at this warehouse during the period
     * via adjustment events.
     *
     * Includes positive corrections, inbound receipts, and other reasons
     * that increase on‑hand stock at the location.
     *
     * It helps explain how much new stock arrived or was reconciled into
     * the warehouse.
     */
    totalIncreaseQuantity: number;

    /**
     * Total quantity removed from inventory at this warehouse during the
     * period via adjustments.
     *
     * Covers shrinkage, damage, write‑offs, and other negative adjustments
     * that lower the available quantity.
     *
     * Significant negative volumes may indicate process issues, local fraud
     * risks, or environmental problems affecting goods.
     */
    totalDecreaseQuantity: number;

    /**
     * Net quantity change at this warehouse for the period, computed as
     * totalIncreaseQuantity minus totalDecreaseQuantity.
     *
     * Positive net values show that the warehouse ended with more stock
     * than it started with due to adjustments, while negative values show
     * net removal.
     *
     * This is a key indicator when reconciling physical counts with system
     * records and when reviewing warehouse‑level performance.
     */
    netQuantityChange: number;
  };
}
