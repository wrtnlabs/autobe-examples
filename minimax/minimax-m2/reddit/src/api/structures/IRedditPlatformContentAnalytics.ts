import { tags } from "typia";

export namespace IRedditPlatformContentAnalytics {
  /**
   * Query parameters for filtering and searching content analytics across the
   * Reddit platform.
   *
   * Supports comprehensive analytics filtering for performance dashboards,
   * content optimization analysis, and platform health monitoring. Enables
   * detailed metric-based filtering, time range analysis, and
   * content-specific performance tracking to support data-driven content
   * strategy decisions and community engagement insights.
   *
   * This analytics filtering system provides multi-dimensional analysis
   * capabilities including content type breakdown (text posts, link posts,
   * image posts, video posts, comments), engagement rate analysis, virality
   * scoring, view count tracking, and interaction pattern monitoring.
   * Analytics can be filtered by specific communities, time ranges, content
   * types, engagement thresholds, and performance metrics.
   *
   * Key filtering capabilities include tracking view counts and unique viewer
   * metrics, analyzing upvote/downvote ratios, monitoring comment interaction
   * rates, measuring share and save behaviors, calculating engagement rates
   * and virality scores, tracking view duration and bounce rates, and
   * identifying top-performing content patterns across communities.
   *
   * Security considerations include role-based access requiring administrator
   * or moderator permissions to access sensitive analytics data. The system
   * implements rate limiting for analytics queries to prevent excessive
   * database load and supports comprehensive pagination for large-scale data
   * analysis across the platform.
   */
  export type IRequest = {
    /**
     * Filter analytics by content type. Supports comma-separated list of
     * types to include: 'post_text', 'post_link', 'post_image',
     * 'post_video', 'comment'. Enables focused analysis of specific content
     * categories for performance optimization and engagement pattern
     * analysis.
     */
    content_type?: string | undefined;

    /**
     * Filter analytics by community ID. Shows only content analytics for
     * specific community, enabling community-specific performance analysis
     * and moderator insights into content effectiveness within their
     * managed communities.
     */
    community_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter analytics by specific post ID. Shows detailed analytics for
     * particular content piece, supporting creator insights, content
     * performance tracking, and individual post optimization analysis.
     */
    post_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Minimum engagement rate threshold. Include only content with
     * engagement rate at or above this decimal value (0.0 to 1.0). Enables
     * filtering for high-performing content and engagement optimization
     * strategies.
     */
    min_engagement_rate?:
      | (number & tags.Minimum<0> & tags.Maximum<1>)
      | undefined;

    /**
     * Maximum engagement rate threshold. Include only content with
     * engagement rate at or below this decimal value (0.0 to 1.0). Supports
     * analysis of content that may need optimization or community guideline
     * review.
     */
    max_engagement_rate?:
      | (number & tags.Minimum<0> & tags.Maximum<1>)
      | undefined;

    /**
     * Minimum view count threshold. Filter content by minimum reach metric,
     * ensuring analysis focuses on content with sufficient visibility for
     * meaningful performance insights.
     */
    min_view_count?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;

    /**
     * Metric to sort analytics by for dashboard organization and analysis
     * prioritization. Default is 'view_count' for broad engagement
     * analysis.
     */
    sort_by?:
      | "view_count"
      | "engagement_rate"
      | "virality_score"
      | "upvote_count"
      | "comment_count"
      | undefined;

    /**
     * Sort direction for analytics results. Default is 'desc' (highest
     * values first) for prioritizing top-performing content in dashboard
     * displays.
     */
    sort_direction?: "asc" | "desc" | undefined;

    /**
     * Start date for analytics filtering. Include analytics updated after
     * this ISO 8601 timestamp, enabling time-based performance analysis and
     * trend identification over specific periods.
     */
    date_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for analytics filtering. Include analytics updated before
     * this ISO 8601 timestamp, supporting bounded time analysis and
     * periodic performance reporting.
     */
    date_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Include analytics for deleted content. Default is false. When true,
     * includes soft-deleted content for comprehensive analysis, audit
     * trails, and moderation review purposes.
     */
    include_deleted?: boolean | undefined;

    /**
     * Page number for pagination. Default is 1. Enables efficient
     * navigation through large analytics datasets while maintaining query
     * performance.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Number of analytics records per page. Default is 20, maximum 100.
     * Controls data transfer volume and query performance for large-scale
     * analytics operations.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /**
     * Minimum user reputation level filter. Include analytics from content
     * created by users with karma score at or above this threshold.
     * Supports analysis of high-quality content creators and
     * reputation-based content filtering.
     */
    min_user_reputation?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;
  };

