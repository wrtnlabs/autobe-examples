import { tags } from "typia";

import { IRedditPlatformCommunity } from "./IRedditPlatformCommunity";

export namespace IRedditPlatformReportAnalytic {
  /**
   * Aggregated report analytics summary for community moderation oversight. Contains total and pending report counts, resolution metrics, content type distribution, per-community breakdown, and list of communities exceeding report thresholds.
   */
  export type ISummary = {
    /**
     * Total number of content moderation reports across all communities.
     *
     * @x-autobe-specification COUNT(*) of all reddit_platform_reports records where deleted_at IS NULL. Includes all statuses (PENDING, RESOLVED, DISMISSED).
     */
    total_reports: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of reports awaiting moderator review.
     *
     * @x-autobe-specification COUNT(*) of reddit_platform_reports where status = 'PENDING' AND deleted_at IS NULL. Excludes resolved or dismissed reports.
     */
    pending_reports: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Percentage of reports that have been resolved versus dismissed.
     *
     * @x-autobe-specification COMPUTED: (resolved_count / (resolved_count + dismissed_count)) * 100, rounded to 2 decimal places. Excludes pending reports. Range: 0-100%. Returns 0 if no resolved or dismissed reports.
     */
    resolution_rate: number & tags.Minimum<0> & tags.Maximum<100>;

    /**
     * Average time in milliseconds for moderators to resolve reports.
     *
     * @x-autobe-specification COMPUTED: AVG(resolved_at - created_at) for reports with status = 'RESOLVED'. Since resolved_at is not a column, compute as AVG(updated_at - created_at) for resolved reports where status changed from PENDING to RESOLVED. Result in milliseconds. Excludes DISMISSED and PENDING reports.
     */
    average_resolution_time_ms: number & tags.Minimum<0>;

    /**
     * Breakdown of reports by reported content type (post or comment).
     *
     * @x-autobe-specification COMPUTED: GROUP BY reported_content_type (POST, COMMENT). Returns array of {contentType, count, percentage} objects. Percentage = (count / total_reports) * 100. Filters deleted_at IS NULL.
     */
    content_type_distribution: IRedditPlatformReportAnalytic.IContentTypeDistribution;

    /**
     * Per-community breakdown of report counts with pending and total metrics.
     *
     * @x-autobe-specification COMPUTED: GROUP BY community_id. Returns array of {communityId, communityName, reportCount, pendingCount} objects. JOIN with reddit_platform_communities for communityName. Filters deleted_at IS NULL on both tables.
     */
    community_breakdown: IRedditPlatformReportAnalytic.ICommunityBreakdown[];

    /**
     * List of communities exceeding report volume threshold requiring moderator attention.
     *
     * @x-autobe-specification COMPUTED: Communities with report_count > threshold (e.g., 100 reports). Returns IRedditPlatformCommunity.ISummary objects. Filters deleted_at IS NULL on both reports and communities tables. Threshold configurable via request params.
     */
    flagged_communities: IRedditPlatformCommunity.ISummary[];
  };

