import { tags } from "typia";

import { ICommunityPlatformPost } from "./ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "./ICommunityPlatformCommunity";

export namespace ICommunityPlatformPostAnalytics {
  /**
   * Request payload for retrieving analytical statistics about posts in the
   * community platform.
   *
   * Defines filtering, sorting, and pagination criteria for an analytics
   * query over `community_platform_posts` combined with
   * `community_platform_post_votes` and related aggregates. This DTO is used
   * with a PATCH method to support complex query structures that would be
   * cumbersome to express via query strings.
   *
   * The endpoint is typically restricted to `adminUser` actors and is
   * intended for dashboards, internal reporting tools, and monitoring
   * consoles rather than end-user feeds. It enables filtering by community,
   * temporal windows, post status, and score thresholds, as well as explicit
   * selection of sort mode and sort direction for the result set.
   *
   * The `sortBy` and `sortDirection` properties are expected to use a
   * constrained set of string values agreed between client and server (for
   * example `newest`, `highest_score`, `most_controversial` for `sortBy` and
   * `asc`, `desc` for `sortDirection`). Server-side validation should reject
   * unsupported values so that analytics behavior remains predictable and
   * consistent across tools.
   */
  export type IRequest = {
    /**
     * 1-based index of the result page to retrieve.
     *
     * This value works together with `pageSize` to identify which slice of
     * the analytics result set should be returned to the caller.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Maximum number of analytics records to return in a single page.
     *
     * The implementation should enforce an upper bound to protect system
     * performance, and callers are expected to choose reasonable values
     * that balance latency and payload size.
     */
    pageSize: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Optional filter limiting analytics results to posts belonging to a
     * particular community.
     *
     * When this value is null, posts from all communities may be included
     * subject to other filters such as status or time windows.
     */
    communityId?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Optional filter restricting analytics to posts authored by a
     * particular member user.
     *
     * When this value is null, posts from all authors are considered.
     */
    authorMemberUserId?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Optional post status filter.
     *
     * When provided, only posts whose status matches the given value are
     * included in the analytics result. When null, status-based filtering
     * is not applied and all post statuses are eligible subject to other
     * constraints.
     */
    status?: string | null | undefined;

    /**
     * Optional start of the creation-time window for the analytics query.
     *
     * When null, no lower bound is applied and posts from any earlier
     * creation time may be included.
     */
    createdAtFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional end of the creation-time window for the analytics query.
     *
     * When null, no upper bound is applied and posts created after any
     * particular date may be included subject to other filters.
     */
    createdAtTo?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional minimum score threshold.
     *
     * When provided, posts whose score is below this value are excluded
     * from the analytics results. When null, no lower score bound is
     * applied.
     */
    minScore?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Optional maximum score threshold.
     *
     * When provided, posts whose score exceeds this value are excluded from
     * the analytics results. When null, no upper score bound is applied.
     */
    maxScore?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Sorting mode applied to the analytics result set.
     *
     * Common values include semantic identifiers such as `newest`,
     * `oldest`, `highest_score`, `lowest_score`, `most_controversial`, or
     * `most_commented`, which instruct the server which metric or derived
     * field to use as the primary sort key. The exact set of supported
     * values is defined by the backend implementation, and unsupported
     * values should be rejected with a validation error so that clients do
     * not accidentally rely on undefined behavior.
     */
    sortBy: string;

    /**
     * Sort direction for the analytics result set.
     *
     * Typical values are `asc` for ascending order and `desc` for
     * descending order, applied to the field or metric selected via
     * `sortBy`. Clients should send only supported constants, and the
     * server is expected to validate this field in combination with
     * `sortBy` to prevent ambiguous or contradictory sort instructions.
     */
    sortDirection: string;
  };

  /**
   * Summary analytics view for a single community platform post, providing
   * key engagement and score metrics suitable for list views, dashboards, and
   * lightweight overlays.
   *
   * This type is optimized for read scenarios where only high-level analytics
   * and their immediate display context are required rather than full raw
   * event streams or detailed history. It now includes lightweight post and
   * community summaries so that typical dashboards can be rendered without
   * additional fetches for basic entity context.
   */
  export type ISummary = {
    /**
     * Unique identifier of the post whose analytics are being summarized.
     *
     * This value corresponds to the primary key of the
     * `community_platform_posts` table and can be used by analytical
     * clients and internal services to join or link to other post-related
     * datasets when needed.
     */
    post_id: string & tags.Format<"uuid">;

    /**
     * Unique identifier of the community that owns the post.
     *
     * This value references `community_platform_communities.id` and is
     * primarily intended for analytical joins, filtering, and grouping by
     * community in reporting or dashboard scenarios.
     */
    community_id: string & tags.Format<"uuid">;

    /**
     * Summary view of the post whose analytics are represented by this
     * record.
     *
     * This belongs-to association provides the minimal post context (such
     * as title and basic metadata) required to render analytics tables,
     * charts, or dashboards without issuing additional API calls for the
     * post entity.
     */
    post?: ICommunityPlatformPost.ISummary | undefined;

    /**
     * Summary view of the community that owns the post.
     *
     * This belongs-to association exposes lightweight community information
     * so that analytics consumers can display which community a given post
     * belongs to while still relying on the scalar `community_id` field for
     * analytical joins and aggregations when necessary.
     */
    community?: ICommunityPlatformCommunity.ISummary | undefined;

    /**
     * Total number of upvote reactions recorded for this post across all
     * member users.
     *
     * This counter represents the cumulative positive voting engagement and
     * is typically updated as votes are added, changed, or removed in the
     * underlying vote tables.
     */
    upvote_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of downvote reactions recorded for this post across all
     * member users.
     *
     * This value captures cumulative negative voting engagement and is used
     * in conjunction with `upvote_count` to derive net score and various
     * ranking metrics.
     */
    downvote_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Net score for the post, typically computed as `upvote_count` minus
     * `downvote_count`.
     *
     * This precomputed scalar is exposed to support efficient sorting and
     * display in feeds, analytics tables, and leaderboards without
     * requiring clients to recompute the value.
     */
    score: number & tags.Type<"int32">;

    /**
     * Total number of comments (including nested replies) currently
     * associated with this post.
     *
     * The counter is updated as comments are created, edited in ways that
     * affect visibility, or removed, and is intended for high-level
     * engagement summaries rather than detailed comment inspection.
     */
    comment_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Approximate number of unique member or guest users who have viewed
     * this post.
     *
     * This metric is used for popularity and reach calculations in
     * analytics dashboards and may be based on sampled or aggregated
     * view-tracking data depending on system configuration.
     */
    unique_view_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Optional floating-point ranking value used for "hot" or trending sort
     * modes.
     *
     * The value typically combines score, recency, and other factors into a
     * single sortable metric so that clients can order posts by perceived
     * relevance or momentum without re-evaluating the ranking formula.
     */
    hot_rank?: number | undefined;

    /**
     * Timestamp when the post was originally created.
     *
     * Analytics consumers can use this field to correlate engagement
     * metrics with post age, perform cohort analyses, or filter analytics
     * by creation period.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of the most recent significant activity on this post, such
     * as a new comment, vote, or edit.
     *
     * This field is useful for recency-based sorting, determining whether a
     * post is still actively engaged with, and driving time-windowed
     * analytics views.
     */
    last_activity_at?: (string & tags.Format<"date-time">) | undefined;
  };
}
