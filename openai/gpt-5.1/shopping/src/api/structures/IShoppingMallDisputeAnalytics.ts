import { tags } from "typia";

import { IShoppingMallDisputeStatus } from "./IShoppingMallDisputeStatus";

export namespace IShoppingMallDisputeAnalytics {
  /**
   * Filter, segmentation, and granularity options for computing dispute
   * analytics over the shopping_mall_order_disputes data set.
   *
   * This DTO is used by platform administrators and risk analysts to request
   * aggregated dispute statistics across the entire shopping mall. It
   * represents a purely analytical, read-only query contract and does not map
   * directly to a single Prisma model. Instead, its fields control how
   * underlying shopping_mall_order_disputes and related tables are filtered
   * and grouped for analytics.
   *
   * All fields are optional; when omitted, the backend applies sensible
   * defaults such as a recent time window and standard aggregation
   * granularity.
   */
  export type IRequest = {
    /**
     * Time window over which disputes are analyzed.
     *
     * If omitted, the implementation may default to a recent period such as
     * the last 30 days. Both start and end timestamps are inclusive and
     * must follow ISO 8601 date-time format in UTC.
     */
    dateRange?: IShoppingMallDisputeAnalytics.IDateRange | undefined;

    /**
     * Optional list of dispute statuses to include in the analytics.
     *
     * When provided, only disputes whose status is one of the specified
     * values are included. If omitted or empty, all statuses are
     * considered.
     */
    statusFilters?: IShoppingMallDisputeStatus[] | undefined;

    /**
     * Optional list of high-level dispute reason categories to filter on,
     * such as non_delivery, damaged_item, wrong_item, or service_issue.
     *
     * Exact values are platform-defined and should match the categorical
     * reason codes stored on disputes.
     */
    reasonCategoryFilters?: string[] | undefined;

    /**
     * Optional segmentation filters describing which seller cohorts to
     * include in analytics.
     *
     * Each segment filter can represent a logical cohort such as
     * high_volume_sellers, new_sellers, or certain performance bands.
     */
    sellerSegments?:
      | IShoppingMallDisputeAnalytics.ISellerSegmentFilter[]
      | undefined;

    /**
     * Optional segmentation filters describing which customer cohorts to
     * include in analytics.
     *
     * Typical segments include new_customers, repeat_customers,
     * high_value_customers, or specific risk bands.
     */
    customerSegments?:
      | IShoppingMallDisputeAnalytics.ICustomerSegmentFilter[]
      | undefined;

    /**
     * Optional constraints that limit disputes to those associated with
     * orders matching specific characteristics.
     *
     * Examples include filtering by payment method, fulfillment status, or
     * minimum order amount.
     */
    orderConstraints?:
      | IShoppingMallDisputeAnalytics.IOrderConstraintFilter
      | undefined;

    /**
     * Requested granularity for time-series aggregations.
     *
     * Determines whether analytics should be bucketed by day, week, or
     * month. If omitted, the implementation may choose a default based on
     * the dateRange length.
     */
    timeGranularity?:
      | IShoppingMallDisputeAnalytics.IETimeGranularity
      | undefined;

    /**
     * Whether to include seller-level breakdowns in the analytics response.
     *
     * When true, the response may include per-seller dispute counts, rates,
     * and performance metrics. When false, these breakdowns are omitted for
     * performance.
     */
    includeSellerBreakdown?: boolean | undefined;

    /**
     * Whether to include customer-level breakdowns in the analytics
     * response.
     *
     * When true, the response may include segment-level analytics for
     * customer cohorts such as dispute rates by segment. When false, these
     * breakdowns are omitted.
     */
    includeCustomerBreakdown?: boolean | undefined;

    /**
     * Whether to include dispute reason category breakdowns in the
     * analytics response.
     *
     * When true, the response includes counts and rates grouped by dispute
     * reason categories. When false, these aggregations are omitted.
     */
    includeReasonBreakdown?: boolean | undefined;
  };

