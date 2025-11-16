import { tags } from "typia";

export namespace ICommunityPlatformHomeFeed {
  /**
   * Request parameters for generating the personalized home feed for the
   * currently authenticated member user.
   *
   * This DTO encapsulates pagination, sorting, time-window, and content-type
   * filter options used when constructing the home feed from subscriptions,
   * user feed preferences, and default feed configurations. It is a pure
   * query-model and does not map directly to a single Prisma table.
   */
  export type IRequest = {
    /**
     * 1-based index of the page of results to retrieve for the home feed.
     *
     * The backend uses this value together with `limit` to compute offset
     * or cursor-based pagination over posts that qualify for the home
     * feed.
     */
    page: number & tags.Type<"int32">;

    /**
     * Maximum number of post summaries to include in a single page of the
     * home feed.
     *
     * Typical values are constrained by platform configuration to protect
     * performance; clients should choose values that balance user
     * experience with response size and latency.
     */
    limit: number & tags.Type<"int32">;

    /**
     * Sorting strategy to apply when ranking posts in the home feed.
     *
     * Typical values include business-defined modes such as `hot`, `new`,
     * `top`, or `controversial`. The exact set is constrained by backend
     * configuration and must match implemented ranking algorithms for the
     * home feed service.
     */
    sort_mode: string;

    /**
     * Optional time window that constrains posts considered for ranking in
     * the home feed.
     *
     * Common values conceptually correspond to ranges such as `day`,
     * `week`, `month`, or `all`, and are interpreted by the backend when
     * applying sorting modes like `top`. When omitted, the default time
     * horizon defined by platform or user preferences is used.
     */
    time_range?: string | undefined;

    /**
     * Optional filter restricting the home feed to posts of specific
     * content types.
     *
     * Each entry should match a `code` value from the
     * `community_platform_post_types.code` column so that the feed includes
     * only posts whose `post_type_id` corresponds to one of the specified
     * codes. When this list is empty or omitted, no additional post-type
     * filtering is applied beyond the user's default preferences.
     */
    content_type_codes?: string[] | undefined;

    /**
     * Flag indicating whether the home feed should include posts from
     * default or recommended feeds in addition to posts from explicitly
     * subscribed communities.
     *
     * When omitted, the backend typically falls back to the user-level
     * preference stored in `community_platform_user_feed_preferences` (for
     * example, a column such as `include_recommended_feeds`) to decide
     * whether to blend in globally recommended or default feeds.
     */
    include_recommended?: boolean | undefined;

    /**
     * Optional explicit selector for a particular default feed
     * configuration to use when constructing the home feed.
     *
     * This value should correspond directly to the `feed_code` column on
     * the `community_platform_default_feeds` Prisma model. When provided,
     * the backend can preferentially use the specified default feed
     * configuration (for example, a curated onboarding feed) when blending
     * or substituting a user's personalized subscriptions.
     *
     * If omitted, the backend relies on the member user's feed preferences
     * and platform defaults in `community_platform_default_feeds` to
     * determine which default feeds, if any, should influence the home
     * feed.
     */
    feed_code?: string | undefined;
  };
}
