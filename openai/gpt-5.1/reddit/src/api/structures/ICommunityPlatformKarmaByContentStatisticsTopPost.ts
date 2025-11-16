import { tags } from "typia";

export namespace ICommunityPlatformKarmaByContentStatisticsTopPost {
  /**
   * Summary information for a single top-ranked post within karma-by-content
   * statistics.
   *
   * This schema represents one row in a leaderboard or analytics result set
   * that highlights posts with the highest accumulated karma across the
   * community platform. It focuses on identifiers, author information, and
   * aggregate scoring fields that are safe and efficient to display in list
   * views.
   *
   * The DTO is designed for administrative and analytical dashboards that
   * need to surface the most impactful or highly-engaged posts. It is
   * typically returned as part of a paginated collection alongside other
   * top-ranked posts and is used as an entry point for drill-down into full
   * post and user analytics.
   */
  export type ISummary = {
    /**
     * Unique identifier of the post.
     *
     * This value corresponds to the primary key of the
     * `community_platform_posts` table and serves as the stable reference
     * used to fetch the full post entity or related analytics. It is
     * suitable for use in internal links, drill-down operations, and
     * cross-service calls that require an unambiguous post reference.
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Identifier of the community the post belongs to.
     *
     * This field enables grouping, filtering, and aggregation of top posts
     * by community in analytics views. It matches the primary key of the
     * corresponding community record and can be used to join this summary
     * with community-level metrics or metadata.
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Human-readable slug or handle of the community containing this post.
     *
     * The slug is suitable for inclusion in URLs, breadcrumb displays, and
     * leaderboard tables where a compact, readable identifier for the
     * community is preferred over an internal UUID. It typically remains
     * stable over time to avoid breaking external links.
     */
    communitySlug: string & tags.MinLength<1> & tags.MaxLength<64>;

    /**
     * Title or headline of the post.
     *
     * This text is intended for concise display in leaderboards, analytics
     * tables, and cards. It may be truncated by client implementations for
     * very long titles, but the backend preserves the full stored value for
     * correctness and accessibility.
     */
    title: string & tags.MinLength<1> & tags.MaxLength<300>;

    /**
     * Identifier of the user who created the post.
     *
     * This value links the post to its author and corresponds to the
     * primary key of the member user entity. It is used for user-level
     * analytics, reputation summaries, and navigation to the author’s
     * profile or karma history.
     */
    authorUserId: string & tags.Format<"uuid">;

    /**
     * Username or handle of the post author.
     *
     * This value is optimized for display in analytics views, leaderboards,
     * and admin tools where a human-readable label is needed. It usually
     * matches the public handle shown elsewhere in the product and may be
     * used for simple search and filtering in dashboards.
     */
    authorUsername: string & tags.MinLength<1> & tags.MaxLength<64>;

    /**
     * Total karma accumulated by this post.
     *
     * The value is typically computed as upvotes minus downvotes, possibly
     * with platform-specific weighting or additional business logic. Higher
     * values indicate stronger positive reception by the community and are
     * used to rank posts in karma-by-content analytics.
     */
    totalKarma: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Rank of this post within the top-posts result set.
     *
     * A value of `1` indicates the highest-karma post in the current query
     * scope, with larger integers representing lower-ranked entries. The
     * ranking is usually computed within the context of the filters applied
     * to the analytics query, such as a specific time window or community
     * segment.
     */
    rank: number & tags.Type<"int32"> & tags.Minimum<1>;
  };
}