  /**
   * Date range boundaries for dispute analytics queries.
   *
   * Represents an inclusive time window used to select disputes based on
   * creation or event timestamps. The exact timestamp field used by the
   * backend (e.g., created_at or opened_at) is implementation-defined but
   * consistent across usages of this DTO.
   */
  export type IDateRange = {
    /**
     * Inclusive lower bound timestamp (ISO 8601, UTC) for the analytics
     * time window.
     *
     * Disputes whose relevant timestamp is on or after this value are
     * included.
     */
    start: string & tags.Format<"date-time">;

    /**
     * Inclusive upper bound timestamp (ISO 8601, UTC) for the analytics
     * time window.
     *
     * Disputes whose relevant timestamp is on or before this value are
     * included.
     */
    end: string & tags.Format<"date-time">;
  };

  /**
   * Segmentation filter describing a cohort of sellers to include in dispute
   * analytics.
   *
   * This structure allows admin dashboards to slice dispute metrics by seller
   * characteristics such as performance tier, region, or business category.
   * It is purely analytical and does not map to a single Prisma model.
   */
  export type ISellerSegmentFilter = {
    /**
     * Identifier for the seller segment dimension, such as
     * performance_tier, seller_region, or business_category.
     *
     * The exact keys are platform-defined and must be recognized by the
     * analytics implementation.
     */
    segmentKey: string;

    /**
     * One or more values within the specified seller segment dimension to
     * include in analytics.
     *
     * For example, ["gold","platinum"] for performance_tier, or ["KR","US"]
     * for seller_region.
     */
    segmentValues: string[];
  };

  /**
   * Segmentation filter describing a cohort of customers to include when
   * computing dispute analytics.
   *
   * This structure focuses on customer-centric attributes such as lifecycle
   * stage, risk band, or loyalty tier and is evaluated against the customer
   * identity associated with each dispute, not directly against order rows.
   * It is designed as a reusable analytics helper so that different endpoints
   * can share consistent customer segmentation logic.
   *
   * In practice, this filter is usually combined with other analytical
   * dimensions such as date ranges, seller segments, and order-level
   * constraint filters. Only disputes whose associated customers satisfy this
   * segment filter (in addition to any other active filters) are included in
   * the analytics result set.
   */
  export type ICustomerSegmentFilter = {
    /**
     * Identifier for the customer segment dimension that this filter
     * applies to, such as `lifecycle_stage`, `risk_band`, or
     * `loyalty_tier`.
     *
     * The value must match a platform-defined analytics dimension key that
     * the backend recognizes when resolving customer attributes for dispute
     * analytics. Implementations are expected to validate this key against
     * a configured catalog of supported segment dimensions and either
     * reject unsupported values or apply a clearly documented fallback.
     *
     * Typical examples include:
     *
     * - `lifecycle_stage` to segment new, returning, and dormant customers
     * - `risk_band` to differentiate low-, medium-, and high-risk customers
     * - `loyalty_tier` to represent loyalty program levels or spend tiers.
     */
    segmentKey: string;

    /**
     * One or more values within the specified customer segment dimension to
     * include in analytics.
     *
     * Within this list the semantics are logical OR: a customer is
     * considered part of the cohort if their attribute value for the
     * selected `segmentKey` matches **any** of the entries in
     * `segmentValues`. All values must belong to the same dimension named
     * by `segmentKey`; mixing values from different conceptual dimensions
     * (for example lifecycle and risk band) is not supported and should be
     * prevented at the caller or validation layer.
     *
     * Callers should ensure that the provided values stay synchronized with
     * the platform configuration that defines lifecycle stages, risk bands,
     * loyalty tiers, or other segment values. Misspelled or deprecated
     * values may lead to confusing analytics where the filter technically
     * applies but yields no matching customers.
     */
    segmentValues: string[];
  };

