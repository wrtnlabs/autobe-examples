import { tags } from "typia";

import { ICommunityPlatformMemberuser } from "./ICommunityPlatformMemberuser";

export namespace ICommunityPlatformVotingKarmaStatisticsTopKarmaUsers {
  /**
   * Search and filter criteria, including time window and pagination, for
   * retrieving top karma user statistics.
   *
   * Used to parameterize analytical queries over
   * community_platform_user_total_karmas and related karma aggregation tables
   * so that the service can compute ranked lists of high‑karma users under
   * specific windows and filters. The request does not map to a single Prisma
   * row; it purely describes how the statistics query should behave.
   */
  export type IRequest = {
    /**
     * Logical time window for the ranking. Determines which subset of karma
     * contributions are considered when computing top users.
     */
    timeWindow: "allTime" | "last7Days" | "last30Days" | "custom";

    /**
     * Custom time window start (inclusive) in ISO 8601 format.
     *
     * Required when timeWindow is 'custom'. Represents the lower bound of
     * the activity period to consider for karma aggregation.
     */
    customFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Custom time window end (exclusive) in ISO 8601 format.
     *
     * Required when timeWindow is 'custom'. Represents the upper bound of
     * the activity period to consider for karma aggregation.
     */
    customTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional list of community identifiers to scope the ranking to
     * specific communities.
     *
     * When omitted or empty, karma from all communities may be considered.
     * When provided, only karma gained within the referenced communities
     * contributes to ranking.
     */
    communityIds?: string[] | undefined;

    /**
     * Optional minimum total karma threshold required for a user to be
     * included in the result set.
     *
     * Users whose total karma is strictly below this value are excluded
     * from the ranking output.
     */
    minTotalKarma?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Optional minimum post-related karma threshold required for inclusion.
     *
     * When null, no additional constraint is applied on post karma
     * specifically and totalKarma alone is considered.
     */
    minPostKarma?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Optional minimum comment-related karma threshold required for
     * inclusion.
     *
     * When null, no additional constraint is applied on comment karma
     * specifically and totalKarma alone is considered.
     */
    minCommentKarma?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * 1-based page index for pagination when retrieving ranked users.
     *
     * The value must be greater than or equal to 1. Values less than 1 are
     * rejected by validation.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Maximum number of ranked users to return per page.
     *
     * The service may enforce an upper bound to protect performance;
     * callers should choose reasonable page sizes for analytics views.
     */
    pageSize: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Field used to sort and rank top karma users within the selected time
     * window.
     *
     * Supports ordering by combined total karma or by post‑only or
     * comment‑only karma depending on the analytics use case.
     */
    sortBy: "totalKarma" | "postKarma" | "commentKarma";

    /**
     * Sorting direction applied to the chosen sortBy field.
     *
     * Typically 'desc' is used for leaderboards so that the highest‑karma
     * users appear first, but 'asc' is available for niche analytical
     * queries.
     */
    sortDirection: "asc" | "desc";
  };

  /**
   * Summary view for a single top karma user entry within the voting and
   * karma statistics context.
   *
   * This DTO is a read-model built primarily from the
   * `community_platform_user_total_karmas` aggregate table, which stores a
   * single `total_karma` row per member user. It is enriched at query time
   * with additional aggregates and ranking metadata from other karma-related
   * tables.
   *
   * The schema intentionally omits low-level audit timestamps from the
   * underlying Prisma model (`created_at`, `updated_at`) to keep the payload
   * compact for list and dashboard scenarios. Instead, it focuses on the
   * identity of the user and the key karma metrics required to render a "top
   * karma users" list.
   */
  export type ISummary = {
    /**
     * Summary information about the member user who owns this karma,
     * suitable for list views and rankings.
     *
     * This object is resolved from the `community_platform_memberusers`
     * table and contains only safe identity and display fields (such as id,
     * username, and optional display_name). It never includes
     * authentication secrets or security-sensitive columns.
     *
     * The presence of this property allows clients to render usernames,
     * avatars, and profile links directly alongside karma statistics
     * without requiring additional user lookups.
     */
    member_user: ICommunityPlatformMemberuser.ISummary;

    /**
     * Total combined karma score for the member user across all relevant
     * content types.
     *
     * This value is backed by the `total_karma` column in the
     * `community_platform_user_total_karmas` Prisma model and represents
     * the single, canonical aggregate used for platform-level reputation
     * calculations.
     *
     * It is always non-null in this DTO and is the primary metric used to
     * determine the ordering of the top karma users list.
     */
    total_karma: number & tags.Type<"int32">;

    /**
     * Aggregated post-related karma score for this member user.
     *
     * Unlike `total_karma`, this value is typically derived at query time
     * from the `community_platform_user_post_karmas` aggregate table (or an
     * equivalent materialized view) and is not stored as a column in
     * `community_platform_user_total_karmas`.
     *
     * This separation allows analytics views to show how much of the user’s
     * reputation comes specifically from posts, while the underlying
     * storage remains normalized.
     */
    post_karma: number & tags.Type<"int32">;

    /**
     * Aggregated comment-related karma score for this member user.
     *
     * This value is computed from comment-specific aggregates such as
     * `community_platform_user_comment_karmas` and is not a direct column
     * in the `community_platform_user_total_karmas` table.
     *
     * Together with `post_karma`, it helps distinguish whether the user’s
     * reputation comes predominantly from posts or from comments and
     * replies.
     */
    comment_karma: number & tags.Type<"int32">;

    /**
     * 1‑based rank position of this user within the current top karma users
     * result set, where `1` represents the highest total karma in the
     * selected scope.
     *
     * The rank is calculated dynamically by the query that generates the
     * statistics, taking into account any applied filters such as time
     * windows, community scopes, or minimum activity thresholds. It is not
     * persisted in any Prisma model.
     *
     * Because it is recomputed per request, clients should treat this value
     * as contextual to the specific API call rather than a globally stable
     * ranking.
     */
    rank: number & tags.Type<"int32">;
  };
}