  /**
   * Request parameters for filtering and paginating report analytics data. Allows filtering by report status, content type, submission date range, and specific community. Includes pagination parameters for controlling the number of results returned per page.
   */
  export type IRequest = {
    /**
     * Filter by report status to include in analytics. Options: PENDING, RESOLVED, DISMISSED, or ALL (default).
     *
     * @x-autobe-specification Filter for report status. Accepts: PENDING (awaiting review), RESOLVED (moderator approved), DISMISSED (moderator rejected), ALL (all statuses combined). Default: ALL. When ALL, returns comprehensive analytics across all statuses.
     */
    status?: "PENDING" | "RESOLVED" | "DISMISSED" | "ALL" | undefined;

    /**
     * Filter by type of content being reported. Options: POST or COMMENT. Omit to include all content types.
     *
     * @x-autobe-specification Filter for type of reported content. Accepts: POST (post reports), COMMENT (comment reports). When not provided, returns analytics across all content types.
     */
    content_type?: "POST" | "COMMENT" | undefined;

    /**
     * Start date for the analytics period (inclusive). Format: YYYY-MM-DD. Omit to include all historical data.
     *
     * @x-autobe-specification Start date for analytics time range (inclusive). Format: YYYY-MM-DD. When null or not provided, analytics include all available historical data from the beginning. Used together with end_date to define the reporting period.
     */
    start_date?: (string & tags.Format<"date">) | null | undefined;

    /**
     * End date for the analytics period (inclusive). Format: YYYY-MM-DD. Omit to include data up to the current date.
     *
     * @x-autobe-specification End date for analytics time range (inclusive). Format: YYYY-MM-DD. When null or not provided, defaults to current date. Used together with start_date to define the reporting period.
     */
    end_date?: (string & tags.Format<"date">) | null | undefined;

    /**
     * Filter analytics to a specific community by UUID. Omit to include all communities user moderates or is admin of.
     *
     * @x-autobe-specification UUID of a specific community to filter analytics. When null or not provided, returns analytics across all communities the user moderates or is admin of. Requires moderator privileges or admin status. Only returns data for communities within user's access scope.
     */
    community_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Page number to retrieve (1-indexed). Defaults to 1 if not provided.
     *
     * @x-autobe-specification Target page number (1-indexed). Defaults to 1 if null, not provided, or out of bounds. Used for pagination when fetching paginated analytics results. Requesting beyond available page range returns empty data with valid pagination metadata.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of analytics records to return per page. Defaults to 100 if not provided.
     *
     * @x-autobe-specification Maximum records to return per page (integer, minimum 1). Defaults to 100 if null or not provided. Server may enforce upper bounds to prevent excessive resource consumption. Combined with page controls pagination of analytics results.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Aggregated breakdown of content moderation reports by reported content type, showing the count and percentage distribution of reports for each content type (posts vs comments) across the platform.
   */
  export type IContentTypeDistribution = {
    /**
     * The type of reported content: POST or COMMENT.
     *
     * @x-autobe-database-schema-property reported_content_type
     * @x-autobe-specification Computed from distinct reported_content_type values in reddit_platform_reports. Filtered to only POST and COMMENT values. Returns one entry per content type that has at least one report.
     */
    contentType: "POST" | "COMMENT";

    /**
     * Number of reports for this content type.
     *
     * @x-autobe-specification Computed as COUNT(*) of reports where reported_content_type matches the contentType value. Only counts non-soft-deleted records (deleted_at IS NULL).
     */
    count: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Percentage of total reports that this content type represents, rounded to 2 decimal places.
     *
     * @x-autobe-specification Computed as (count / total_reports) * 100, rounded to 2 decimal places. total_reports is the sum of all count values in this aggregation.
     */
    percentage: number & tags.Minimum<0> & tags.Maximum<100>;
  };

  /**
   * Per-community breakdown of report statistics for community moderation oversight. Shows total report count and pending reports awaiting moderator review for each community.
   */
  export type ICommunityBreakdown = {
    /**
     * Unique identifier of the community.
     *
     * @x-autobe-database-schema-property community_id
     * @x-autobe-specification FK to communities.id. Groups report statistics by community.
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Display name of the community.
     *
     * @x-autobe-specification Computed via JOIN with reddit_platform_communities on community_id. Returns the name field from the communities table.
     */
    communityName: string;

    /**
     * Total number of reports for this community.
     *
     * @x-autobe-specification Computed aggregation: COUNT(*) of reports grouped by community_id. Filters: deleted_at IS NULL. Represents total number of reports for the community.
     */
    reportCount: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Number of reports pending moderator review.
     *
     * @x-autobe-specification Computed aggregation: COUNT(*) of reports where status='PENDING' AND deleted_at IS NULL, grouped by community_id. Represents reports awaiting moderator review.
     */
    pendingCount: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