  /**
   * Optional order-level constraints applied when computing dispute
   * analytics.
   *
   * This DTO does not mirror a single Prisma model; instead it bundles
   * together filters on attributes that conceptually originate from orders,
   * payments, and fulfillment entities. When present, these constraints are
   * layered on top of the base dispute selection so that only disputes linked
   * to orders matching the specified criteria are included in the analysis
   * window.
   *
   * Common scenarios include restricting analytics to specific payment
   * instruments (for example, card vs. wallet), focusing on disputes for
   * orders that have reached particular fulfillment states (such as delivered
   * or partially delivered), or analyzing disputes only for orders within
   * certain monetary bands using `minOrderAmount` and `maxOrderAmount`.
   */
  export type IOrderConstraintFilter = {
    /**
     * Optional list of payment method codes restricting analytics to
     * disputes arising from orders paid with specific methods.
     *
     * When this field is omitted, the analytics engine does not restrict by
     * payment method and considers disputes for orders paid with any
     * supported instrument. When it is supplied with one or more codes,
     * only disputes for orders whose payment method matches **at least
     * one** of the codes in this list are included in the result.
     *
     * Client applications should keep these codes synchronized with entries
     * in the `shopping_mall_payment_methods` table to avoid filters that
     * technically run but inadvertently yield no results. Implementations
     * should document whether an explicitly empty array is treated as "no
     * restriction" or a degenerate filter and, in general, callers should
     * prefer omitting the field to represent "no restriction".
     */
    paymentMethodCodes?: string[] | undefined;

    /**
     * Optional list of fulfillment status codes restricting analytics to
     * disputes associated with orders in certain fulfillment states.
     *
     * If this field is omitted, dispute analytics include orders regardless
     * of their current fulfillment or shipping state, from pre-shipment
     * through delivery or cancellation. When provided, only disputes tied
     * to orders whose effective fulfillment status matches **any** of the
     * entries in this list are included.
     *
     * Typical usage patterns include focusing on disputes after delivery
     * (for example using only `DELIVERED` states) or diagnosing operational
     * issues for in-transit orders. Callers should use status values that
     * exactly match the platform’s canonical status codes so that filters
     * behave predictably.
     */
    fulfillmentStatuses?: string[] | undefined;

    /**
     * Optional minimum order total amount threshold for including a dispute
     * in analytics.
     *
     * When specified, only disputes whose associated orders have a total
     * value **greater than or equal to** this amount are counted. The
     * currency and unit are determined by the surrounding analytics
     * configuration (for example the platform base currency or a
     * report-specific currency), and callers must ensure that this
     * threshold is expressed in the same context as other monetary
     * parameters used in the request.
     *
     * Backends should define how they handle edge cases such as extremely
     * large values or combinations where `minOrderAmount` exceeds
     * `maxOrderAmount`, either by returning a validation error or by
     * treating such ranges as yielding an empty result set.
     */
    minOrderAmount?: number | undefined;

    /**
     * Optional maximum order total amount threshold for including a dispute
     * in analytics.
     *
     * When specified, only disputes whose associated orders have a total
     * value **less than or equal to** this amount are counted. As with
     * `minOrderAmount`, the numeric value must use the same currency and
     * unit conventions as the rest of the analytics request so that the
     * resulting filters are interpretable by operators.
     *
     * When both `minOrderAmount` and `maxOrderAmount` are provided, they
     * define an inclusive monetary band on the order total. Clients should
     * take care to configure ranges where `minOrderAmount` is less than or
     * equal to `maxOrderAmount` in order to avoid unintentionally excluding
     * all disputes from the analysis.
     */
    maxOrderAmount?: number | undefined;
  };

  /**
   * Enumeration of supported time-series aggregation granularities for
   * dispute analytics.
   *
   * Determines the size of time buckets when generating time-series metrics
   * such as dispute counts over time.
   */
  export type IETimeGranularity = "daily" | "weekly" | "monthly";

