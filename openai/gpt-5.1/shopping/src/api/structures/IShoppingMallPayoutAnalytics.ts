import { tags } from "typia";

import { IEShoppingMallPayoutAnalyticsGroupBy } from "./IEShoppingMallPayoutAnalyticsGroupBy";
import { IShoppingMallAnalyticsTimeRange } from "./IShoppingMallAnalyticsTimeRange";
import { IShoppingMallPayoutAnalyticsSellerBreakdown } from "./IShoppingMallPayoutAnalyticsSellerBreakdown";
import { IShoppingMallPayoutAnalyticsPeriodBreakdown } from "./IShoppingMallPayoutAnalyticsPeriodBreakdown";

export namespace IShoppingMallPayoutAnalytics {
  /**
   * Filter and aggregation configuration for computing the seller payout
   * analytics summary in the admin analytics endpoint.
   *
   * This DTO is used as the PATCH request body for
   * `/shoppingMall/admin/analytics/payouts/summary`. It allows administrative
   * callers to specify time ranges, seller scopes, payout statuses,
   * currencies, and grouping dimensions that control how payout-related
   * metrics are aggregated. The analytics engine reads these parameters to
   * construct read-only queries primarily over
   * `shopping_mall_seller_earnings`, `shopping_mall_seller_payout_batches`,
   * and `shopping_mall_seller_payout_items`.
   *
   * Only the `groupBy` field is required. All other fields (`from`, `to`,
   * `sellerIds`, `payoutStatuses`, `currency`, and
   * `includeUnsettledEarnings`) are optional filters or configuration flags.
   * When optional fields are omitted, the backend applies platform-specific
   * defaults, such as using a recent default date range or including all
   * sellers, statuses, and settlement states.
   *
   * This request model does not map 1:1 to a single Prisma model row.
   * Instead, it defines the analytical projection window and segmentation for
   * summary results that are returned as
   * `IShoppingMallPayoutAnalytics.ISummary` and related breakdown DTOs.
   */
  export type IRequest = {
    /**
     * Optional inclusive start of the analytics time range, expressed as an
     * ISO 8601 date-time string.
     *
     * When provided together with `to`, the analytics engine restricts
     * payout and earning records to those that fall on or after this
     * timestamp. When omitted, the implementation may default to a
     * business-defined recent window (for example, the last 30 days) or the
     * earliest relevant data, depending on platform policy.
     *
     * The value must represent a valid timestamp in the platform’s
     * reporting time zone, and, when `to` is also provided, `from` must be
     * earlier than `to` to form a non-negative duration.
     */
    from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional exclusive end of the analytics time range, expressed as an
     * ISO 8601 date-time string.
     *
     * When provided together with `from`, the analytics engine restricts
     * payout and earning records to those that fall before this timestamp.
     * When omitted, the implementation may treat the effective end of the
     * range as the current time or another platform-defined cut-off.
     *
     * The value must represent a valid timestamp in the platform’s
     * reporting time zone. If both `from` and `to` are supplied, `to` must
     * be strictly later than `from`.
     */
    to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional list of seller identifiers whose payouts should be included
     * in this analytics query.
     *
     * Each element should correspond to a valid `shopping_mall_sellers.id`
     * value. When this array is provided and non-empty, the analytics
     * engine restricts computations to earnings and payouts associated with
     * these sellers only.
     *
     * When the field is omitted or the array is empty, the analytics scope
     * is broadened to include all sellers on the platform, subject to other
     * filters such as time range and payout status.
     */
    sellerIds?: string[] | undefined;

    /**
     * Optional list of payout lifecycle statuses to include in the
     * analytics computation.
     *
     * Typical values come from the platform’s payout lifecycle vocabulary
     * (for example, `pending`, `in_progress`, `completed`, or similar
     * domain-specific labels). The exact allowed values are defined by the
     * payout domain model and must be used consistently by clients.
     *
     * When this field is provided, only payout batches and items whose
     * status is contained in this list are used when computing totals. When
     * omitted, payouts in all statuses are considered unless the
     * implementation applies additional defaults.
     */
    payoutStatuses?: string[] | undefined;

    /**
     * Required list of dimensions by which to group the payout analytics
     * summary.
     *
     * Each element indicates a grouping axis such as seller, time bucket,
     * currency, or subscription plan. The analytics engine uses these
     * values to decide which breakdown arrays and aggregation keys to
     * produce in `IShoppingMallPayoutAnalytics.ISummary`.
     *
     * Supported values are defined in
     * `IEShoppingMallPayoutAnalyticsGroupBy`. Clients can specify multiple
     * dimensions in one request to obtain composite breakdowns as supported
     * by the implementation.
     */
    groupBy: IEShoppingMallPayoutAnalyticsGroupBy[];

    /**
     * Optional ISO 4217 currency code indicating the reporting currency for
     * aggregated monetary amounts.
     *
     * When provided, the analytics subsystem may convert underlying payout
     * and earning amounts into this reporting currency, using
     * platform-defined foreign exchange rules if the underlying data is
     * multi-currency. When omitted, the implementation may either aggregate
     * amounts in their native settlement currencies and expose them via
     * currency groupings, or apply a platform-default reporting currency.
     *
     * Clients should use standardized three-letter currency codes such as
     * `USD`, `EUR`, or `KRW` to ensure predictable behavior.
     */
    currency?: string | undefined;

    /**
     * Flag indicating whether earnings that have not yet been fully settled
     * into payout batches should be included in the analytics computation.
     *
     * When `true`, the analytics may combine both amounts already assigned
     * to payout batches and amounts that are still in an unsettled state in
     * `shopping_mall_seller_earnings`, allowing administrators to compare
     * potential future payouts with completed ones.
     *
     * When `false`, only amounts that are already associated with completed
     * or otherwise eligible payout batches are counted, focusing the
     * analytics strictly on settled payouts.
     */
    includeUnsettledEarnings?: boolean | undefined;
  };

