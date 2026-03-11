import { tags } from "typia";

export namespace IRedditPlatformCommunityAnalytic {
  /**
   * Lightweight summary of community analytics metrics including report statistics and resolution rates. Optimized for paginated list views in admin dashboards, containing only essential fields for displaying community performance overview.
   */
  export type ISummary = {
    /**
     * Unique identifier of the community.
     *
     * @x-autobe-specification Direct mapping from reddit_platform_communities.id. UUID format. This field comes from the joined communities table.
     */
    community_id: string & tags.Format<"uuid">;

    /**
     * Name of the community.
     *
     * @x-autobe-specification Direct mapping from reddit_platform_communities.name. Joined from communities table.
     */
    community_name: string;

    /**
     * Total number of reports submitted for this community.
     *
     * @x-autobe-specification Computed aggregation: COUNT of all reports where reports.community_id matches community_id.
     */
    total_reports: number & tags.Type<"int32">;

    /**
     * Number of reports that have been resolved by moderators.
     *
     * @x-autobe-specification Computed aggregation: COUNT of reports where reports.community_id matches community_id AND reports.status='RESOLVED'.
     */
    resolved_reports: number & tags.Type<"int32">;

    /**
     * Number of reports that have been dismissed by moderators.
     *
     * @x-autobe-specification Computed aggregation: COUNT of reports where reports.community_id matches community_id AND reports.status='DISMISSED'.
     */
    dismissed_reports: number & tags.Type<"int32">;

    /**
     * Ratio of resolved reports to total reports, expressed as a decimal between 0 and 1. Null if no reports have been submitted for this community.
     *
     * @x-autobe-specification Computed aggregation: resolved_reports divided by total_reports. Returns 0 when total_reports is 0 (no division by zero). Returns null in database when no reports exist, converted to 0 in API.
     */
    resolution_rate: number | null;

    /**
     * Current number of members subscribed to this community.
     *
     * @x-autobe-specification Direct mapping from reddit_platform_communities.subscriber_count. Integer count of subscribed members. This field comes from the communities table.
     */
    subscriber_count: number & tags.Type<"int32">;
  };

  /**
   * Request parameters for filtering and paginating community analytics data on the Reddit platform. Supports filtering by report status, date ranges, and subscriber count thresholds, with pagination controls for large result sets. Used by admin analytics dashboard to retrieve community performance metrics.
   */
  export type IRequest = {
    /**
     * Filter reports by status. Options: pending, resolved, or dismissed. If not provided, analytics include reports of all statuses.
     *
     * @x-autobe-specification Filter reports by status from reddit_platform_reports table. Query: reddit_platform_reports.status IN (pending, resolved, dismissed). Optional filter - if not provided, all statuses are included in analytics. Filter is applied during the LEFT JOIN condition.
     */
    status?: "pending" | "resolved" | "dismissed" | undefined;

    /**
     * Start date and time for filtering reports. Only reports created or updated on or after this date-time are included. ISO 8601 format (date-time).
     *
     * @x-autobe-specification Start date filter for report timestamps. Query: reports.created_at >= startDate AND reports.updated_at >= startDate. Format: ISO 8601 date-time (date-time). Used to filter reports created or updated after this timestamp. Optional filter.
     */
    startDate?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date and time for filtering reports. Only reports created or updated on or before this date-time are included. ISO 8601 format (date-time).
     *
     * @x-autobe-specification End date filter for report timestamps. Query: reports.created_at <= endDate AND reports.updated_at <= endDate. Format: ISO 8601 date-time (date-time). Used to filter reports created or updated before this timestamp. Optional filter. When provided, startDate must be before endDate.
     */
    endDate?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Minimum subscriber count threshold. Only communities with subscriber_count >= this value are included. Minimum value: 0.
     *
     * @x-autobe-specification Minimum subscriber count filter. Query: communities.subscriber_count >= subscriberCountMin. Filter communities by minimum subscriber count threshold. Optional filter. Minimum value: 0. Used to find communities above a certain subscriber count threshold.
     */
    subscriberCountMin?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;

    /**
     * Maximum subscriber count threshold. Only communities with subscriber_count <= this value are included. Minimum value: 0.
     *
     * @x-autobe-specification Maximum subscriber count filter. Query: communities.subscriber_count <= subscriberCountMax. Filter communities by maximum subscriber count threshold. Optional filter. Minimum value: 0. Used to find communities below a certain subscriber count threshold.
     */
    subscriberCountMax?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;

    /**
     * Page number for paginated results (1-indexed). Minimum value: 1. Page 1 returns the first page of results.
     *
     * @x-autobe-specification Page number for pagination (1-indexed). Query: LIMIT limit OFFSET (page - 1) * limit. 1-indexed page number for paginated results. Minimum value: 1. Used to retrieve specific pages of analytics results.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records to return per page. Minimum: 1, Maximum: 100. Controls the page size for pagination.
     *
     * @x-autobe-specification Maximum number of records per page for pagination. Query: LIMIT limit. Minimum: 1, Maximum: 100. Used to control how many analytics records are returned per page. Higher values reduce the number of requests needed but increase response size.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