  /**
   * Aggregated dispute analytics metrics and breakdowns derived from the
   * shopping_mall_order_disputes and related tables.
   *
   * This DTO is returned by the platform-wide dispute analytics endpoint used
   * in admin dashboards and risk monitoring tools. It encapsulates total
   * volumes, distributions by status and reason, time-series trends, and
   * optional breakdowns by seller and customer segments.
   *
   * All fields represent computed, read-only values. The DTO does not map
   * directly to a single Prisma model; instead, it aggregates data from
   * shopping_mall_order_disputes, shopping_mall_order_dispute_of_customers,
   * shopping_mall_order_dispute_of_sellers,
   * shopping_mall_dispute_resolution_logs, and related order/payment tables.
   */
  export type IResponse = {
    /**
     * Total number of disputes matching the requested filters within the
     * selected time window.
     */
    totalDisputes: number & tags.Type<"int32">;

    /**
     * Number of disputes currently in the open status within the filtered
     * set.
     */
    openDisputes: number & tags.Type<"int32">;

    /**
     * Number of disputes currently in the under_review status within the
     * filtered set.
     */
    underReviewDisputes: number & tags.Type<"int32">;

    /**
     * Number of disputes currently in the resolved status within the
     * filtered set.
     */
    resolvedDisputes: number & tags.Type<"int32">;

    /**
     * Number of disputes currently in the escalated status within the
     * filtered set.
     */
    escalatedDisputes: number & tags.Type<"int32">;

    /**
     * Number of disputes currently in the closed status within the filtered
     * set.
     */
    closedDisputes: number & tags.Type<"int32">;

    /**
     * Dispute rate expressed as the number of disputes per 1,000 orders in
     * the filtered time window.
     *
     * The denominator is the total number of orders that satisfy the same
     * filters as the disputes.
     */
    disputeRatePerThousandOrders: number;

    /**
     * Average time required to resolve disputes, measured in hours.
     *
     * Calculated using resolution timestamps from
     * shopping_mall_dispute_resolution_logs for disputes that have been
     * resolved within the filtered set.
     */
    averageResolutionTimeHours: number;

    /**
     * 90th percentile of resolution time in hours for resolved disputes
     * within the filtered set.
     *
     * Useful for understanding worst-case resolution performance.
     */
    p90ResolutionTimeHours: number;

    /**
     * Distribution of disputes by status, represented as counts and
     * optional percentages.
     *
     * This structure provides a more detailed breakdown than the top-level
     * counts.
     */
    statusDistribution: IShoppingMallDisputeAnalytics.IStatusDistribution;

    /**
     * Distribution of disputes by reason category, represented as counts
     * and optional percentages for each category.
     *
     * Only populated when the request asked to include reason breakdowns.
     */
    reasonDistribution: IShoppingMallDisputeAnalytics.IReasonDistribution;

    /**
     * Time-series of dispute metrics over the requested date range,
     * bucketed using the requested granularity.
     *
     * Each point represents aggregated values for a single day, week, or
     * month.
     */
    timeSeries: IShoppingMallDisputeAnalytics.ITimeSeriesPoint[];

    /**
     * Optional list of sellers with the highest dispute rates within the
     * filtered window.
     *
     * Only populated when the request includes seller breakdowns and the
     * backend is configured to compute these metrics.
     */
    topSellersByDisputeRate?:
      | IShoppingMallDisputeAnalytics.ISellerDisputeMetric[]
      | undefined;

    /**
     * Optional list of customer segments that exhibit the highest dispute
     * rates in the filtered window.
     *
     * Only populated when the request includes customer breakdowns.
     */
    topCustomerSegmentsByDisputeRate?:
      | IShoppingMallDisputeAnalytics.ICustomerSegmentDisputeMetric[]
      | undefined;
  };

