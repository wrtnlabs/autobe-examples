import { tags } from "typia";

export namespace IShoppingMallPaymentMethodAnalytics {
  /**
   * Request payload for querying aggregated analytics statistics for payment
   * methods across the shoppingMall platform.
   *
   * This DTO encapsulates analytical query parameters for a read-only
   * endpoint that aggregates data from payment-related Prisma models and
   * snapshots, including `shopping_mall_payment_methods`,
   * `shopping_mall_order_payments`, `shopping_mall_order_payment_attempts`,
   * `shopping_mall_payment_status_histories`,
   * `shopping_mall_payment_refunds`, `shopping_mall_payment_chargebacks`, and
   * `shopping_mall_payment_method_stats`. Although it is not mapped to a
   * single Prisma table, its fields are designed to filter and group over
   * those underlying data sources.
   *
   * Administrators and analysts use this request type to define a time range,
   * choose which payment methods and regions to analyze, configure grouping
   * and time granularity, fine-tune value-based filters, and control sorting
   * and pagination of the aggregated result rows. The response is a paginated
   * collection of `IShoppingMallPaymentMethodAnalytics.ISummary` objects
   * wrapped in `IPageIShoppingMallPaymentMethodAnalytics.ISummary`.
   */
  export type IRequest = {
    /**
     * Inclusive start of the analysis time window in ISO 8601 date-time
     * format.
     *
     * This value bounds the earliest timestamp of payment-related records
     * and snapshot rows that participate in the aggregation. It is
     * typically interpreted in UTC or a platform-wide reporting timezone
     * and must be less than or equal to `to`.
     *
     * Choosing an appropriately sized window helps keep queries performant
     * and aligns the analytics with reporting periods such as days, weeks,
     * or months.
     */
    from: string & tags.Format<"date-time">;

    /**
     * Exclusive end of the analysis time window in ISO 8601 date-time
     * format.
     *
     * Records and snapshot rows with timestamps greater than or equal to
     * this value are excluded from the aggregation, making the window
     * effectively half-open `[from, to)`. The `to` timestamp must be
     * greater than or equal to `from` and is typically chosen to align with
     * the end of a reporting period.
     *
     * Together with `from`, this field defines the time range that
     * determines which payments, refunds, chargebacks, and snapshot entries
     * are considered for the computed KPIs.
     */
    to: string & tags.Format<"date-time">;

    /**
     * Optional list of payment method codes used to restrict the analytics
     * to specific payment rails.
     *
     * Each entry should correspond to a `code` value from the
     * `shopping_mall_payment_methods` Prisma model (for example `"card"`,
     * `"bank_transfer"`, or a gateway-specific code). When this array is
     * omitted or empty, all configured payment methods are eligible for
     * inclusion in the aggregation.
     *
     * Using this filter allows dashboards to focus on a subset of methods,
     * such as card payments only, or to compare performance between a small
     * set of methods without processing the entire catalog of payment
     * options.
     */
    paymentMethodCodes?: string[] | undefined;

    /**
     * Optional list of marketplace region codes used to scope analytics to
     * specific geographies.
     *
     * Values typically correspond to region or country codes defined in
     * master data tables such as `shopping_mall_regions` and
     * `shopping_mall_countries` (for example `"US"`, `"KR"`, or internal
     * region identifiers). When omitted or left empty, the analytics query
     * includes data from all supported regions.
     *
     * Applying region filters allows operators to compare payment method
     * performance across countries or sub-regions and to spot
     * geography-specific issues such as localized provider failures.
     */
    regionCodes?: string[] | undefined;

    /**
     * List of grouping dimensions used to aggregate analytics results.
     *
     * The contents of this array determine whether the output is grouped by
     * payment method, time, region, or a combination of those dimensions.
     * For example, `groupBy: ["paymentMethod", "date"]` yields per-method,
     * per-time-bucket summaries, while `groupBy: ["region"]` yields
     * region-only aggregates.
     *
     * If `groupBy` is omitted or empty, the server may default to a
     * sensible grouping strategy such as overall totals per payment method
     * or a global aggregate, depending on platform policy.
     */
    groupBy?: ("paymentMethod" | "date" | "region")[] | undefined;

    /**
     * Time granularity used when grouping analytics by date.
     *
     * This field only takes effect when `groupBy` includes the `date`
     * dimension; when `date` is not part of `groupBy`, `granularity` is
     * ignored. It determines the size of the time buckets (for example
     * hourly, daily, weekly, or monthly) used to group payment method
     * metrics over the `[from, to)` interval.
     *
     * Choosing finer granularity yields more detailed time series at the
     * cost of more result rows, while coarse granularity provides a compact
     * overview across longer periods.
     */
    granularity?: "hour" | "day" | "week" | "month" | undefined;

    /**
     * Optional lower bound filter for total aggregated monetary amounts in
     * each analytics slice.
     *
     * When provided, result rows whose aggregated monetary metric (for
     * example total paid amount or GMV processed by the method) falls
     * strictly below this value may be excluded from the response. The
     * exact metric used for filtering is defined by the analytics
     * implementation and documentation.
     *
     * Setting `minTotalAmount` can help focus on slices that are materially
     * significant, avoiding clutter from very low-volume combinations of
     * payment method, region, and date.
     */
    minTotalAmount?: number | undefined;

    /**
     * Optional upper bound filter for total aggregated monetary amounts in
     * each analytics slice.
     *
     * When provided, result rows whose aggregated monetary metric exceeds
     * this value may be excluded from the response, allowing operators to
     * isolate lower-value segments or check behavior below certain
     * thresholds.
     *
     * Combined with `minTotalAmount`, this field defines an inclusive
     * numeric window for the aggregated amount used in analytics, applied
     * per result row rather than per individual transaction.
     */
    maxTotalAmount?: number | undefined;

    /**
     * Flag indicating whether refund-related metrics should be included in
     * the analytics computation.
     *
     * When set to `true`, the analytics engine calculates and exposes
     * refund-related values such as refund counts, refunded amounts, and
     * refund ratios derived from sources like
     * `shopping_mall_payment_refunds`. When `false`, those metrics may be
     * omitted from the response or computed as zeros, depending on the
     * implementation.
     *
     * Toggling this flag allows clients to trade off between query
     * complexity and insight: disabling refunds can make computation
     * cheaper when only pure payment performance is of interest.
     */
    includeRefunds?: boolean | undefined;

    /**
     * Flag indicating whether chargeback-related metrics should be included
     * in the analytics computation.
     *
     * When `true`, additional KPIs such as chargeback counts and chargeback
     * amounts (sourced from `shopping_mall_payment_chargebacks` and related
     * tables) are calculated and surfaced in the analytics summaries. When
     * `false`, those chargeback-specific metrics are typically skipped to
     * reduce query complexity.
     *
     * This option is useful for switching between general payment
     * performance views and risk-focused views that require chargeback
     * insights.
     */
    includeChargebacks?: boolean | undefined;

    /**
     * Field used to sort the aggregated analytics rows in the response.
     *
     * Supported values correspond to derived metrics such as total
     * processed amount, payment count, success rate, refund rate, or
     * chargeback rate for each aggregated row. The exact mapping between
     * sort field and underlying metric is defined by the analytics
     * implementation but should be documented alongside the endpoint.
     *
     * Sorting is applied after aggregation and in combination with
     * `sortDirection`, and affects the order of rows returned within each
     * page controlled by `page` and `limit`.
     */
    sortBy?:
      | "totalAmount"
      | "paymentCount"
      | "successRate"
      | "refundRate"
      | "chargebackRate"
      | undefined;

    /**
     * Direction in which to sort the aggregated analytics rows.
     *
     * Use `asc` to obtain rows in ascending order of the chosen `sortBy`
     * metric and `desc` for descending order. When omitted, the server may
     * choose a sensible default (commonly `desc` for metrics like total
     * amount or count) to present the most significant slices first.
     *
     * Sort direction interacts with pagination: combined with `page` and
     * `limit`, it determines which segments appear on each page of
     * results.
     */
    sortDirection?: "asc" | "desc" | undefined;

    /**
     * Page index for paginated analytics results, starting from 1.
     *
     * This field controls which page of aggregated rows is returned. For
     * example, `page = 1` with a given `limit` retrieves the first page of
     * analytics slices according to the chosen sort order, and `page = 2`
     * retrieves the next page.
     *
     * If omitted, the server may default to the first page (typically page
     * 1) as a convenience for callers that do not need fine-grained
     * pagination control.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of analytics summary rows to return in a single page.
     *
     * This value is applied after aggregation, sorting, and filtering, and
     * therefore determines how many
     * `IShoppingMallPaymentMethodAnalytics.ISummary` rows appear in each
     * response page. It should be set to a reasonable value to balance
     * completeness of information and response size.
     *
     * If omitted, the server may apply a platform-default limit (for
     * example 20, 50, or 100) to prevent excessively large pages while
     * still returning a useful subset of the analytics results.
     */
    limit?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;
  };

