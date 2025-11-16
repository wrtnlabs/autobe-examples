import { tags } from "typia";

import { ICommunityPlatformKarmaByContentStatisticsTopPost } from "./ICommunityPlatformKarmaByContentStatisticsTopPost";
import { ICommunityPlatformKarmaByContentStatisticsTopComment } from "./ICommunityPlatformKarmaByContentStatisticsTopComment";

export namespace ICommunityPlatformKarmaByContentStatistics {
  /**
   * Request payload for retrieving aggregated karma statistics grouped by
   * content items (posts and comments).
   *
   * This DTO encapsulates analytical filters, scoping information, and
   * pagination controls used by administrative or internal analytics clients
   * to query per-content karma metrics based on `community_platform_posts`,
   * `community_platform_comments`, and their associated vote tables.
   */
  export type IRequest = {
    /**
     * Page number for paginated results. Must be a positive integer where 1
     * represents the first page.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Maximum number of content statistic rows to return per page. Must be
     * a positive integer. Implementations typically enforce an upper bound
     * such as 200 to protect system performance.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<200>;

    /**
     * Optional list of community identifiers. When provided, only posts and
     * comments belonging to these communities are considered in the
     * analytics.
     */
    communityIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional list of author identifiers. When specified, limits the
     * statistics to content created by these users.
     */
    authorIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional set of content types to include in the analytics. When
     * omitted or empty, both posts and comments may be included depending
     * on implementation defaults.
     */
    contentTypes?: ("post" | "comment")[] | undefined;

    /**
     * Optional lower bound for net score (typically upvotes minus
     * downvotes). Only content items with score greater than or equal to
     * this value are included.
     */
    minScore?: (number & tags.Type<"int32">) | undefined;

    /**
     * Optional upper bound for net score. Only content items with score
     * less than or equal to this value are included.
     */
    maxScore?: (number & tags.Type<"int32">) | undefined;

    /**
     * Optional lower bound for total vote count (sum of upvotes and
     * downvotes). Only content items with at least this many votes are
     * included in the result set.
     */
    minVoteCount?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Optional inclusive start of the creation-time window (ISO 8601
     * date-time) for posts and comments to include. When null or omitted,
     * no lower creation-time bound is applied.
     */
    createdFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional exclusive end of the creation-time window (ISO 8601
     * date-time) for posts and comments. When null or omitted, no upper
     * creation-time bound is applied.
     */
    createdTo?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Sort key used to order the content-level karma statistics.
     *
     * - `score`: Net karma score (upvotes minus downvotes).
     * - `upvotes`: Number of upvotes.
     * - `downvotes`: Number of downvotes.
     * - `voteCount`: Total number of votes.
     * - `createdAt`: Creation timestamp of the content item.
     */
    sortBy: "score" | "upvotes" | "downvotes" | "voteCount" | "createdAt";

    /**
     * Sort direction to apply for the selected `sortBy` key. Use `asc` for
     * ascending order or `desc` for descending order.
     */
    sortDirection: "asc" | "desc";
  };

  /**
   * Summary statistics describing how community karma is distributed across
   * content items (posts and comments) within the platform for a particular
   * analytical snapshot.
   *
   * This DTO aggregates basic volume metrics such as the total number of
   * contents and the total karma attached to posts and comments, as well as
   * distribution measures like average and median karma per content item. It
   * is intended for use in analytics dashboards, admin reports, and
   * monitoring screens.
   *
   * The structure does not map directly to a single Prisma model. Instead, it
   * is derived from multiple underlying tables including
   * community_platform_posts, community_platform_comments,
   * community_platform_post_votes, and community_platform_comment_votes.
   * Implementations should treat it as a read-only view that is recomputed
   * based on the filters and time ranges specified in the corresponding
   * request DTO.
   */
  export type ISummary = {
    /**
     * Total number of content items (posts plus comments) included in this
     * karma statistics snapshot.
     *
     * The set of content items is defined by upstream filters such as
     * communities, time windows, or visibility rules. When there are no
     * matching contents in scope, this value is 0 and related
     * averages/medians should be treated accordingly.
     */
    totalContents: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total sum of karma points attached to posts only across the platform
     * or within the filtered scope represented by this snapshot.
     *
     * This value is computed from post-level vote and karma aggregates and
     * is always non-negative. When no posts are in scope, this value is 0.
     */
    totalPostKarma: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total sum of karma points attached to comments only across the
     * platform or within the filtered scope represented by this snapshot.
     *
     * This value is computed from comment-level vote and karma aggregates
     * and is always non-negative. When no comments are in scope, this value
     * is 0.
     */
    totalCommentKarma: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Average karma per content item in the snapshot, expressed as a
     * numeric mean.
     *
     * Implementations typically compute this as (totalPostKarma +
     * totalCommentKarma) divided by totalContents. When totalContents is 0,
     * this value should be returned as 0.0 to avoid division-by-zero
     * behavior and to signal that there is no meaningful content activity
     * in scope.
     */
    averageKarmaPerContent: number & tags.Minimum<0>;

    /**
     * Median karma value across all content items in this snapshot.
     *
     * The median helps describe a typical engagement level per piece of
     * content and is less sensitive to outliers than the average. When
     * there are no contents in scope, implementations should return 0 to
     * indicate that no distribution can be computed.
     */
    medianKarmaPerContent: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Ordered list of top posts by karma, limited to a small slice suitable
     * for analytics summaries.
     *
     * Items are typically ordered in descending order of total karma and
     * represent only the top-N posts within the filtered scope for this
     * snapshot. The array may be empty if no posts qualify or if there are
     * no posts in scope, and consumers must not assume a fixed length.
     */
    topPosts: ICommunityPlatformKarmaByContentStatisticsTopPost.ISummary[];

    /**
     * Ordered list of top comments by karma, limited to a small slice
     * suitable for analytics summaries.
     *
     * Items are typically ordered in descending order of total karma and
     * represent only the top-N comments within the filtered scope for this
     * snapshot. The array may be empty when there are no qualifying
     * comments or no comments in scope, and clients should handle the empty
     * case gracefully.
     */
    topComments: ICommunityPlatformKarmaByContentStatisticsTopComment.ISummary[];
  };
}