  /**
   * Distribution of order-related disputes by their normalized business
   * status, computed from the `shopping_mall_order_disputes` table and any
   * joined analytical views.
   *
   * This object represents the result of an analytics query for a specific
   * filter set (such as date range, seller segment, customer cohort, or
   * region). The `byStatus` collection contains one bucket per dispute status
   * that has at least one matching record in the filtered population.
   *
   * Consumers MUST NOT assume that all possible dispute statuses will appear
   * in the `byStatus` array. If no disputes exist for a given status in the
   * filtered set, that status may simply be omitted. Likewise, the array may
   * legitimately be empty when the filter criteria match no disputes at all.
   *
   * The order of elements in `byStatus` is not guaranteed and should not be
   * relied upon for business logic. Client dashboards are expected to sort or
   * group the buckets as needed for visualization.
   *
   * This DTO is a read-only analytical projection and is never persisted
   * directly; it is derived at query time from transactional data models
   * rather than mapped one-to-one to a single Prisma entity.
   */
  export type IStatusDistribution = {
    /**
     * Collection of per-status analytics buckets for the current dispute
     * query.
     *
     * Each bucket corresponds to a single `IShoppingMallDisputeStatus`
     * value that appears at least once in the filtered dispute set and
     * exposes the absolute count of disputes in that status and,
     * optionally, the percentage of the total.
     *
     * The set of buckets is determined entirely by the upstream analytics
     * filters (for example, date range, seller, customer segment, or
     * region). Implementations SHOULD treat this array as the authoritative
     * source for per-status counts for the given query, rather than
     * re‑deriving the distribution on the client side.
     */
    byStatus: IShoppingMallDisputeAnalytics.IStatusBucket[];
  };

  /**
   * Single analytics bucket aggregating disputes that currently share a
   * specific normalized business status.
   *
   * Each bucket originates from one or more rows in the
   * `shopping_mall_order_disputes` table that satisfy the analytics request
   * filters and whose status is mapped to the given
   * `IShoppingMallDisputeStatus` value.
   *
   * This structure is optimized for charting and tabular reporting: `count`
   * exposes the raw number of matching disputes, while `percentage`, when
   * present, expresses the relative share of this status among all disputes
   * in the filtered set.
   */
  export type IStatusBucket = {
    /**
     * Normalized business status assigned to all disputes represented by
     * this bucket.
     *
     * This value is derived from the underlying dispute lifecycle fields on
     * the `shopping_mall_order_disputes` model and indicates where the
     * dispute currently resides in the after‑sales handling process (for
     * example, newly opened, under active review, escalated for special
     * handling, resolved, or fully closed).
     */
    status: IShoppingMallDisputeStatus;

    /**
     * Total number of disputes in this status within the current analytics
     * filter scope.
     *
     * This is a non‑negative integer calculated over the subset of disputes
     * that match the request criteria (such as date window, seller,
     * customer segment, or region). Client code may sum the `count` values
     * across all buckets to obtain the total dispute volume for the query.
     */
    count: number & tags.Type<"int32">;

    /**
     * Optional percentage share of this status out of the total number of
     * disputes in the filtered analytics set.
     *
     * The value is typically expressed as a real number between 0 and 100
     * inclusive. Implementations may apply rounding, so the sum of
     * `percentage` values across all buckets may not equal exactly 100.
     * Consumers should treat this field as a convenience for visualization
     * rather than a source of exact high‑precision ratios.
     */
    percentage?: number | undefined;
  };

  /**
   * Distribution of disputes by reason category within a given analytics
   * scope.
   *
   * This type represents an aggregated view computed from the
   * `shopping_mall_order_disputes` table and related entities after all
   * filters and constraints from the dispute analytics request have been
   * applied (for example, date range, seller or customer cohorts, order
   * constraints, and time granularity).
   *
   * The distribution groups all matching disputes by their primary business
   * reason code, such as `non_delivery`, `damaged_item`, or `service_issue`,
   * and summarizes how frequently each category occurs. Consumers typically
   * use this DTO to power dashboards, reports, or monitoring views that
   * highlight the dominant causes of disputes in the selected slice of data.
   */
  export type IReasonDistribution = {
    /**
     * Array of aggregated dispute buckets grouped by reason category for
     * the current analytics scope.
     *
     * Each element in this collection represents a single logical dispute
     * reason category and contains both raw counts and optional percentage
     * information for that category. Implementations SHOULD ensure that
     * each reason category appears at most once in this array for a given
     * response so clients do not need to merge duplicate buckets.
     *
     * When no disputes match the analytics request filters, this array is
     * returned as an empty list. Buckets are commonly ordered in descending
     * order of `count` to make the most frequent reasons appear first, but
     * clients must not rely on a specific ordering unless explicitly
     * documented by the corresponding API operation.
     */
    byReason: IShoppingMallDisputeAnalytics.IReasonBucket[];
  };

