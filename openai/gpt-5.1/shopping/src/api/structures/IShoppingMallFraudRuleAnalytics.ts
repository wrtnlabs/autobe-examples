import { tags } from "typia";

export namespace IShoppingMallFraudRuleAnalytics {
  /**
   * Request DTO for querying fraud rule analytics and performance metrics.
   *
   * This schema captures all filter and segmentation options that platform
   * administrators can use to compute analytics for fraud rule definitions
   * and their recorded violations. It is purely an analytics filter object
   * and does not correspond to any single Prisma model.
   */
  export type IRequest = {
    /**
     * Start of the analysis time window in ISO 8601 date-time format
     * (inclusive).
     *
     * All fraud rule violations with timestamps greater than or equal to
     * this value are considered for analytics. Typically represents the
     * beginning of the period being analyzed, such as the start of a day,
     * week, or month.
     */
    from: string & tags.Format<"date-time">;

    /**
     * End of the analysis time window in ISO 8601 date-time format
     * (exclusive).
     *
     * All fraud rule violations with timestamps strictly less than this
     * value are considered for analytics. Together with `from`, defines the
     * analysis period.
     */
    to: string & tags.Format<"date-time">;

    /**
     * Time-series granularity used when computing trend charts and
     * time-bucketed metrics.
     *
     * Determines how violation counts and other analytics are grouped over
     * time. For example, `hour` produces per-hour data points, while `day`
     * and `week` produce coarser aggregates.
     */
    timeGranularity: "hour" | "day" | "week" | "month";

    /**
     * Optional list of specific fraud rule identifiers to focus the
     * analytics on.
     *
     * When provided, analytics are computed only for the referenced rules.
     * When omitted, analytics consider all active rules in the system.
     */
    ruleIds?: string[] | undefined;

    /**
     * Optional list of rule categories to include in the analysis.
     *
     * Categories are logical groupings such as `device_fingerprint`,
     * `velocity`, `ip_reputation`, or `behavioral`. When provided, only
     * violations for rules within these categories are analyzed.
     */
    ruleCategories?: string[] | undefined;

    /**
     * Optional list of violation severity levels to include.
     *
     * Severity values typically represent how risky or critical the rule
     * hit is considered (for example, `low`, `medium`, `high`, or
     * `critical`). When provided, analytics are limited to violations whose
     * severity is one of the selected levels.
     */
    severities?: string[] | undefined;

    /**
     * Optional list of event types against which fraud rules are evaluated.
     *
     * Common examples include `order`, `payment`, `account`, or `session`.
     * When provided, analytics are computed only for violations tied to
     * these event types.
     */
    eventTypes?: string[] | undefined;

    /**
     * Flag indicating whether to include detailed per-rule breakdown tables
     * in the analytics response.
     *
     * When true, the response will contain per-rule metrics such as hit
     * counts, hit rate, and severity distributions. When false, only
     * high-level aggregates and time-series data may be returned.
     */
    includePerRuleBreakdown?: boolean | undefined;

    /**
     * Flag indicating whether to include time-series data in the analytics
     * response.
     *
     * When true, the response includes arrays of time-bucketed metrics that
     * can be rendered as charts. When false, time-series sections may be
     * omitted to reduce payload size.
     */
    includeTimeSeries?: boolean | undefined;

    /**
     * Flag indicating whether to include violation counts grouped by
     * severity.
     *
     * When true, the analytics response includes aggregated counts of
     * violations per severity level across the selected period and
     * filters.
     */
    includeSeverityBreakdown?: boolean | undefined;

    /**
     * Flag indicating whether to include violation counts grouped by rule
     * category.
     *
     * When true, the analytics response includes aggregated counts of
     * violations per rule category across the selected period and filters.
     */
    includeRuleCategoryBreakdown?: boolean | undefined;
  };

