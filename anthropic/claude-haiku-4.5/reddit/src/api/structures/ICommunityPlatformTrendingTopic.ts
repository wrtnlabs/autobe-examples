import { tags } from "typia";

export namespace ICommunityPlatformTrendingTopic {
  /**
   * Lightweight summary representation of trending content for efficient list
   * display and discovery feeds.
   *
   * Provides essential trending information without unnecessary detail,
   * optimized for rendering in trending feed views, search results, and
   * discovery cards. Contains trending metrics, engagement counts, and
   * classification information needed for users to understand why content is
   * trending.
   *
   * Used in paginated trending content lists where multiple items are
   * displayed simultaneously. Summary variant excludes full post or community
   * details (name, description) to keep payload small while including
   * sufficient context for user engagement.
   */
  export type ISummary = {
    /**
     * Unique identifier for the trending entry.
     *
     * Primary key for this trending content record. Used to reference this
     * specific trending entry in pagination, filtering, and retrieval
     * operations.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Foreign key referencing the post if this trending entry represents a
     * post.
     *
     * Null for community trending entries. References the post being
     * tracked in this trending record. Used to link trending metrics back
     * to the original post content.
     */
    community_platform_post_id?:
      | (string & tags.Format<"uuid">)
      | null
      | undefined;

    /**
     * Foreign key referencing the community.
     *
     * For post trending entries, references the community where post was
     * published. For community trending entries, the community itself.
     * Essential for organizing trending content by community context.
     */
    community_platform_community_id: string & tags.Format<"uuid">;

    /**
     * Type of trending content: 'post' or 'community'.
     *
     * Indicates what kind of entity is trending for appropriate UI
     * rendering and result filtering. Used to distinguish between
     * post-level and community-level trending entries.
     */
    trending_type: "post" | "community";

    /**
     * Trending category algorithm: 'hot' (current engagement), 'new'
     * (recent creation), 'top' (all-time engagement), or 'controversial'
     * (polarizing votes).
     *
     * Determines which ranking algorithm was used to calculate trending
     * rank. Different categories use different metrics: hot combines
     * engagement with time decay, new focuses on recency, top uses
     * cumulative votes, and controversial identifies polarizing content
     * with dual support.
     */
    trending_category: "hot" | "new" | "top" | "controversial";

    /**
     * Hot algorithm score combining engagement with time decay.
     *
     * Score = (upvotes - downvotes + comments*0.5) / (1 +
     * hours_since_creation/24). Higher score indicates more current
     * trending momentum. Null when not applicable to trending_category
     * (e.g., for 'top' category entries).
     */
    hot_score?: number | null | undefined;

    /**
     * Top algorithm score: total upvotes minus downvotes.
     *
     * Identifies all-time most popular content. Used for 'top' category
     * ranking. Null when not applicable to trending_category (e.g., for
     * 'hot' or 'new' category entries).
     */
    top_score?: number | null | undefined;

    /**
     * Controversy score identifying polarizing content: MIN(upvotes,
     * downvotes) when both >= 5.
     *
     * Shows content with significant engagement from both sides. Null when
     * content doesn't meet controversy threshold or for non-controversial
     * categories. Used for 'controversial' category ranking.
     */
    controversy_score?: number | null | undefined;

    /**
     * Total number of upvotes on this trending content.
     *
     * Indicates positive community reception and engagement metric used in
     * trending calculations. Cached for efficient retrieval without
     * real-time aggregation.
     */
    upvote_count: number & tags.Type<"int32">;

    /**
     * Total number of downvotes on this trending content.
     *
     * Used in scoring calculations and controversy metrics. Part of
     * trending algorithm calculations and engagement metrics.
     */
    downvote_count: number & tags.Type<"int32">;

    /**
     * Total number of comments on this trending content.
     *
     * Higher comment counts indicate active discussion and engagement. For
     * post trending, counts comments on the post; for community trending,
     * counts total comments in community. Used as factor in hot algorithm
     * scoring.
     */
    comment_count: number & tags.Type<"int32">;

    /**
     * Current subscriber count for the community.
     *
     * For post trending, shows the community size where post was published;
     * for community trending, shows the community's subscriber count.
     * Provides context for understanding content reach and community size.
     */
    subscriber_count: number & tags.Type<"int32">;

    /**
     * Rate of change metric showing engagement growth speed:
     * (new_engagement - old_engagement) / time_period.
     *
     * Indicates how rapidly content or community is gaining popularity.
     * Used for 'new' category trending to identify rapidly emerging
     * content. Null for categories where velocity is not calculated.
     */
    trend_velocity?: number | null | undefined;

    /**
     * Ranking position within the trending category (1 = most trending, 2 =
     * second most trending, etc.).
     *
     * Indicates position in the trending list for the specific category.
     * Used for pagination and top-N queries across different trending
     * categories.
     */
    rank: number & tags.Type<"int32">;

    /**
     * Timestamp when the original content (post or community) was created.
     *
     * Used for age-based filtering and time decay calculations in trending
     * algorithms. Immutable after creation.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this trending entry was last refreshed or recalculated
     * from source data.
     *
     * Indicates how current the trending metrics are. Used to determine if
     * cached trending data needs refresh for consistency.
     */
    refreshed_at: string & tags.Format<"date-time">;
  };
}
