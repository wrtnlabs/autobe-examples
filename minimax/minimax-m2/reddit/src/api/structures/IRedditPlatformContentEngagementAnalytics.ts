import { tags } from "typia";

export namespace IRedditPlatformContentEngagementAnalytics {
  /**
   * Comprehensive request schema for engagement analytics filtering and
   * pagination supporting sophisticated content performance analysis. Enables
   * filtering by engagement types, duration ranges, target entities
   * (communities, posts, comments), temporal ranges, and metadata inclusion.
   * Includes pagination parameters and sorting options for comprehensive
   * engagement analysis suitable for content creators, community moderators,
   * and platform administrators. Authentication context is derived from the
   * authenticated JWT token for security and access control.
   */
  export type IRequest = {
    /**
     * Filter engagement types to include in analytics: 'view' for content
     * consumption, 'scroll' for content interaction, 'share' for social
     * distribution, 'save' for bookmarking, 'click_external_link' for
     * outbound engagement. Empty array returns all engagement types for
     * comprehensive analysis.
     */
    engagement_types?:
      | ("view" | "scroll" | "share" | "save" | "click_external_link")[]
      | undefined;

    /**
     * Minimum engagement duration threshold in seconds for filtering
     * low-quality interactions. Helps focus on meaningful engagement by
     * excluding brief, potentially accidental interactions.
     */
    duration_min_seconds?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;

    /**
     * Maximum engagement duration in seconds for filtering unusually long
     * interactions that may indicate technical issues or bot behavior.
     * Ensures data quality in engagement analysis.
     */
    duration_max_seconds?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined;

    /**
     * Filter engagements by specific community identifier for
     * community-specific analytics. Enables community moderators to analyze
     * engagement patterns within their communities.
     */
    target_community_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter engagements by specific post identifier for detailed post
     * performance analysis. Useful for creators monitoring individual post
     * performance.
     */
    target_post_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter engagements by specific comment identifier for comment-level
     * engagement analysis. Enables detailed discussion quality assessment.
     */
    target_comment_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Start date for engagement filtering in ISO 8601 format. Enables
     * time-based analysis and trend identification for specific time
     * periods.
     */
    date_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for engagement filtering in ISO 8601 format. Defines the end
     * boundary for time-based engagement analysis.
     */
    date_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Include detailed engagement metadata in results for advanced
     * analytics. Provides granular interaction data including scroll depth,
     * click coordinates, and other behavioral insights for sophisticated
     * analysis.
     */
    with_metadata?: boolean | undefined;

    /**
     * Return aggregated analytics instead of raw engagement records.
     * Provides summary statistics and trends rather than individual
     * interaction data for executive reporting and high-level insights.
     */
    aggregated?: boolean | undefined;

    /**
     * Page number for pagination (1-indexed). Controls result set
     * positioning for large datasets and prevents performance issues with
     * excessive data retrieval.
     */
    page: number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>;

    /**
     * Number of records per page (max 100). Controls data volume per
     * response to ensure optimal performance and manageable response
     * sizes.
     */
    limit: number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>;

    /**
     * Sort order for results based on engagement timestamp, duration, or
     * other relevant metrics. Determines result organization for optimal
     * analysis and user experience.
     */
    order_by?:
      | "created_at_asc"
      | "created_at_desc"
      | "duration_desc"
      | "duration_asc"
      | undefined;
  };
}