  /**
   * Summary view of payment method performance analytics for reporting and
   * dashboard use.
   *
   * This DTO aggregates key daily metrics for a single payment method,
   * combining configuration data from the payment method master table with
   * numeric statistics from the payment method statistics snapshot table.
   *
   * It is optimized for list and chart views where operators or analysts
   * review success rates, failure patterns, and monetization performance per
   * payment rail.
   */
  export type ISummary = {
    /**
     * Business identifier of the payment method being summarized.
     *
     * This corresponds to `shopping_mall_payment_methods.code` and uniquely
     * identifies the logical payment method such as `card`,
     * `bank_transfer`, or provider-specific codes.
     *
     * Client applications use this code to correlate analytics rows with
     * payment method configuration records and labels.
     */
    payment_method_code: string;

    /**
     * Human-readable name of the payment method used for display in
     * analytics UIs.
     *
     * Typically derived from `shopping_mall_payment_methods.display_name`,
     * for example "Credit Card" or "Bank Transfer".
     *
     * This value helps operators quickly recognize the payment method
     * without relying solely on technical codes.
     */
    payment_method_display_name: string;

    /**
     * High-level provider type or gateway family for this payment method.
     *
     * Values mirror `shopping_mall_payment_methods.provider_type`, such as
     * `card_processor`, `bank_gateway`, `wallet`, or `cod`.
     *
     * Analytics tools can group methods by provider type to understand
     * performance across similar rails.
     */
    provider_type: string;

    /**
     * Current business lifecycle status of the payment method.
     *
     * This usually reflects `shopping_mall_payment_methods.status`, for
     * example `active` or `disabled`, and indicates whether the method is
     * currently selectable at checkout.
     *
     * Consumers can use this to filter analytics to only active methods or
     * to compare historical results for disabled methods.
     */
    status: string;

    /**
     * Calendar date for which the aggregated metrics are calculated.
     *
     * This maps to `shopping_mall_payment_method_stats.stats_date`, which
     * is typically normalized to midnight UTC for consistency.
     *
     * Dashboards often use this field as the X-axis key when rendering time
     * series charts per payment method.
     */
    stats_date: string & tags.Format<"date-time">;

    /**
     * Number of payment attempts initiated using this payment method on the
     * given stats date.
     *
     * This equals
     * `shopping_mall_payment_method_stats.payment_attempt_count` and
     * includes all attempts regardless of eventual outcome.
     *
     * It is the primary volume metric and the denominator for success,
     * failure, and expiry rates.
     */
    payment_attempt_count: number & tags.Type<"int32">;

    /**
     * Number of payment attempts that completed successfully (paid) for
     * this method on the stats date.
     *
     * This mirrors
     * `shopping_mall_payment_method_stats.payment_success_count` and
     * directly contributes to revenue recognition.
     *
     * Combined with attempts, it allows consumers to compute success ratios
     * per method.
     */
    payment_success_count: number & tags.Type<"int32">;

    /**
     * Number of payment attempts that definitively failed or were declined
     * for this method on the stats date.
     *
     * This corresponds to
     * `shopping_mall_payment_method_stats.payment_failure_count`.
     *
     * Operators monitor this metric to detect degradation of provider
     * quality or configuration issues.
     */
    payment_failure_count: number & tags.Type<"int32">;

    /**
     * Number of payment attempts that expired without reaching a success or
     * failure outcome on the stats date.
     *
     * This equals
     * `shopping_mall_payment_method_stats.payment_expired_count` and
     * typically represents timeouts or abandoned flows.
     *
     * High expiry counts can indicate UX problems or provider latency
     * issues.
     */
    payment_expired_count: number & tags.Type<"int32">;

    /**
     * GMV amount associated with successful payments for this method on the
     * stats date, in platform base currency.
     *
     * This maps to `shopping_mall_payment_method_stats.paid_gmv_amount` and
     * represents the revenue volume processed through the method.
     *
     * Finance and operations teams use this metric to understand the
     * financial importance of each method.
     */
    paid_gmv_amount: number;

    /**
     * Total amount refunded for payments that used this method on the stats
     * date, in platform base currency.
     *
     * This is taken from
     * `shopping_mall_payment_method_stats.refunded_amount` and aggregates
     * all refunds associated with the method.
     *
     * It provides insight into the quality of orders processed via the
     * method and potential customer dissatisfaction.
     */
    refunded_amount: number;

    /**
     * Total chargeback amount related to this payment method on the stats
     * date, in platform base currency.
     *
     * This corresponds to
     * `shopping_mall_payment_method_stats.chargeback_amount` and reflects
     * the financial risk or loss associated with disputes and fraudulent
     * transactions.
     *
     * Risk and finance teams track this metric closely when assessing
     * method-level risk exposure.
     */
    chargeback_amount: number;
  };
}
