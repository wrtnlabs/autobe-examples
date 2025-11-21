import { tags } from "typia";

export namespace ICommunityPlatformVoteScore {
  /**
   * Summary view of vote scores for efficient listing and ranking operations.
   *
   * Provides essential score information for content ranking and display
   * purposes, excluding detailed algorithmic scores that are primarily used
   * for internal calculations. This DTO represents pre-computed voting scores
   * for posts and comments that enable efficient ranking and sorting
   * operations across the platform.
   *
   * The score aggregation system maintains historical score snapshots for
   * trend analysis while supporting real-time updates for current engagement
   * metrics. Scores are calculated using platform-specific algorithms that
   * consider vote direction, voter reputation, and temporal factors for
   * optimal content discovery.
   *
   * Optimized for performance in list views and ranking operations where full
   * score details are not required but sufficient context is needed for
   * meaningful content curation and user engagement analysis.
   */
  export type ISummary = {
    /**
     * Primary Key identifier for the vote score record. Generated
     * automatically using UUID v4 for unique identification across the
     * platform.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of content being scored. Determines which foreign key
     * relationship is active. Valid values: 'post', 'comment'. Used for
     * routing score calculations to the appropriate content type and
     * enabling type-specific ranking algorithms.
     */
    content_type: string;

    /**
     * Aggregate score calculated from upvotes minus downvotes. Represents
     * the net voting sentiment for the content item. Positive values
     * indicate favorable reception, negative values indicate controversial
     * or disliked content.
     */
    total_score: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of upvotes received by the content item. Indicates
     * positive engagement and approval from the community members.
     */
    upvote_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of downvotes received by the content item. Reflects
     * negative feedback or disagreement with the content from community
     * members.
     */
    downvote_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Algorithmic score indicating how controversial the content is based
     * on vote distribution. Higher values indicate more polarized voting
     * patterns with significant upvote and downvote activity.
     */
    controversy_score: number & tags.Minimum<0>;

    /**
     * Time-weighted score for trending content ranking. Considers both vote
     * volume and recency to identify content that is currently gaining
     * popularity or engagement momentum.
     */
    hot_score: number & tags.Minimum<0>;

    /**
     * Algorithmic score for 'best' content ranking considering multiple
     * factors including vote ratio, engagement velocity, and quality
     * indicators. Used for sorting content by overall quality rather than
     * pure popularity.
     */
    best_score: number & tags.Minimum<0>;

    /**
     * Timestamp when the score was last calculated. Used for tracking score
     * freshness and determining when recalculation is needed based on
     * platform activity patterns.
     */
    calculated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the score becomes stale and requires recalculation.
     * Ensures score accuracy by triggering periodic updates based on
     * content engagement patterns and platform activity levels.
     */
    score_valid_until: string & tags.Format<"date-time">;
  };

  /**
   * Search criteria and pagination parameters for vote score filtering
   * operations.
   *
   * Provides comprehensive filtering capabilities for vote score records
   * stored in the community_platform_vote_scores table. Supports content type
   * classification (post vs comment), score range queries across multiple
   * metrics (total_score, best_score), date-based filtering by calculation
   * timestamps, and customizable sorting options.
   *
   * The filtering system enables administrators to monitor voting patterns
   * and content performance across the platform. Pagination parameters ensure
   * efficient data retrieval for large datasets while maintaining performance
   * standards. Security considerations restrict access to platform
   * administrators only due to the sensitive nature of aggregated voting
   * metrics.
   *
   * All filtering parameters are optional, allowing flexible search
   * combinations. When multiple filters are applied, results must satisfy all
   * specified conditions. Empty requests return paginated results with
   * default sorting by calculated_at in descending order.
   */
  export type IRequest = {
    /** Page number for paginated results. Starts from 1 for the first page. */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of records per page. Maximum limit is 100 records to ensure
     * performance.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter by content type classification. Valid values: 'post' for post
     * content scoring, 'comment' for comment scoring.
     */
    content_type?: "post" | "comment" | undefined;

    /**
     * Minimum total score threshold for filtering. Returns records with
     * total_score greater than or equal to this value.
     */
    min_total_score?: (number & tags.Type<"int32">) | undefined;

    /**
     * Maximum total score threshold for filtering. Returns records with
     * total_score less than or equal to this value.
     */
    max_total_score?: (number & tags.Type<"int32">) | undefined;

    /**
     * Minimum best score threshold for filtering. Returns records with
     * best_score greater than or equal to this value.
     */
    min_best_score?: number | undefined;

    /**
     * Maximum best score threshold for filtering. Returns records with
     * best_score less than or equal to this value.
     */
    max_best_score?: number | undefined;

    /**
     * Filter scores calculated after this timestamp. Uses ISO 8601 format
     * for precise date-time filtering.
     */
    calculated_after?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter scores calculated before this timestamp. Uses ISO 8601 format
     * for precise date-time filtering.
     */
    calculated_before?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Field to sort results by. Determines the primary sorting criteria for
     * the search results.
     */
    sort_by?:
      | "total_score"
      | "hot_score"
      | "best_score"
      | "calculated_at"
      | undefined;

    /**
     * Sort order direction for the search results. Ascending for increasing
     * order, descending for decreasing order.
     */
    order?: "asc" | "desc" | undefined;
  };
}
