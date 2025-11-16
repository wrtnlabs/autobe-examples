import { tags } from "typia";

export namespace ICommunityPlatformCommunityGrowthStatistics {
  /**
   * Request parameters for computing time-based community growth statistics
   * derived from the `community_platform_community_memberships` table.
   *
   * Clients use this DTO to describe which communities should be included in
   * the analysis, which time window to examine, and how to bucket time into
   * periods such as days, weeks, or months. The backend applies these filters
   * to communities and their associated membership rows before running
   * aggregation queries over `community_platform_community_memberships` and,
   * when necessary, related moderation tables.
   *
   * This DTO is read-only from the database perspective: it never changes any
   * membership rows. Instead, it controls analytical queries that return one
   * or more `ICommunityPlatformCommunityGrowthStatistics.ISummary` records
   * wrapped in a paginated response.
   */
  export type IRequest = {
    /**
     * Optional explicit list of community IDs to include in the growth
     * analysis.
     *
     * When provided, only communities whose `id` appears in this list are
     * considered when aggregating rows from
     * `community_platform_community_memberships`. This filter is applied
     * before other attribute-based filters such as `community_codes` or
     * `visibility_levels`. When omitted, the set of communities is
     * determined solely by the other filters or, if those are also omitted,
     * by platform-wide defaults.
     */
    community_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional list of community codes or slugs to filter communities for
     * growth analysis.
     *
     * These values correspond to the business identifier or slug column on
     * `community_platform_communities` and are commonly used in URLs and UI
     * elements. When present, only communities whose code matches one of
     * these values are included in the aggregation, either in addition to
     * or instead of `community_ids`, depending on the caller's usage
     * pattern.
     */
    community_codes?: string[] | undefined;

    /**
     * Optional filter specifying which community visibility levels should
     * be included in the analysis.
     *
     * Each value must correspond to a visibility level code defined in the
     * `community_platform_community_visibility_levels` Prisma model. The
     * filter is evaluated when selecting communities to analyse, so only
     * communities whose visibility level matches one of these codes are
     * used when aggregating growth metrics from
     * `community_platform_community_memberships`.
     */
    visibility_levels?: string[] | undefined;

    /**
     * Start of the analysis window as an ISO 8601 UTC timestamp
     * (inclusive).
     *
     * Membership events with timestamps earlier than this value are
     * excluded from the growth statistics. The server interprets this
     * timestamp in UTC, and validation should ensure that `from` is
     * strictly earlier than `to` to avoid empty or inverted ranges.
     */
    from: string & tags.Format<"date-time">;

    /**
     * End of the analysis window as an ISO 8601 UTC timestamp (exclusive).
     *
     * Membership events with timestamps greater than or equal to this value
     * are excluded from the period. Together with `from`, this defines the
     * closed-open interval `[from, to)` used to compute growth metrics from
     * `community_platform_community_memberships`. The backend should reject
     * requests where `to` is not later than `from`.
     */
    to: string & tags.Format<"date-time">;

    /**
     * Time bucket size used when aggregating membership changes over the
     * requested period.
     *
     * Supported values are:
     *
     * - `day`: Group membership events into calendar days
     * - `week`: Group membership events into calendar weeks
     * - `month`: Group membership events into calendar months
     *
     * The chosen granularity determines how many
     * `ICommunityPlatformCommunityGrowthStatistics.ISummary` records are
     * produced per community and how the `startAt`/`endAt` boundaries of
     * each summary are computed.
     */
    granularity: "day" | "week" | "month";

    /**
     * Whether to compute cumulative membership counts in addition to
     * per-period deltas.
     *
     * When `true`, each summary bucket may include cumulative metrics (for
     * example, total members up to the end of the bucket) alongside
     * per-period metrics. This is particularly useful for cumulative charts
     * and long-term trend analysis, but may increase response payload size
     * when many buckets or communities are requested.
     */
    include_cumulative?: boolean | undefined;

    /**
     * Whether to include per-period delta metrics such as `newMembers`,
     * `lostMembers`, and `netMemberChange` in the response.
     *
     * When set to `false`, the API may omit detailed deltas and focus on
     * cumulative metrics only, which can reduce payload size in scenarios
     * where callers care about overall trend but not about individual
     * period changes. When both `include_cumulative` and
     * `include_period_deltas` are `true`, the response is fully detailed
     * and suitable for most analytics dashboards.
     */
    include_period_deltas?: boolean | undefined;

    /**
     * Page number for paginating the result set of community growth
     * statistic summaries.
     *
     * Pagination is 1-based and follows the same semantics as
     * `IPage.IPagination.current`. When omitted, the server typically
     * defaults to the first page. Large page numbers that exceed the
     * available pages should result in an empty data set rather than an
     * error.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of growth statistic summaries to return per page.
     *
     * This value corresponds to `IPage.IPagination.limit` and controls how
     * many `ICommunityPlatformCommunityGrowthStatistics.ISummary` records
     * are returned in a single response page. The server may enforce an
     * upper bound (for example, 200) even if the client requests a larger
     * value, to protect performance and avoid excessively large payloads.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<200>)
      | undefined;
  };

  /**
   * Summary view of community growth statistics, providing high-level metrics
   * for how a community's membership and participation are changing over
   * time. Intended for list views, dashboards, and lightweight embeds rather
   * than detailed analytics exploration.
   */
  export type ISummary = {
    /**
     * Unique identifier of the community whose growth statistics are being
     * summarized.
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Human-readable label for the aggregation window over which these
     * growth metrics are calculated (for example, '24h', '7d', '30d', or
     * 'all_time').
     */
    timeWindow: string;

    /**
     * Start timestamp (inclusive) of the period over which growth
     * statistics were aggregated, in ISO 8601 date-time format.
     */
    startAt: string & tags.Format<"date-time">;

    /**
     * End timestamp (exclusive) of the period over which growth statistics
     * were aggregated, in ISO 8601 date-time format.
     */
    endAt: string & tags.Format<"date-time">;

    /**
     * Number of member users who newly joined the community within the
     * aggregation period.
     */
    newMembers: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of member users who left or were removed from the community
     * within the aggregation period.
     */
    lostMembers: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Net change in community members during the aggregation period,
     * calculated as newMembers minus lostMembers.
     */
    netMemberChange: number & tags.Type<"int32">;

    /**
     * Number of distinct member users who were considered active in the
     * community during the aggregation period based on platform-defined
     * activity criteria.
     */
    activeMembers: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Count of posts created in the community during the aggregation
     * period.
     */
    newPosts: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Count of comments created in the community during the aggregation
     * period.
     */
    newComments: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