  /**
   * Single aggregated analytics bucket for a specific dispute reason
   * category.
   *
   * Each bucket summarizes how many disputes fall into a particular business
   * reason category within the analytics scope defined by the parent request
   * (for example, date range, seller or customer segment, and other filters).
   * The bucket may additionally expose the percentage share of that reason
   * relative to all disputes in the same filtered data set.
   *
   * These buckets are computed from `shopping_mall_order_disputes` records
   * and related tables and are intended for read‑only analytics and
   * reporting. They do not correspond to a single row in the database but
   * rather to an aggregate projection over many disputes.
   */
  export type IReasonBucket = {
    /**
     * Dispute reason category code represented by this bucket.
     *
     * This value is a platform-defined, machine-oriented code (typically in
     * `snake_case`) that classifies the primary cause of the dispute, for
     * example `non_delivery`, `damaged_item`, `wrong_item_received`, or
     * `service_quality_issue`. It MUST correspond to one of the supported
     * reason codes attached to dispute records in the underlying data
     * model.
     *
     * Client applications should treat this field as an opaque code and
     * resolve it to human‑readable labels and localized descriptions using
     * their own mapping tables or configuration, rather than attempting to
     * parse or infer meaning directly from the code string.
     */
    reasonCategory: string;

    /**
     * Number of disputes in the analytics result set that are classified
     * with this reason category.
     *
     * The count is computed AFTER applying all filters from the surrounding
     * analytics request, including date range, seller or customer segments,
     * order constraints, and any additional conditions. Therefore, it
     * always represents the number of matching disputes for this specific
     * bucket within the same filtered population and not a global,
     * platform‑wide count.
     *
     * The value is always a non‑negative integer (0 or greater). A value of
     * `0` is uncommon but can appear in edge cases where a bucket key is
     * included for completeness even though no disputes currently match it
     * in the filtered data.
     */
    count: number & tags.Type<"int32">;

    /**
     * Optional percentage share of disputes in this bucket relative to the
     * total number of disputes in the same filtered analytics scope.
     *
     * The value is expressed as a numeric percentage in the inclusive range
     * from 0 to 100, for example `37.5` for thirty‑seven and a half
     * percent. Implementations typically compute this value as
     * `(bucket_count / total_count) * 100` and MAY apply rounding to a
     * reasonable number of decimal places. Because of rounding and possible
     * exclusion of certain categories, the sum of percentages across all
     * buckets in a distribution may not be exactly 100.
     *
     * This field may be omitted when the API chooses not to compute
     * percentage information, for example to optimize performance for large
     * data sets or when only raw counts are required by the client.
     */
    percentage?: number | undefined;
  };

  /**
   * Aggregated dispute analytics for a single time bucket within a dispute
   * time series.
   *
   * This object is a derived analytical projection built over the underlying
   * shopping_mall_order_disputes data set and related order tables. It does
   * not correspond to a single Prisma row but instead summarizes how many
   * disputes occurred and how frequently they occurred relative to order
   * volume within a specific bucket of the overall analysis window.
   *
   * The size and alignment of each bucket (for example, day, week, or month
   * boundaries) are controlled by the time granularity and date range
   * parameters in the parent IShoppingMallDisputeAnalytics.IRequest that
   * produced this result.
   */
  export type ITimeSeriesPoint = {
    /**
     * ISO 8601 timestamp in UTC representing the inclusive start of this
     * analytical time bucket.
     *
     * All disputes whose relevant timestamp (typically the dispute creation
     * timestamp, or a configured business timestamp in the analytics
     * request) is greater than or equal to this value and strictly less
     * than the next bucket's start belong to this bucket.
     */
    bucketStart: string & tags.Format<"date-time">;

    /**
     * ISO 8601 timestamp in UTC representing the inclusive end boundary
     * used to materialize this time bucket.
     *
     * The [bucketStart, bucketEnd] pair defines the exact interval of the
     * analysis window covered by this point. Implementations typically
     * treat bucketEnd as the last instant included in the bucket when
     * computing dispute and order aggregates.
     */
    bucketEnd: string & tags.Format<"date-time">;

    /**
     * Total number of disputes whose relevant timestamp falls inside this
     * time bucket.
     *
     * The relevant timestamp is usually the dispute creation time or
     * another primary business timestamp as defined by the analytics query.
     * This value is an aggregate count across all qualifying orders and
     * actors, not the count of rows from a single Prisma table only.
     */
    totalDisputes: number & tags.Type<"int32">;

    /**
     * Dispute rate per 1,000 qualifying orders observed within this time
     * bucket.
     *
     * This value is computed as:
     *
     * `(number of disputes in this bucket / number of successfully placed
     * orders in this bucket) * 1000`.
     *
     * The numerator and denominator both respect the same filters, actor
     * scopes, and date range that were specified in the parent dispute
     * analytics request, so clients can safely compare this rate across
     * buckets within the same response.
     */
    disputeRatePerThousandOrders: number;
  };

