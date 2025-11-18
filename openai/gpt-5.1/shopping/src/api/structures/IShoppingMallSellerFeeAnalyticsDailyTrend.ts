import { tags } from "typia";

export namespace IShoppingMallSellerFeeAnalyticsDailyTrend {
  /**
   * Daily trend line item for seller fee analytics, capturing aggregated fee
   * and tax amounts for a single business date.
   *
   * This DTO aggregates `shopping_mall_seller_fee_charges` records by the
   * date portion of their `effective_date` for a specific seller and
   * currency.
   *
   * It is used as an element in
   * `IShoppingMallSellerFeeAnalytics.ISummary.daily_trends` to support
   * plotting day‑over‑day fee movements in dashboards and reports.
   */
  export type ISummary = {
    /**
     * Business date for which the fee and tax amounts have been aggregated.
     *
     * This is typically derived from the date component of `effective_date`
     * on `shopping_mall_seller_fee_charges` after applying the requested
     * time zone normalization.
     *
     * Each trend element in a summary should have a unique `business_date`
     * within the reporting period.
     */
    business_date: string & tags.Format<"date">;

    /**
     * Total fee amount charged to the seller on this `business_date`,
     * expressed in the parent summary `currency`.
     *
     * The backend calculates this as the sum of `amount` across all fee
     * charge records whose `effective_date` falls on this date.
     *
     * This metric is suitable for plotting as a line or bar in time‑series
     * visualizations.
     */
    total_fee_amount: number;

    /**
     * Total tax portion associated with seller fees on this
     * `business_date`, expressed in the parent summary `currency`.
     *
     * This is computed by summing `tax_amount` for all matching fee charge
     * records.
     *
     * It can be used to analyze the tax component of fee flows over time.
     */
    total_tax_amount: number;

    /**
     * Total amount of fee charges on this `business_date` that are
     * recognized as platform revenue.
     *
     * This aggregates `amount` from `shopping_mall_seller_fee_charges` for
     * rows where `is_platform_revenue` is true and whose `effective_date`
     * corresponds to `business_date`.
     *
     * It enables granular revenue trend analysis at the daily level.
     */
    platform_revenue_amount: number;

    /**
     * Total amount of fee charges on this `business_date` that are
     * classified as pass‑through (non‑revenue) for the platform.
     *
     * This aggregates `amount` from rows where `is_platform_revenue` is
     * false.
     *
     * It helps separate third‑party cost flows from platform revenue when
     * examining daily fee trends.
     */
    non_revenue_pass_through_amount: number;
  };
}