  /**
   * Comprehensive content performance analytics and engagement metrics for
   * optimization and insight generation.
   *
   * Provides detailed performance tracking and engagement analytics that
   * enable content creators, community moderators, and platform
   * administrators to understand content performance, optimize content
   * strategy, and make data-driven decisions about content creation and
   * community management.
   *
   * This analytics entity captures key performance indicators including view
   * metrics, engagement rates, virality scores, and interaction patterns. It
   * supports content performance analysis, creator feedback systems,
   * recommendation algorithm optimization, and platform analytics through
   * comprehensive engagement tracking.
   *
   * The analytics data is used for identifying high-performing content
   * patterns, optimizing recommendation algorithms, providing creator
   * insights, and supporting data-driven content strategy decisions. It
   * integrates with content engagement tracking to provide comprehensive
   * performance analytics across posts and comments.
   *
   * Ideal for content performance dashboards, creator analytics, community
   * health monitoring, and platform-wide performance analysis. Soft-deleted
   * content is tracked via deleted_at timestamp for audit and recovery
   * purposes.
   */
  export type ISummary = {
    /**
     * Unique identifier for the content analytics record. Primary key for
     * tracking analytics data.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Associated post identifier linking analytics to specific post
     * content. Null for comment-only analytics.
     */
    reddit_platform_post_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Associated comment identifier linking analytics to specific comment
     * content. Null for post-only analytics.
     */
    reddit_platform_comment_id?:
      | (string & tags.Format<"uuid">)
      | null
      | undefined;

    /**
     * Associated community identifier providing analytics context and
     * community-specific performance insights.
     */
    reddit_platform_community_id: string & tags.Format<"uuid">;

    /**
     * Type of content being analyzed: post_text, post_link, post_image,
     * post_video, or comment. Determines analytics categorization and
     * performance benchmarks.
     */
    content_type: string;

    /**
     * Total number of content views and impressions. Key metric for content
     * reach and visibility analysis.
     */
    view_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of unique users who viewed the content. Important for reach
     * analysis and deduplication of engagement metrics.
     */
    unique_view_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Current upvote count for engagement measurement. Primary indicator of
     * positive community response and content quality.
     */
    upvote_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Current downvote count for engagement measurement. Indicator of
     * negative community response and potential content issues.
     */
    downvote_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of comments on this content. Measures discussion level
     * and community engagement depth.
     */
    comment_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of times content was shared or cross-posted. Measures content
     * virality and cross-community spread.
     */
    share_count?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Number of users who saved/bookmarked this content. Indicates content
     * value and long-term interest.
     */
    save_count?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Number of user reports filed against this content. Critical for
     * moderation workflow and content quality monitoring.
     */
    report_count?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Calculated engagement rate (interactions / views) as decimal
     * percentage. Key performance indicator for content effectiveness.
     */
    engagement_rate?: number | null | undefined;

    /**
     * Virality coefficient based on sharing behavior and cross-community
     * spread. Predictive metric for content growth potential.
     */
    virality_score?: number | null | undefined;

    /**
     * Average time users spent viewing this content in seconds. Measures
     * content quality and user engagement depth.
     */
    view_duration_avg?: number | null | undefined;

    /**
     * Percentage of users who viewed and immediately left. Indicates
     * content relevance and user experience quality.
     */
    bounce_rate?: number | null | undefined;

    /**
     * Content creation timestamp for time-series analysis and trend
     * tracking. Essential for performance comparison over time.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last analytics update timestamp for tracking data freshness and
     * ensuring analytics currency.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft delete timestamp when content is removed from the platform.
     * Indicates content has been deleted but analytics data is preserved
     * for historical analysis.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
