import { tags } from "typia";

export namespace ICommunityPlatformCommentVote {
  /**
   * Search criteria and pagination parameters for filtering comment votes
   * across the community platform.
   *
   * Provides comprehensive filtering capabilities for retrieving paginated
   * lists of votes cast on specific comments, supporting advanced search
   * functionality for moderation, analysis, and administrative purposes.
   *
   * The request supports multiple filtering dimensions including vote type
   * categorization, voter identification (member, moderator, administrator),
   * temporal ranges, and sorting preferences. This enables detailed vote
   * analysis, moderation workflows, and community engagement tracking.
   *
   * Pagination parameters ensure efficient handling of large vote datasets
   * while maintaining system performance. The filtering capabilities align
   * with the community_platform_comment_votes table structure and support
   * various use cases from basic vote counting to advanced analytical
   * workflows.
   */
  export type IRequest = {
    /**
     * Page number for pagination of vote results.
     *
     * Determines which page of results to retrieve from the paginated vote
     * dataset. Page numbering starts at 1, with each page containing up to
     * the specified limit of vote records. The system calculates total
     * pages based on record count and page size.
     *
     * Pagination enables efficient retrieval of large vote datasets while
     * maintaining performance. Users can navigate through vote history
     * using sequential page numbers or implement cursor-based pagination
     * for large datasets.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Number of vote records to return per page.
     *
     * Controls the page size for paginated vote results. The limit must be
     * between 1 and 100 records per page to balance performance and
     * usability. Smaller limits improve response times for large datasets,
     * while larger limits reduce pagination overhead.
     *
     * The system enforces maximum limits to prevent performance degradation
     * from excessively large page sizes. Optimal limit values depend on the
     * specific use case and dataset characteristics.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /**
     * Filter by specific vote type to narrow search results.
     *
     * Valid vote types include 'upvote' (positive engagement) and
     * 'downvote' (negative feedback). Filtering by vote type enables
     * analysis of voting patterns and sentiment distribution across
     * comments.
     *
     * Vote type filtering helps moderators and administrators understand
     * community engagement dynamics and identify potential content quality
     * issues or controversial discussions.
     */
    vote_type?: "upvote" | "downvote" | undefined;

    /**
     * Field to sort vote results by for organized data presentation.
     *
     * Sorting options include chronological ordering by creation time,
     * categorical ordering by vote type, or weighted ordering by vote
     * influence. Each sorting method serves different analytical purposes
     * and user interface requirements.
     *
     * Proper sorting enhances data readability and supports various vote
     * analysis workflows, from recent activity tracking to influential vote
     * identification.
     */
    order_by?: "created_at" | "vote_type" | "vote_weight" | undefined;

    /**
     * Sort direction for organizing vote results in ascending or descending
     * order.
     *
     * Ascending order presents results from oldest to newest or lowest to
     * highest values. Descending order presents results from newest to
     * oldest or highest to lowest values. The choice depends on the
     * analytical context and user preference.
     *
     * Sort direction combined with order_by field enables comprehensive
     * vote data organization for different analytical perspectives and user
     * interface requirements.
     */
    order?: "asc" | "desc" | undefined;

    /**
     * Filter votes by specific member identifier to analyze individual
     * voting patterns.
     *
     * When provided, returns only votes cast by the specified community
     * member. This enables analysis of individual user engagement patterns,
     * voting consistency, and contribution history across different
     * comments and discussions.
     *
     * Member filtering supports moderation workflows, user behavior
     * analysis, and personalized vote tracking for platform administrators
     * and community managers.
     */
    member_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter votes by specific moderator identifier for moderation audit
     * trails.
     *
     * When provided, returns only votes cast by the specified community
     * moderator. This enables tracking of moderator engagement, vote
     * consistency, and moderation activity across platform content.
     *
     * Moderator vote filtering supports accountability mechanisms,
     * moderation quality assessment, and administrative oversight of
     * community management practices.
     */
    moderator_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter votes by specific administrator identifier for platform
     * management analysis.
     *
     * When provided, returns only votes cast by the specified platform
     * administrator. This enables monitoring of administrative engagement,
     * vote patterns, and content management activities across the
     * platform.
     *
     * Administrator vote filtering supports platform governance,
     * administrative accountability, and system-wide content quality
     * assessment workflows.
     */
    admin_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter votes created after specified timestamp for temporal analysis.
     *
     * Returns votes cast after the provided datetime, enabling analysis of
     * recent voting activity, trend identification, and time-based
     * engagement patterns. Useful for monitoring current community
     * sentiment and recent content interactions.
     *
     * Date range filtering supports temporal analysis, activity monitoring,
     * and historical trend identification across different time periods.
     */
    created_after?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter votes created before specified timestamp for historical
     * analysis.
     *
     * Returns votes cast before the provided datetime, enabling analysis of
     * historical voting patterns, long-term engagement trends, and archived
     * vote data. Useful for retrospective analysis and historical context
     * understanding.
     *
     * Combined with created_after, enables precise date range filtering for
     * focused temporal analysis and specific time period investigations.
     */
    created_before?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Summary view of comment vote entity for aggregated displays and voting
   * analytics.
   *
   * Provides essential voting information without detailed timestamps for
   * performance optimization in summary contexts and aggregated vote
   * displays. This DTO represents individual votes cast on comments within
   * the community platform, tracking user opinions on comment quality and
   * relevance.
   *
   * Includes core vote type and weight information while excluding detailed
   * audit trail data. The summary includes references to the target comment
   * for complete context and maintains foreign key relationships for database
   * integrity. Used in voting analytics, moderation workflows, and user
   * interface displays showing voting activity.
   *
   * The entity supports polymorphic voting with member, moderator, and
   * administrator actor types, each maintaining their own voting records
   * while contributing to overall comment scoring algorithms.
   */
  export type ISummary = {
    /**
     * Primary key identifier for the comment vote record. Automatically
     * generated using UUID v4 format upon creation. Used as the unique
     * identifier for all comment vote operations and references.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of vote cast on the comment. Valid values: 'upvote', 'downvote'.
     * Determines the impact on comment score and user reputation
     * calculations. Upvotes increase visibility and ranking, while
     * downvotes decrease them.
     *
     * Vote types are validated against platform rules and
     * community-specific voting policies. Users cannot change vote types
     * after a certain time period to prevent manipulation.
     */
    vote_type: string;

    /**
     * Weight of this vote based on user reputation or other factors. Higher
     * weights indicate more influential votes from trusted users or
     * moderators.
     *
     * Default weight is 1 for regular members, with increased weights for
     * verified users, moderators, and administrators based on their
     * platform standing and trust level.
     */
    vote_weight: number & tags.Type<"int32">;

    /**
     * Timestamp when the vote was initially cast. Records the exact moment
     * of voting activity for audit trail and chronological sorting.
     *
     * Used for vote aging calculations and determining vote validity
     * periods in time-limited voting scenarios.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the vote was last modified. Tracks changes to vote
     * type or status for audit purposes.
     *
     * Updated whenever vote properties are changed, providing a complete
     * history of vote modifications.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