  /**
   * Analytics metrics for a specific seller within a dispute analytics
   * response.
   *
   * Each instance represents aggregated dispute behaviour for a single seller
   * over the same filtered time window and constraints that were used in the
   * parent IShoppingMallDisputeAnalytics.IRequest.
   *
   * These metrics are computed at query time from
   * shopping_mall_order_disputes and related order/payment data and are
   * exposed as read-only analytics values that help operators and reporting
   * tools compare seller performance and risk levels.
   */
  export type ISellerDisputeMetric = {
    /**
     * Unique identifier of the seller whose metrics are represented by this
     * record.
     *
     * This value corresponds to the primary key of the shopping_mall_seller
     * Prisma model and is used by clients to correlate analytics data with
     * seller account details in other parts of the API.
     */
    sellerId: string & tags.Format<"uuid">;

    /**
     * Human-readable display name of the seller, typically the seller's
     * brand name or store name as resolved at query time.
     *
     * Because this value is derived from mutable seller profile data, it
     * may change over time even though historical analytics rows remain
     * associated with the same sellerId.
     */
    sellerDisplayName: string;

    /**
     * Total number of disputes associated with this seller within the
     * filtered analytics window.
     *
     * The count respects the same date range, dispute filters, and
     * segmentation (for example, by reason category or status) that were
     * applied in the parent dispute analytics request, and includes only
     * disputes where this seller is the responsible party for the
     * underlying order lines.
     */
    totalDisputes: number & tags.Type<"int32">;

    /**
     * Number of disputes per 1,000 orders handled by this seller within the
     * filtered analytics window.
     *
     * This metric is calculated as:
     *
     * `(dispute count for this seller / number of completed or otherwise
     * counted orders for this seller) * 1000`,
     *
     * Using the same time range and filter criteria defined in the dispute
     * analytics request. It is intended for relative comparisons between
     * sellers rather than as a raw count.
     */
    disputeRatePerThousandOrders: number;
  };

  /**
   * Analytics metrics for a specific customer segment within the dispute
   * analytics result.
   *
   * Represents how a defined customer cohort contributes to overall dispute
   * volume and rate.
   */
  export type ICustomerSegmentDisputeMetric = {
    /**
     * Identifier of the customer segment dimension represented by this
     * metric record.
     *
     * Must match a segmentKey used in customer segmentation configuration,
     * such as lifecycle_stage or risk_band.
     */
    segmentKey: string;

    /**
     * Specific segment value within the dimension represented by this
     * metric record, such as "new", "returning", or "high".
     */
    segmentValue: string;

    /**
     * Total number of disputes associated with customers in this segment
     * within the filtered time window.
     */
    totalDisputes: number & tags.Type<"int32">;

    /**
     * Number of disputes per 1,000 orders placed by customers in this
     * segment within the filtered time window.
     */
    disputeRatePerThousandOrders: number;
  };
}
