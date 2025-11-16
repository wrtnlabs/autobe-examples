import { tags } from "typia";

import { ICommunityPlatformCommunity } from "./ICommunityPlatformCommunity";

export namespace ICommunityPlatformTrendingCommunity {
  /**
   * Summary view of trending community from the materialized view
   * representing a community that is currently trending on the platform.
   *
   * Community trends are calculated using subscriber growth metrics to
   * identify communities gaining visibility: hot (growth velocity + recency),
   * new (chronological), top (all-time subscriber counts), or controversial
   * (polarized engagement). Each category provides different community
   * discovery perspectives.
   *
   * This is a read-only view of trending positions. Entries are refreshed
   * periodically (hourly default) rather than calculated on-demand, enabling
   * fast trending community feeds without expensive real-time calculations.
   *
   * Used in trending communities discovery pages where users browse emerging
   * and popular communities. Includes essential community data for display
   * without requiring additional lookups. Foreign key field (`communityId`)
   * enables direct database lookups when detailed current data is needed.
   */
  export type ISummary = {
    /**
     * Unique identifier for the trending community entry in the
     * materialized view.
     *
     * Primary key of the trending content record. Used to reference
     * specific trending positions in queries and pagination.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Foreign key reference to the community being tracked as trending.
     *
     * References community_platform_communities.id. Identifies which
     * community this trending entry represents. Required for all community
     * trending entries.
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Community object containing the details.
     *
     * References the actual community being tracked as trending. Includes
     * community metadata and engagement metrics needed for display in
     * trending feeds.
     */
    community: ICommunityPlatformCommunity.ISummary;

    /**
     * Type of trending content.
     *
     * Always 'community' for this schema type. Indicates this entry
     * represents a trending community (not a trending post). Used to
     * distinguish between trending posts and trending communities.
     */
    trendingType: "post" | "community";

    /**
     * Trending category determining the ranking algorithm.
     *
     * Indicates which trending list this community appears in: 'hot'
     * (engagement + recency), 'new' (chronological), 'top' (all-time
     * metrics), or 'controversial' (polarized engagement). Each category
     * provides different community discovery perspectives.
     */
    trendingCategory: "hot" | "new" | "top" | "controversial";

    /**
     * Hot algorithm score for current trending calculation.
     *
     * Combines subscriber growth velocity with recency to identify
     * communities gaining momentum right now. Higher score = more trending
     * now. Null for non-hot category entries.
     */
    hotScore?: number | null | undefined;

    /**
     * All-time top score based on total subscriber count and post
     * engagement.
     *
     * Identifies largest and most-engaged communities across entire
     * platform history. Used for 'top' category trending. Null for non-top
     * category entries.
     */
    topScore?: number | null | undefined;

    /**
     * Controversy score measuring polarization in community engagement.
     *
     * Identifies communities with significant engagement from both
     * supporters and critics. Higher score = more polarizing. Null for
     * non-controversial category entries.
     */
    controversyScore?: number | null | undefined;

    /**
     * Current subscriber count of the community.
     *
     * Total members subscribed to this community. Used for trending
     * calculations and community size indication.
     */
    subscriberCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total count of non-deleted posts in the community.
     *
     * Activity metric indicating content volume in the community.
     */
    postCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total count of non-deleted comments across all posts.
     *
     * Engagement metric indicating discussion activity level.
     */
    commentCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Rate of subscriber growth over time.
     *
     * Measures how rapidly the community is gaining subscribers:
     * (new_subscribers - old_subscribers) / time_period. Indicates growth
     * acceleration or deceleration. Used for 'new' category trending. Null
     * for non-new category entries.
     */
    trendVelocity?: number | null | undefined;

    /**
     * Ranking position within trending category.
     *
     * 1 = most trending, 2 = second most trending, etc. Used for pagination
     * and top-N queries. Combined with category for unique identification.
     */
    rank: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Community creation timestamp.
     *
     * Time when the community was first created. Used for age-based
     * filtering in trending algorithms. Immutable.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when this trending entry was last refreshed.
     *
     * Indicates when the materialized view was recalculated for this entry.
     * Used to identify stale data and trigger manual recalculation if
     * needed.
     */
    refreshedAt: string & tags.Format<"date-time">;
  };
}