  /**
   * Per-rule analytics metrics for a single fraud rule.
   *
   * Represents aggregated performance information for a specific fraud rule
   * over the requested analysis period. Metrics are derived from
   * `shopping_mall_fraud_rule_violations` joined to
   * `shopping_mall_fraud_rule_definitions` and related transaction entities.
   */
  export type IRuleMetric = {
    /**
     * Unique identifier of the fraud rule for which these metrics were
     * computed.
     *
     * This value corresponds to the primary key of a record in
     * `shopping_mall_fraud_rule_definitions`.
     */
    ruleId: string;

    /**
     * Human-readable name of the fraud rule.
     *
     * Typically comes from `shopping_mall_fraud_rule_definitions` and is
     * used for display in dashboards and reports.
     */
    ruleName: string;

    /**
     * Logical category of the fraud rule.
     *
     * Examples might include `device_fingerprint`, `velocity`,
     * `ip_reputation`, `behavioral`, or other domain-specific groupings
     * used by risk teams.
     */
    ruleCategory?: string | undefined;

    /**
     * Configured default severity level of this rule.
     *
     * Represents the typical risk level assigned when this rule is
     * triggered, such as `low`, `medium`, `high`, or `critical`.
     */
    severity?: string | undefined;

    /**
     * Total number of times this rule was triggered (violations) within the
     * requested analysis period and filters.
     */
    totalViolations: number & tags.Type<"int32">;

    /**
     * Number of unique entities affected by this rule during the analysis
     * period.
     *
     * Depending on how analytics is implemented, this might represent
     * unique customers, orders, or payment transactions that triggered the
     * rule.
     */
    uniqueEntitiesAffected?: (number & tags.Type<"int32">) | undefined;

    /**
     * Approximate hit rate of this rule per 1,000 evaluated events within
     * the selected period.
     *
     * Calculated as `(total violations / total evaluated events) * 1000`
     * and used to compare rule activity normalized for traffic volume.
     */
    hitRatePerThousand?: number | undefined;

    /**
     * Estimated false-positive rate for this rule over the analysis period.
     *
     * Computed using downstream labels or decision outcomes when available
     * (for example, cases where the rule fired but the transaction was
     * ultimately approved as legitimate). A value between 0 and 1, where 0
     * means no known false positives and 1 means all recorded hits are
     * deemed false positives.
     */
    falsePositiveRate?: number | undefined;
  };

  /**
   * Single time-series data point aggregating fraud rule violations over a
   * specific time bucket.
   *
   * Time buckets are defined based on the `timeGranularity` specified in the
   * request (for example, hourly, daily, or weekly).
   */
  export type ITimeSeriesPoint = {
    /**
     * Start timestamp of the time bucket represented by this data point, in
     * ISO 8601 date-time format.
     */
    bucketStart: string & tags.Format<"date-time">;

    /**
     * End timestamp of the time bucket represented by this data point, in
     * ISO 8601 date-time format.
     */
    bucketEnd: string & tags.Format<"date-time">;

    /**
     * Total number of fraud rule violations recorded within this time
     * bucket, across all rules that match the current filters.
     */
    totalViolations: number & tags.Type<"int32">;

    /**
     * Number of distinct fraud rules that triggered at least once within
     * this time bucket.
     */
    uniqueRulesTriggered?: (number & tags.Type<"int32">) | undefined;
  };

  /**
   * Analytics bucket aggregating fraud rule violations for a specific
   * severity level.
   *
   * This type is used only in analytics responses and is not persisted
   * directly in the database. Each instance represents a computed summary
   * over a caller-defined analysis period and filter set, such as time range,
   * actor segments, or rule subsets.
   *
   * The `severity` value corresponds to a logical severity label defined by
   * the fraud and risk engine (for example `low`, `medium`, `high`, or
   * `critical`). The `totalViolations` field represents the aggregated count
   * of fraud rule violations that were classified at this severity level
   * within the effective analysis window and filters.
   */
  export type ISeverityBucket = {
    /**
     * Logical severity label for this bucket.
     *
     * Typical values are severity levels defined in the fraud and risk
     * configuration such as `low`, `medium`, `high`, or `critical`. The
     * exact set of supported severities is determined by the platform’s
     * fraud rule configuration and may be extended over time.
     *
     * Clients should treat this as a displayable label and should not
     * assume it is an enum enforced at the API contract level.
     */
    severity: string;

    /**
     * Total count of fraud rule violations that fall into this severity
     * level.
     *
     * This value is computed over the requested analysis period and any
     * active filters (such as actor type, region, or rule subset). It
     * represents the number of violation events observed, not the number of
     * unique actors or orders.
     *
     * The count is non‑negative and may be zero when no violations of this
     * severity were detected in the selected window.
     */
    totalViolations: number & tags.Type<"int32">;
  };

