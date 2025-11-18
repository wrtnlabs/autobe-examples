import { tags } from "typia";

import { IShoppingMallSeller } from "./IShoppingMallSeller";
import { IShoppingMallSellerFeeAnalyticsFeeTypeBreakdown } from "./IShoppingMallSellerFeeAnalyticsFeeTypeBreakdown";
import { IShoppingMallSellerFeeAnalyticsDailyTrend } from "./IShoppingMallSellerFeeAnalyticsDailyTrend";

export namespace IShoppingMallSellerFeeAnalytics {
  /**
   * Request DTO for seller fee and commission analytics queries in the
   * ShoppingMall platform.
   *
   * This type is used as the request body for the PATCH
   * /shoppingMall/seller/analytics/sellerFees endpoint. It allows
   * authenticated sellers to specify time windows, fee categories, and other
   * filters, along with pagination and aggregation preferences, in order to
   * retrieve summarized fee and commission information derived from tables
   * such as shopping_mall_seller_fee_charges and
   * shopping_mall_seller_earnings.
   *
   * The DTO is read-only from the perspective of business data: it does not
   * create or modify any fee records. Instead, it expresses query parameters
   * that control how existing fee charges and earning rows are grouped,
   * filtered, and paginated. The seller identity is taken from the
   * authenticated context, so no seller ID or account ID fields appear in
   * this schema.
   */
  export type IRequest = {
    /**
     * Inclusive start of the analysis window for fee and commission
     * calculations.
     *
     * When present, the backend restricts fee and earning records to those
     * whose effective_date or related business date is greater than or
     * equal to this value. If omitted, implementations typically use a
     * default window such as the last 30 days.
     */
    startDate?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Exclusive end of the analysis window for fee and commission
     * calculations.
     *
     * When provided, only fee and earning records with effective_date
     * earlier than this timestamp are considered. If omitted, the current
     * time or a default offset from startDate is usually applied.
     */
    endDate?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional list of fee categories to include in the analysis.
     *
     * If provided, the analytics engine restricts calculations to fee
     * charges whose fee_type matches one of the specified values. If
     * omitted, all available fee types for the seller are considered.
     */
    feeTypes?: string[] | undefined;

    /**
     * Optional minimum absolute fee amount used as a filter.
     *
     * When present, only fee or commission records whose absolute amount is
     * greater than or equal to this threshold are included in the
     * aggregation. This can be used to ignore trivial fees in analytical
     * views.
     */
    minAmount?: number | undefined;

    /**
     * Optional maximum absolute fee amount used as a filter.
     *
     * When provided, fee or commission records whose absolute amount
     * exceeds this value may be excluded from the analysis, which is useful
     * for focusing on typical fees and excluding extreme adjustments.
     */
    maxAmount?: number | undefined;

    /**
     * Primary aggregation dimension for the fee analytics query.
     *
     * Common values include day (aggregate by calendar date), fee_type
     * (aggregate per fee category), and order (aggregate per order). The
     * backend must validate the supplied value against allowed grouping
     * modes and default to a sensible option when absent.
     */
    groupBy: string;

    /**
     * Page index for paginated analytical results.
     *
     * This is a 1-based page number used together with pageSize to control
     * which slice of the aggregated results is returned. When omitted,
     * implementations typically default to the first page.
     */
    page: number & tags.Type<"int32">;

    /**
     * Number of aggregated records to return per page.
     *
     * This controls the size of the data array in the paginated response
     * IPageIShoppingMallSellerFeeAnalytics.ISummary. Backend
     * implementations should enforce sensible upper bounds to protect
     * performance.
     */
    pageSize: number & tags.Type<"int32">;

    /**
     * Field name used for sorting aggregated analytics rows.
     *
     * Common options include totalAmount, totalCount, or a date field
     * depending on the chosen groupBy. The backend should validate the
     * requested sortBy against a whitelist of supported sort keys.
     */
    sortBy: string;

    /**
     * Sort direction applied to the aggregated result set.
     *
     * Allowed values typically include asc for ascending and desc for
     * descending order. If omitted, implementations usually default to
     * descending order for monetary totals or descending chronological
     * order for date-based groupings.
     */
    sortDirection: string;
  };