  /**
   * Aggregated analytics summary of seller payouts across the shopping mall
   * platform.
   *
   * This DTO represents an analytics-friendly view summarizing seller
   * earnings and payout status derived primarily from
   * `shopping_mall_seller_earnings`, `shopping_mall_seller_payout_batches`,
   * and `shopping_mall_seller_payout_items`. Instead of exposing raw
   * transactional rows, it surfaces pre-aggregated metrics that can be
   * consumed directly by reporting dashboards, admin consoles, and financial
   * monitoring tools.
   *
   * The summary focuses on a specific analysis window defined by the request,
   * and it may be further constrained by seller scopes, payout status
   * filters, or grouping preferences such as seller, currency, or time
   * buckets. It provides both top-level aggregates (for example, total gross
   * earnings across all included sellers) and optional arrays of per-seller
   * and per-period breakdowns when the caller requests grouped analytics.
   *
   * Although this type is conceptually backed by multiple Prisma models, it
   * does not map 1:1 to a single table row. Instead, it is a computed read
   * model that combines and aggregates rows from earnings and payout-related
   * tables. Service implementations should therefore treat it as a pure
   * analytics projection, keeping the numerical relationships between fields
   * consistent with the underlying accounting logic and avoiding partial or
   * inconsistent population of related metrics.
   */
  export type ISummary = {
    /**
     * Total gross merchandise amount included in the analytics result.
     *
     * This corresponds to the sum of `gross_amount` values from
     * `shopping_mall_seller_earnings` that match the requested filters such
     * as time range, seller scope, and payout status. It represents the
     * full value of underlying transactions before any commissions, fees,
     * or discounts are applied.
     *
     * Downstream consumers typically use this field as the starting point
     * for revenue and GMV (gross merchandise value) analysis, trend charts,
     * and comparison against net earnings and paid-out amounts.
     */
    totalGrossAmount: number;

    /**
     * Total commission amount charged by the platform in the analytics
     * result.
     *
     * This value is derived from the sum of `commission_amount` fields in
     * `shopping_mall_seller_earnings` for all earnings that satisfy the
     * effective filters. It reflects platform revenue collected as
     * commissions over the analysis window.
     *
     * Finance, accounting, and business operations teams use this metric to
     * understand monetization effectiveness, to compare against gross
     * amounts and discounts, and to reconcile with general ledger data.
     */
    totalCommissionAmount: number;

    /**
     * Total amount of discounts funded by sellers within the analytics
     * scope.
     *
     * The value is computed by summing `seller_discount_amount` in
     * `shopping_mall_seller_earnings` for all matched earnings records,
     * after applying any requested filters. It captures the aggregate
     * volume of price reductions that sellers themselves have subsidized.
     *
     * This metric is often used to analyze seller promotional behavior,
     * measure the cost of seller-driven discounting programs, and compare
     * seller-subsidized promotions against platform-funded incentives.
     */
    totalSellerDiscountAmount: number;

    /**
     * Total amount of discounts funded by the platform within the analytics
     * scope.
     *
     * It corresponds to the aggregated `platform_discount_amount` values in
     * `shopping_mall_seller_earnings` for the selected filters. This
     * represents the net promotional cost borne by the platform itself,
     * such as coupon campaigns or sponsored discounts.
     *
     * Analysts and finance teams use this metric to evaluate marketing
     * spend effectiveness, track the cost of platform incentives over time,
     * and reconcile discount-related expenses against campaign budgets and
     * performance metrics.
     */
    totalPlatformDiscountAmount: number;

    /**
     * Total net earning amount owed to sellers in the analytics result.
     *
     * This is the aggregated `net_earning_amount` from
     * `shopping_mall_seller_earnings`, representing earnings after
     * commissions and seller-funded discounts have been applied but before
     * payout batch status is taken into account. In other words, it is what
     * sellers should receive from the platform for the included
     * transactions, regardless of whether the funds have already been paid
     * out.
     *
     * This metric is commonly used as the baseline for payout planning,
     * settlement forecasting, and comparison with both paid and pending
     * payout amounts.
     */
    totalNetEarningAmount: number;

    /**
     * Total amount that has already been paid out to sellers in the
     * analytics scope.
     *
     * This value is computed from `payout_amount` in
     * `shopping_mall_seller_payout_items` for payout items that match the
     * filters and whose status indicates that they have been successfully
     * executed (for example, completed payouts). It reflects cash or
     * clearing amounts that have left the platform toward sellers during
     * the analysis window.
     *
     * Reconciliation processes, settlement reporting, and treasury
     * operations reference this field when validating that paid amounts
     * match expectations derived from the earnings data and configured
     * payout policies.
     */
    totalPaidOutAmount: number;

    /**
     * Total amount that is still pending payout to sellers in the analytics
     * scope.
     *
     * This amount is derived by comparing eligible
     * `shopping_mall_seller_earnings` against their associated payout items
     * and payout batch statuses. It typically represents net earnings that
     * have not yet been associated with a completed payout batch, including
     * amounts in intermediate or scheduled states.
     *
     * Operations and finance teams use this metric to monitor outstanding
     * liabilities to sellers, prioritize payout batch creation or
     * execution, and detect unusual accumulation of unsettled earnings for
     * specific cohorts or time periods.
     */
    totalPendingPayoutAmount: number;

    /**
     * Primary ISO 4217 currency code for aggregated monetary values in this
     * summary.
     *
     * In single-currency deployments, all monetary amounts exposed by this
     * DTO are assumed to be in this currency (for example, "USD", "EUR", or
     * "KRW"). In multi-currency environments, the analytics layer may
     * either normalize values into a designated reporting currency or, when
     * normalization is not applied, leave this field empty or use a
     * sentinel value and rely on breakdowns for per-currency views.
     *
     * Client applications should treat this field as the canonical currency
     * for interpreting top-level aggregates and should fall back to more
     * detailed breakdowns or additional context when multi-currency
     * reporting is enabled.
     */
    currencyCode?: string | undefined;

    /**
     * Time range over which the analytics summary was computed.
     *
     * This structure reflects the effective time window actually used by
     * the analytics engine, which may be derived from the request DTO,
     * truncated to respect data retention boundaries, or normalized to
     * bucket-aligned start and end times. It ensures that consumers can
     * unambiguously understand the temporal scope of all aggregated
     * metrics.
     *
     * When rendering charts or reports, clients should display this range
     * alongside the numeric metrics so that operators and analysts can
     * clearly see the period that the summary covers.
     */
    timeRange?: IShoppingMallAnalyticsTimeRange | undefined;

    /**
     * Optional array of per-seller payout analytics breakdown entries.
     *
     * Each element summarizes payout-related metrics for a single seller,
     * including gross amounts, commissions, discounts, net earnings, and
     * paid versus pending payout amounts. These rows are typically
     * generated when the caller includes a grouping dimension such as
     * `seller` in the request.
     *
     * Admin dashboards and finance tools use this collection to power
     * per-seller tables, leaderboards, and drill-down views, enabling
     * operators to identify top performers, outliers, or sellers with
     * unusually high pending balances.
     */
    sellerBreakdowns?:
      | IShoppingMallPayoutAnalyticsSellerBreakdown[]
      | undefined;

    /**
     * Optional array of time-bucketed payout analytics breakdown entries.
     *
     * Each entry represents analytics computed for a specific time bucket,
     * such as a day, week, or month, depending on the grouping
     * configuration used in the request. The buckets together span the
     * overall `timeRange`, and their individual `from` and `to` values
     * describe precise per-period boundaries.
     *
     * This array is typically used for charting trends and visualizing the
     * evolution of earnings, commissions, and payout activity over time.
     * Clients can plot gross versus net earnings, paid versus pending
     * payouts, and other key metrics as time-series graphs sourced directly
     * from this data.
     */
    periodBreakdowns?:
      | IShoppingMallPayoutAnalyticsPeriodBreakdown[]
      | undefined;
  };
}
