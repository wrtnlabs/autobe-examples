import { tags } from "typia";

export namespace IRedditPlatformReportMetric {
  /**
   * Summary of report analytics metrics for a community. Aggregates report counts, resolution metrics, and community health indicators for moderator review and analytics dashboards.
   */
  export type ISummary = {
    /**
     * UUID of the community this report metric summary applies to.
     *
     * @x-autobe-specification Foreign key reference to reddit_platform_communities.id. Included in aggregation to identify which community this metric summary applies to. Resolved at query time to provide context for the metrics.
     */
    community_id: string & tags.Format<"uuid">;

    /**
     * Name of the community for display purposes.
     *
     * @x-autobe-specification Computed via JOIN from reddit_platform_communities.name WHERE communities.id = reports.community_id. Resolved at query time to provide human-readable community identifier.
     */
    community_name: string;

    /**
     * Total number of reports submitted for this community.
     *
     * @x-autobe-specification Computed via COUNT(*) from reddit_platform_reports WHERE community_id = current_group AND deleted_at IS NULL. Represents total number of reports submitted for this community.
     */
    total_reports: number & tags.Type<"int32">;

    /**
     * Number of reports that have been resolved by moderators.
     *
     * @x-autobe-specification Computed via COUNT(*) FILTER (WHERE status='RESOLVED') from reddit_platform_reports WHERE community_id = current_group AND deleted_at IS NULL. Counts only reports marked as resolved by moderators.
     */
    resolved_count: number & tags.Type<"int32">;

    /**
     * Number of reports pending moderator review.
     *
     * @x-autobe-specification Computed via COUNT(*) FILTER (WHERE status='PENDING') from reddit_platform_reports WHERE community_id = current_group AND deleted_at IS NULL. Counts reports awaiting moderator review.
     */
    pending_count: number & tags.Type<"int32">;

    /**
     * Number of reports dismissed by moderators as unfounded.
     *
     * @x-autobe-specification Computed via COUNT(*) FILTER (WHERE status='DISMISSED') from reddit_platform_reports WHERE community_id = current_group AND deleted_at IS NULL. Counts reports moderators found invalid or unfounded.
     */
    dismissed_count: number & tags.Type<"int32">;

    /**
     * Average time to resolve reports in hours, or null if no reports have been resolved.
     *
     * @x-autobe-specification Computed via AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) from reddit_platform_reports WHERE community_id = current_group AND status='RESOLVED'. Returns hours as integer (rounded) or null if no reports resolved.
     */
    average_resolution_time: (number & tags.Type<"int32">) | null;

    /**
     * Indicates if the community has exceeded configurable report threshold limits.
     *
     * @x-autobe-specification Computed boolean indicating if community has exceeded configurable report threshold (per section 373). Set to true when total_reports exceeds platform-defined alert threshold for community health monitoring. Used to surface high-volume reporting communities for admin review.
     */
    community_threshold_flag: boolean;

    /**
     * Timestamp of the most recent report for this community, or null if none.
     *
     * @x-autobe-specification Computed via MAX(created_at) from reddit_platform_reports WHERE community_id = current_group. NULL if no reports exist for community.
     */
    last_report_at: (string & tags.Format<"date-time">) | null;

    /**
     * UUID of the moderator who has resolved the most reports for this community, or null.
     *
     * @x-autobe-specification Computed via MODE() or subquery on resolved_by_id from reddit_platform_reports WHERE community_id = current_group AND status='RESOLVED'. Returns moderator UUID who resolved most reports, or null if no reports resolved.
     */
    resolved_by_id: (string & tags.Format<"uuid">) | null;

    /**
     * Percentage of reports resolved (0-100), or null if no reports exist.
     *
     * @x-autobe-specification Computed via (resolved_count::FLOAT / NULLIF(total_reports, 0)) * 100. Returns percentage (0-100) or null if no reports exist. Rounded to 1 decimal place.
     */
    resolution_rate: number | null;

    /**
     * Timestamp of the first report for this community, or null if none.
     *
     * @x-autobe-specification Computed via MIN(created_at) from reddit_platform_reports WHERE community_id = current_group. NULL if no reports exist for community.
     */
    created_at: (string & tags.Format<"date-time">) | null;
  };