  /**
   * Summary analytics view of fee and commission charges applied to a single
   * seller over a reporting period.
   *
   * This DTO aggregates raw fee charge records from the
   * `shopping_mall_seller_fee_charges` model into high‑level metrics that can
   * be rendered in seller or admin dashboards without exposing individual
   * charge rows.
   *
   * It is intentionally read‑only and does not correspond directly to a
   * single database row. Instead, it groups charges by business dimensions
   * such as fee type and effective date range, while preserving currency
   * context for correct financial interpretation.
   *
   * Use this type in response payloads where the caller needs an at‑a‑glance
   * overview of how much has been charged to the seller, how much of that is
   * platform revenue, and what the net impact is for the selected time
   * window.
   */
  export type ISummary = {
    /**
     * Seller for whom the fee analytics are being summarized.
     *
     * This object provides the high‑level identity and profile context of
     * the seller so that the analytics response can be rendered without an
     * additional lookup.
     *
     * Use the summary variant to avoid deep nesting and to prevent circular
     * references with other seller‑related aggregates.
     */
    seller: IShoppingMallSeller.ISummary;

    /**
     * Currency code in which all aggregated monetary fields of this summary
     * are expressed.
     *
     * The value must match the currency codes stored in
     * `shopping_mall_seller_fee_charges.currency` and is typically an ISO
     * 4217 currency code such as `USD` or `KRW`.
     *
     * All total and breakdown amounts below are calculated in this single
     * currency context for consistency within a single summary object.
     */
    currency: string;

    /**
     * Inclusive lower bound of the reporting period for which fee charges
     * have been aggregated.
     *
     * This timestamp is typically derived from the `effective_date` column
     * on `shopping_mall_seller_fee_charges` and marks the first business
     * date included in the calculation.
     *
     * Clients can use this to label charts and to confirm which window of
     * time is represented in the summary.
     */
    period_start: string & tags.Format<"date-time">;

    /**
     * Exclusive upper bound of the reporting period for which fee charges
     * have been aggregated.
     *
     * This timestamp typically corresponds to the logical end of the
     * requested reporting range and is compared against the
     * `effective_date` of fee charge records.
     *
     * The `(period_start, period_end]` interval semantics should be applied
     * consistently by the backend so clients can request adjacent periods
     * without overlaps or gaps.
     */
    period_end: string & tags.Format<"date-time">;

    /**
     * Total absolute fee amount charged to the seller during the reporting
     * period, expressed in the selected `currency`.
     *
     * This value is the sum of `amount` across all
     * `shopping_mall_seller_fee_charges` rows in the period, with positive
     * amounts representing charges to the seller and negative amounts
     * representing fee reversals or credits.
     *
     * Use this metric to understand the overall monetary impact of all fee
     * types combined.
     */
    total_fee_amount: number;

    /**
     * Total tax portion associated with seller fee charges in the reporting
     * period, expressed in the same `currency`.
     *
     * This is derived from summing the `tax_amount` column on
     * `shopping_mall_seller_fee_charges` over the filtered set of rows.
     *
     * It helps finance and tax reporting processes understand how much of
     * the fee burden is attributable to tax obligations versus core
     * platform fees.
     */
    total_tax_amount: number;

    /**
     * Total amount of fee charges that contribute to platform revenue for
     * the selected seller and reporting period.
     *
     * This amount is computed by summing `amount` for records where
     * `is_platform_revenue` is true in `shopping_mall_seller_fee_charges`,
     * using the same currency as the summary.
     *
     * Business teams can use this field to track revenue performance by
     * seller segment without exposing individual fee rows.
     */
    total_platform_revenue_amount: number;

    /**
     * Total amount of fee charges that are classified as non‑revenue
     * pass‑through amounts during the reporting period.
     *
     * This value sums `amount` for records where `is_platform_revenue` is
     * false, such as third‑party handling charges collected on behalf of
     * logistics providers.
     *
     * Separating this from revenue fees supports accurate financial
     * reporting and helps sellers reconcile why total charges may exceed
     * platform revenue figures.
     */
    total_non_revenue_pass_through_amount: number;

    /**
     * Per‑fee‑type breakdown of fee and tax amounts within the reporting
     * period.
     *
     * Each element groups together all fee charge records sharing a common
     * `fee_type` value from `shopping_mall_seller_fee_charges`, allowing
     * clients to render stacked charts or detailed tables by fee category.
     *
     * This structure gives sellers fine‑grained insight into which kinds of
     * fees (for example transaction commissions or subscription fees)
     * dominate their total charges.
     */
    fee_type_breakdowns: IShoppingMallSellerFeeAnalyticsFeeTypeBreakdown.ISummary[];

    /**
     * Time‑series breakdown of fee and tax amounts per business day within
     * the reporting period.
     *
     * The backend typically groups fee charge records by the date component
     * of `effective_date` to build this series, enabling chart
     * visualizations such as line graphs or bar charts for day‑over‑day
     * trend analysis.
     *
     * Clients can use this array to plot how fee charges and platform
     * revenue evolve through the selected window, including the impact of
     * campaigns, seasonality, or policy changes.
     */
    daily_trends: IShoppingMallSellerFeeAnalyticsDailyTrend.ISummary[];
  };
}