  /**
   * Analytics bucket aggregating fraud rule violations for a specific rule
   * category.
   *
   * This DTO is produced by fraud rule analytics queries and is not a direct
   * projection of a single database row. Each instance groups together all
   * violations for one logical fraud rule category over the requested
   * analysis period and filter set.
   *
   * The `ruleCategory` value should align with the business-facing category
   * identifiers used when defining fraud rules (for example
   * `device_fingerprint`, `velocity`, `ip_reputation`, or other configured
   * categories). The `totalViolations` field is the aggregated count of
   * violation events attributed to rules in this category within the analysis
   * scope.
   */
  export type IRuleCategoryBucket = {
    /**
     * Business-facing identifier of the fraud rule category represented by
     * this bucket.
     *
     * Examples include categories such as `device_fingerprint`, `velocity`,
     * `ip_reputation`, or other logical groupings defined in the platform’s
     * fraud and risk configuration. The value is treated as an opaque
     * string by the API but should match a known category key on the server
     * side.
     *
     * Clients typically use this field for labeling charts, tables, or
     * dashboards that break down fraud activity by category.
     */
    ruleCategory: string;

    /**
     * Total number of fraud rule violation events attributed to rules in
     * this category.
     *
     * This count is computed over the analysis period and filters supplied
     * in the analytics request, aggregating all violations generated by
     * rules whose category matches `ruleCategory`.
     *
     * The value is always a non‑negative integer and may be zero when no
     * violations for this category were recorded in the selected time
     * window.
     */
    totalViolations: number & tags.Type<"int32">;
  };

  /**
   * Response DTO containing fraud rule analytics and performance metrics.
   *
   * This schema represents a denormalized analytics view derived from
   * `shopping_mall_fraud_rule_definitions`,
   * `shopping_mall_fraud_rule_violations`, and related order/payment/account
   * tables. It is designed to be rendered directly on risk dashboards used by
   * platform administrators.
   *
   * The response does not map to a single Prisma model and therefore omits
   * `x-autobe-prisma-schema`. All fields are computed or aggregated values,
   * not raw database rows.
   */
  export type IResponse = {
    /**
     * Echo of the start of the analysis time window used to compute these
     * analytics, in ISO 8601 date-time format.
     */
    from: string & tags.Format<"date-time">;

    /**
     * Echo of the end of the analysis time window used to compute these
     * analytics, in ISO 8601 date-time format.
     */
    to: string & tags.Format<"date-time">;

    /**
     * Time-series granularity actually used when computing trend charts and
     * time-bucketed metrics for this response.
     */
    timeGranularity: "hour" | "day" | "week" | "month";

    /**
     * Total number of fraud rule violations recorded within the requested
     * analysis period and filters.
     */
    totalViolations: number & tags.Type<"int32">;

    /**
     * Number of distinct fraud rules that triggered at least once during
     * the analysis period.
     */
    uniqueRulesTriggered: number & tags.Type<"int32">;

    /**
     * Optional array of per-rule analytics metrics, one element per fraud
     * rule that matches the current filters.
     *
     * Included when the request asked for per-rule breakdowns
     * (`includePerRuleBreakdown = true`). Each entry summarizes key
     * performance metrics for a single rule, such as total violations and
     * hit rate.
     */
    perRuleMetrics?: IShoppingMallFraudRuleAnalytics.IRuleMetric[] | undefined;

    /**
     * Optional array of time-series data points describing how overall
     * fraud rule activity changed over time.
     *
     * Included when the request asked for time-series data
     * (`includeTimeSeries = true`). Each element corresponds to a discrete
     * time bucket defined by the chosen `timeGranularity`.
     */
    timeSeries?: IShoppingMallFraudRuleAnalytics.ITimeSeriesPoint[] | undefined;

    /**
     * Optional array of severity-level buckets describing how violations
     * are distributed by severity across the selected period.
     *
     * Included when the request asked for severity breakdowns
     * (`includeSeverityBreakdown = true`).
     */
    severityBreakdown?:
      | IShoppingMallFraudRuleAnalytics.ISeverityBucket[]
      | undefined;

    /**
     * Optional array of rule-category buckets describing how violations are
     * distributed across different categories of fraud rules.
     *
     * Included when the request asked for rule category breakdowns
     * (`includeRuleCategoryBreakdown = true`).
     */
    ruleCategoryBreakdown?:
      | IShoppingMallFraudRuleAnalytics.IRuleCategoryBucket[]
      | undefined;
  };
}
