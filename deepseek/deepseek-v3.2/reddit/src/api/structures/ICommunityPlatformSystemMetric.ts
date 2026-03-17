import { tags } from "typia";

export namespace ICommunityPlatformSystemMetric {
  /**
   * Request parameters for filtering system metrics. Used by admin endpoints to retrieve aggregated platform statistics with component-based filtering, time range selection, and pagination controls.
   */
  export type IRequest = {
    /**
     * Component or domain area filter (e.g., 'auth', 'communities', 'posts', 'comments', 'votes', 'subscriptions', 'moderation')
     *
     * @x-autobe-specification Filters community_platform_system_metrics.component column. Used to filter metrics by component area (e.g., 'auth', 'communities', 'posts', 'comments', 'votes', 'subscriptions', 'moderation'). For subscription-specific endpoint (/subscriptions/metrics), component is automatically set to 'subscriptions'.
     */
    component?: string | undefined;

    /**
     * Specific metric identifier filter (e.g., 'daily_active_users', 'weekly_new_posts', 'monthly_vote_ratio')
     *
     * @x-autobe-specification Filters community_platform_system_metrics.metric_name column. Used to filter by specific metric identifier (e.g., 'daily_active_users', 'weekly_new_posts', 'monthly_vote_ratio', 'community_subscriber_counts').
     */
    metric_name?: string | undefined;

    /**
     * Aggregation time window filter (e.g., 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')
     *
     * @x-autobe-specification Filters community_platform_system_metrics.aggregation_period column. Used to filter by time window ('daily', 'weekly', 'monthly', 'quarterly', 'yearly').
     */
    aggregation_period?: string | undefined;

    /**
     * Filter metrics with period_start greater than or equal to this timestamp (inclusive)
     *
     * @x-autobe-specification Date range filter for community_platform_system_metrics.period_start column. Used to filter metrics with period_start greater than or equal to this timestamp (inclusive). Translates to SQL: period_start >= ?
     */
    period_start_gte?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter metrics with period_end less than or equal to this timestamp (inclusive)
     *
     * @x-autobe-specification Date range filter for community_platform_system_metrics.period_end column. Used to filter metrics with period_end less than or equal to this timestamp (inclusive). Translates to SQL: period_end <= ?
     */
    period_end_lte?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Data type of the metric value filter (e.g., 'count', 'sum', 'average', 'percentage', 'ratio')
     *
     * @x-autobe-specification Filters community_platform_system_metrics.value_type column. Used to filter by data type of metric value ('count', 'sum', 'average', 'percentage', 'ratio').
     */
    value_type?: string | undefined;

    /**
     * Page number for pagination (1-indexed)
     *
     * @x-autobe-specification Pagination control parameter for cursor-based or offset pagination. Calculates OFFSET = (page - 1) * limit. 1-indexed page number for pagination navigation.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page for pagination
     *
     * @x-autobe-specification Pagination control parameter for limiting result set size. Maximum number of records to return per page, used in SQL LIMIT clause.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Lightweight summary of system metric snapshot for list displays. Contains essential identification fields including metric category, name, aggregation period, measurement window, numeric value with interpretation type, optional dimension breakdowns, and creation timestamp. Used in admin dashboard listings for monitoring platform statistics.
   */
  export type ISummary = {
    /**
     * Unique identifier for the system metric record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_system_metrics.id (UUID). Primary identifier for metric record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Component or domain area that the metric belongs to (e.g., 'auth', 'communities', 'posts', 'comments', 'votes', 'subscriptions', 'moderation').
     *
     * @x-autobe-database-schema-property component
     * @x-autobe-specification Direct mapping from community_platform_system_metrics.component. Identifies the component or domain area the metric belongs to.
     */
    component: string;

    /**
     * Specific metric name identifier that uniquely identifies the measurement (e.g., 'daily_active_users', 'weekly_new_posts', 'monthly_vote_ratio').
     *
     * @x-autobe-database-schema-property metric_name
     * @x-autobe-specification Direct mapping from community_platform_system_metrics.metric_name. Unique identifier for the specific measurement.
     */
    metric_name: string;

    /**
     * Time period aggregation window for the metric (e.g., 'daily', 'weekly', 'monthly', 'quarterly', 'yearly').
     *
     * @x-autobe-database-schema-property aggregation_period
     * @x-autobe-specification Direct mapping from community_platform_system_metrics.aggregation_period. Time period for metric aggregation.
     */
    aggregation_period: string;

    /**
     * Start timestamp of the aggregation window, inclusive. For daily metrics, this would be 00:00:00 of the day.
     *
     * @x-autobe-database-schema-property period_start
     * @x-autobe-specification Direct mapping from community_platform_system_metrics.period_start (DateTime). Inclusive start of aggregation window.
     */
    period_start: string & tags.Format<"date-time">;

    /**
     * End timestamp of the aggregation window, exclusive. For daily metrics, this would be 00:00:00 of the next day.
     *
     * @x-autobe-database-schema-property period_end
     * @x-autobe-specification Direct mapping from community_platform_system_metrics.period_end (DateTime). Exclusive end of aggregation window.
     */
    period_end: string & tags.Format<"date-time">;

    /**
     * Numeric value of the metric measurement. Can represent counts, sums, averages, percentages, or ratios depending on the metric type.
     *
     * @x-autobe-database-schema-property metric_value
     * @x-autobe-specification Direct mapping from community_platform_system_metrics.metric_value (Float). Numeric measurement value.
     */
    metric_value: number;

    /**
     * Data type of the metric value to indicate how it should be interpreted (e.g., 'count', 'sum', 'average', 'percentage', 'ratio').
     *
     * @x-autobe-database-schema-property value_type
     * @x-autobe-specification Direct mapping from community_platform_system_metrics.value_type. Indicates how metric_value should be interpreted.
     */
    value_type: string;

    /**
     * Optional JSON object containing additional dimension breakdowns or metadata about the metric calculation (e.g., breakdown by user segment, geographic distribution, device types).
     *
     * @x-autobe-database-schema-property dimensions
     * @x-autobe-specification Direct mapping from community_platform_system_metrics.dimensions (String?). JSON object containing dimension breakdowns.
     */
    dimensions?: string | null | undefined;

    /**
     * Optional notes about the metric calculation, data quality, or exceptional circumstances affecting the measurement.
     *
     * @x-autobe-database-schema-property notes
     * @x-autobe-specification Direct mapping from community_platform_system_metrics.notes (String?). Additional notes about metric calculation.
     */
    notes?: string | null | undefined;

    /**
     * Timestamp when this metric record was created and stored in the system.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from community_platform_system_metrics.created_at (DateTime). When metric record was generated.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