  /**
   * Request parameters for filtering, sorting, and paginating report analytics and metrics data. Allows administrators to query report patterns, resolution performance, and community health indicators across the Reddit Platform.
   */
  export type IRequest = {
    /**
     * Page number for paginated results, starting from 1.
     *
     * @x-autobe-specification Page number for pagination, 1-indexed. Default value is 1. Used in OFFSET calculation: OFFSET = (page - 1) * limit. Maximum page number is calculated as ceiling(total_records / limit). This is a query parameter, not a database column.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Maximum number of records to return per page.
     *
     * @x-autobe-specification Number of records per page. Default value is 20. Maximum value is 100 to prevent excessive data retrieval. Actual records returned may be less than limit on the final page if fewer records remain. This is a query parameter controlling result set size.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;

    /**
     * Filter reports by their current status.
     *
     * @x-autobe-specification Filter by report status. Maps to reddit_platform_reports.status column. Valid values: PENDING (awaiting moderator review), RESOLVED (moderator approved and content deleted), DISMISSED (moderator found report invalid). Query parameter used to construct WHERE clause with IN operator for multiple values.
     */
    status?: "PENDING" | "RESOLVED" | "DISMISSED" | undefined;

    /**
     * Filter reports created on or after this date and time.
     *
     * @x-autobe-specification Filter reports created on or after this datetime. Maps to reddit_platform_reports.created_at >= startDate. Used together with endDate to create a date range filter. Accepts ISO 8601 date-time format. Query parameter for constructing WHERE clause.
     */
    startDate?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter reports created on or before this date and time.
     *
     * @x-autobe-specification Filter reports created on or before this datetime. Maps to reddit_platform_reports.created_at <= endDate. Used together with startDate to create a date range filter. Accepts ISO 8601 date-time format. Query parameter for constructing WHERE clause.
     */
    endDate?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter reports by community ID.
     *
     * @x-autobe-specification Filter reports by community ID. Maps to reddit_platform_reports.community_id column (UUID format). Use UUID string format. This filter aggregates all reports within a specific community for metrics calculation. Query parameter for constructing WHERE clause.
     */
    communityId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter reports by moderator ID who resolved them.
     *
     * @x-autobe-specification Filter reports by moderator ID who resolved them. Maps to reddit_platform_reports.resolved_by_id column (UUID format). NULL values excluded from count when calculating moderator resolution rates. Use UUID string format. Query parameter for constructing WHERE clause.
     */
    moderatorId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by type of content being reported (POST or COMMENT).
     *
     * @x-autobe-specification Filter by type of reported content. Maps to reddit_platform_reports.reported_content_type column. Valid values: POST (reporting a post), COMMENT (reporting a comment). Use IN clause with multiple values for OR logic. Query parameter for constructing WHERE clause.
     */
    reportedContentType?: "POST" | "COMMENT" | undefined;

    /**
     * Flag indicating if the community has exceeded report thresholds.
     *
     * @x-autobe-specification Filter communities that have exceeded configurable report thresholds (e.g., 100 reports in last 30 days). This is a computed flag calculated by counting reports per community within time window and comparing against threshold. NULL or false values are included by default unless explicitly filtered. Query parameter for filtering pre-computed threshold flag.
     */
    communityThresholdExceeded?: boolean | undefined;

    /**
     * Field to sort the results by.
     *
     * @x-autobe-specification Field to sort results by. Valid values: total_reports (count of all reports), resolution_rate (percentage resolved), average_resolution_time (hours to resolve), created_at (report creation date). Sorting applied AFTER filtering and aggregation. Query parameter for constructing ORDER BY clause.
     */
    sortBy?:
      | "total_reports"
      | "resolution_rate"
      | "average_resolution_time"
      | "created_at"
      | undefined;

    /**
     * Sort direction: ASC for ascending, DESC for descending.
     *
     * @x-autobe-specification Sort direction for sortBy field. Valid values: ASC (ascending), DESC (descending). Applied together with sortBy parameter. Default is DESC for most metrics (show highest counts/rates first). Query parameter for constructing ORDER BY clause.
     */
    sortOrder?: "ASC" | "DESC" | undefined;
  };
}
