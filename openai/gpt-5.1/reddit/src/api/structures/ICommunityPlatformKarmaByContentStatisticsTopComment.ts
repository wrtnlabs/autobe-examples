import { tags } from "typia";

export namespace ICommunityPlatformKarmaByContentStatisticsTopComment {
  /**
   * Summary information for a single top-ranked comment within
   * karma-by-content statistics.
   *
   * This schema represents one row in a leaderboard or analytics result set
   * that highlights comments with the highest accumulated karma across posts
   * and communities. It exposes only the identifiers, author information, an
   * excerpt of the comment body, and aggregate scoring fields that are
   * efficient and safe to render in list contexts.
   *
   * The DTO is primarily used in administrative and analytical dashboards to
   * surface the most impactful or highly-engaged discussion contributions. It
   * is typically returned as part of a paginated collection and used as a
   * starting point for navigating to full comment threads, post details, or
   * user-level analytics.
   */
  export type ISummary = {
    /**
     * Unique identifier of the comment.
     *
     * This value corresponds to the primary key of the
     * `community_platform_comments` table and serves as the stable
     * reference used to fetch the full comment entity or related analytics.
     * It is suitable for internal linking and drill-down operations within
     * moderation and analytics tools.
     */
    commentId: string & tags.Format<"uuid">;

    /**
     * Identifier of the post to which this comment belongs.
     *
     * The field allows analytics consumers to group or filter top comments
     * by their parent post and to construct links back to the associated
     * thread. It matches the primary key of the parent post record and is
     * useful when aggregating metrics at the post level.
     */
    postId: string & tags.Format<"uuid">;

    /**
     * Identifier of the community that contains the parent post and this
     * comment.
     *
     * This value supports grouping, filtering, and aggregation of top
     * comments by community. It corresponds to the primary key of the
     * community entity and can be used to join this summary with
     * community-level analytics or metadata.
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Human-readable slug or handle of the community containing this
     * comment.
     *
     * The slug is designed to be URL-friendly and is used in leaderboard
     * tables, navigation links, and badges where a readable community
     * identifier is preferred over an internal UUID. It typically remains
     * stable so that external references and bookmarks do not break.
     */
    communitySlug: string & tags.MinLength<1> & tags.MaxLength<64>;

    /**
     * Short excerpt of the comment body for compact display.
     *
     * The backend or client usually trims the original comment text to the
     * first few hundred characters and removes or normalizes line breaks to
     * make the excerpt safe for use in tables, cards, and other dense
     * analytics views. The full comment body is accessible through separate
     * detail endpoints if required.
     */
    excerpt: string & tags.MinLength<1> & tags.MaxLength<500>;

    /**
     * Identifier of the user who authored this comment.
     *
     * This value links the comment to its author and corresponds to the
     * primary key of the member user entity. It is used for reputation
     * tracking, user-level karma summaries, and navigation to the author’s
     * profile or moderation history.
     */
    authorUserId: string & tags.Format<"uuid">;

    /**
     * Username or handle of the comment author.
     *
     * This human-readable identifier is intended for display in analytics
     * dashboards, moderation tools, and leaderboards where quick
     * recognition of the commenter is important. It usually matches the
     * public handle that appears alongside the comment in the main
     * application UI.
     */
    authorUsername: string & tags.MinLength<1> & tags.MaxLength<64>;

    /**
     * Total karma accumulated by this comment.
     *
     * The value is typically computed as upvotes minus downvotes,
     * potentially including platform-specific weighting rules. Higher
     * values indicate stronger positive reception of the comment and are
     * used to order comments in karma-by-content analytics views.
     */
    totalKarma: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Rank of this comment within the top-comments result set.
     *
     * A value of `1` indicates the highest-karma comment under the current
     * analytics query, with larger integers representing lower-ranked
     * entries. The rank is usually computed within the context of the
     * applied filters, such as a time window, community scope, or content
     * subset.
     */
    rank: number & tags.Type<"int32"> & tags.Minimum<1>;
  };
}
