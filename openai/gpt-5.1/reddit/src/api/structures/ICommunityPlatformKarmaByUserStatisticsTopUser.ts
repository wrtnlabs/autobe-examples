import { tags } from "typia";

export namespace ICommunityPlatformKarmaByUserStatisticsTopUser {
  /**
   * Summary information for an individual top-ranked user in karma
   * distribution statistics.
   *
   * This DTO represents a single row in a karma leaderboard or analytics
   * table, focusing on how a particular member user accumulates reputation
   * across the community. It combines identity information with multiple
   * karma breakdowns that distinguish between posts and comments.
   *
   * Values in this structure are typically derived from the
   * community_platform_memberusers and community_platform_user_karmas tables,
   * along with vote aggregates from post and comment vote tables. It is
   * designed for read-only analytical use and is not persisted directly as a
   * standalone database row.
   */
  export type ISummary = {
    /**
     * Stable unique identifier of the member user.
     *
     * This value corresponds to the primary key of the
     * community_platform_memberusers table and is used to join this
     * statistics row back to the canonical user account and profile
     * records.
     */
    userId: string & tags.Format<"uuid">;

    /**
     * Publicly visible username or handle of the member user.
     *
     * The username is used as the primary display label in ranking tables,
     * leaderboards, and analytical overviews. It should match the unique
     * login or handle field stored on the underlying member user entity.
     */
    username: string & tags.MinLength<1> & tags.MaxLength<64>;

    /**
     * Human-friendly display name for the member user when available.
     *
     * This may duplicate the username or provide a more descriptive full
     * name. It is optional because not all users configure a display name;
     * when not configured, clients should fall back to showing the username
     * or another identity field instead of assuming a non-empty value.
     */
    displayName?:
      | (string & tags.MinLength<1> & tags.MaxLength<128>)
      | undefined;

    /**
     * Total accumulated karma for this user across all supported content
     * types in the current statistics scope.
     *
     * This value is generally computed as the sum of postKarma and
     * commentKarma and may be influenced by platform-specific vote
     * weighting or moderation adjustments. It is always non-negative and is
     * suitable for ordering users in leaderboards.
     */
    totalKarma: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total karma derived from the user's posts only within the current
     * statistics scope.
     *
     * This metric helps distinguish users who primarily gain reputation
     * from original posts. It is computed from post vote aggregates and is
     * always a non-negative integer, even when a user has never created a
     * post (in which case it is 0).
     */
    postKarma: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total karma derived from the user's comments only within the current
     * statistics scope.
     *
     * This metric complements postKarma to provide a full breakdown of the
     * user's reputation sources. It is computed from comment vote
     * aggregates and is always a non-negative integer, even when a user has
     * never created a comment (in which case it is 0).
     */
    commentKarma: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Rank index of this user within the current statistics snapshot, where
     * 1 represents the highest karma.
     *
     * Ranks are computed for the specific filtered window or cohort used
     * when generating the analytics (for example, a time-bounded or
     * community-scoped leaderboard). The rank value is a positive integer
     * and should not be assumed to be globally stable across different
     * query scopes or time ranges.
     */
    rank: number & tags.Type<"int32"> & tags.Minimum<1>;
  };
}
