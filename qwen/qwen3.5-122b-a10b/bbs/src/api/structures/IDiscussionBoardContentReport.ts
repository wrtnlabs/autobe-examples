import { tags } from "typia";

export namespace IDiscussionBoardContentReport {
  /**
   * Request parameters for filtering and paginating content analytics reports. This type defines the query criteria for retrieving discussion board content statistics including article creation trends, section popularity, user engagement patterns, and overall platform activity metrics. Supports filtering by date ranges (date_from/date_to on created_at fields), specific section identifiers (section_id), and content types (content_type: 'articles' or 'comments'). Pagination is controlled via page and limit parameters. This operation is restricted to admin actors and is primarily designed for administrative oversight and platform monitoring purposes.
   */
  export type IRequest = {
    /**
     * Page number for pagination, starting from 1.
     *
     * @x-autobe-specification Pagination page number, 1-indexed. Used to calculate OFFSET in SQL query: OFFSET = (page - 1) * limit. Defaults to 1 if not provided. Minimum value is 1.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Number of items per page, maximum 100.
     *
     * @x-autobe-specification Pagination limit per page, maximum 100. Used as LIMIT in SQL query. Defaults to 20 if not provided. Validates range [1, 100].
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /**
     * Filter content by specific section identifier.
     *
     * @x-autobe-specification Optional filter parameter. When provided, filters content to only include articles and comments from the specified section. Maps to discussion_board_articles.discussion_board_section_id foreign key and discussion_board_sections.id primary key for JOIN operations in the query.
     */
    section_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by content type: 'articles' or 'comments'.
     *
     * @x-autobe-specification Filter discriminator for content type. When 'articles', queries discussion_board_articles table. When 'comments', queries discussion_board_comments table. Implements conditional WHERE clauses based on this parameter value.
     */
    content_type?: "articles" | "comments" | undefined;

    /**
     * Start date for filtering content by created_at field (inclusive).
     *
     * @x-autobe-specification Start date filter for created_at fields (inclusive). Applied to discussion_board_articles.created_at and discussion_board_comments.created_at. SQL: WHERE created_at >= date_from. Format: ISO 8601 date-time string.
     */
    date_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for filtering content by created_at field (inclusive).
     *
     * @x-autobe-specification End date filter for created_at fields (inclusive). Applied to discussion_board_articles.created_at and discussion_board_comments.created_at. SQL: WHERE created_at <= date_to. Format: ISO 8601 date-time string.
     */
    date_to?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Summary record for discussion board content analytics report. Provides administrators with aggregated statistics about article creation, comment activity, section popularity, tag usage patterns, and user engagement metrics within a specified time period. Used for monitoring platform activity trends, analyzing content distribution patterns, and making data-driven decisions about community management. The report aggregates data from multiple source tables dynamically at query time rather than storing pre-computed values, ensuring real-time accuracy of all metrics.
   */
  export type ISummary = {
    /**
     * Unique identifier for this report summary record.
     *
     * @x-autobe-specification Generated UUID (v4) for unique report instance identification. Not stored in database, generated at report creation time for tracking and caching purposes.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Start timestamp of the reporting period.
     *
     * @x-autobe-specification Input parameter defining the start of the reporting period (ISO 8601 date-time). Used in WHERE clause: created_at >= period_start. Filter applied to both articles and comments tables.
     */
    period_start: string & tags.Format<"date-time">;

    /**
     * End timestamp of the reporting period.
     *
     * @x-autobe-specification Input parameter defining the end of the reporting period (ISO 8601 date-time). Used in WHERE clause: created_at <= period_end. Filter applied to both articles and comments tables.
     */
    period_end: string & tags.Format<"date-time">;

    /**
     * Total number of articles created during the period.
     *
     * @x-autobe-specification Computed via: SELECT COUNT(*) FROM discussion_board_articles WHERE created_at BETWEEN period_start AND period_end AND deleted_at IS NULL. Counts all articles created within the reporting period.
     */
    total_articles: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of comments posted during the period.
     *
     * @x-autobe-specification Computed via: SELECT COUNT(*) FROM discussion_board_comments WHERE created_at BETWEEN period_start AND period_end. Counts all comments posted within the reporting period.
     */
    total_comments: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of sections with at least one article during the period.
     *
     * @x-autobe-specification Computed via: SELECT COUNT(DISTINCT section_id) FROM discussion_board_articles WHERE created_at BETWEEN period_start AND period_end AND deleted_at IS NULL. Counts unique sections that have at least one article created during the period.
     */
    active_sections_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of active sections in the system.
     *
     * @x-autobe-specification Computed via: SELECT COUNT(*) FROM discussion_board_sections WHERE deleted_at IS NULL. Counts all active sections in the system regardless of article activity during the period.
     */
    total_sections: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of unique members who created content during the period.
     *
     * @x-autobe-specification Computed via: SELECT COUNT(DISTINCT bbs_member_id) FROM discussion_board_articles WHERE created_at BETWEEN period_start AND period_end AND deleted_at IS NULL. Counts unique members who authored articles during the reporting period.
     */
    unique_authors: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Average number of articles per active section.
     *
     * @x-autobe-specification Computed via: total_articles / NULLIF(active_sections_count, 0). Returns average article count per active section. Uses NULLIF to avoid division by zero when no sections have articles.
     */
    average_articles_per_section: number & tags.Minimum<0>;

    /**
     * Article counts broken down by section.
     *
     * @x-autobe-specification Computed via: SELECT section_id, COUNT(*) as article_count FROM discussion_board_articles WHERE created_at BETWEEN period_start AND period_end AND deleted_at IS NULL GROUP BY section_id. Returns array of section breakdown objects with section_id and article_count. JOIN discussion_board_sections for section names. Empty array if no articles in period.
     */
    section_breakdown: IDiscussionBoardContentReport.ISectionBreakdown[];

    /**
     * Tag usage frequency statistics.
     *
     * @x-autobe-specification Computed via: SELECT tag_id, COUNT(*) as usage_count FROM discussion_board_article_tags JOIN discussion_board_articles ON article_tags.article_id = articles.id WHERE articles.created_at BETWEEN period_start AND period_end AND articles.deleted_at IS NULL GROUP BY tag_id. Returns array of tag usage objects with tag_id and usage_count. JOIN discussion_board_tags for tag names. Empty array if no tagged articles in period.
     */
    tag_statistics: IDiscussionBoardContentReport.ITagUsage[];

    /**
     * Overall engagement trend compared to previous period.
     *
     * @x-autobe-specification Computed by comparing total_articles in current period to total_articles in previous period (same duration, immediately before period_start). Trend calculation: if current > previous * 1.1 then 'increasing', if current < previous * 0.9 then 'decreasing', otherwise 'stable'. Requires subquery or CTE to fetch previous period count. Returns 'stable' if no previous period data exists.
     */
    engagement_trend: "increasing" | "stable" | "decreasing";

    /**
     * Date with highest content creation activity during the period. Null if no articles exist in the period.
     *
     * @x-autobe-specification Computed via: SELECT DATE(created_at) as activity_date, COUNT(*) as article_count FROM discussion_board_articles WHERE created_at BETWEEN period_start AND period_end AND deleted_at IS NULL GROUP BY DATE(created_at) ORDER BY article_count DESC LIMIT 1. Returns the date (YYYY-MM-DD format) with highest article creation activity. Null if no articles in period.
     */
    peak_activity_date: (string & tags.Format<"date">) | null;

    /**
     * Timestamp when this report was generated.
     *
     * @x-autobe-specification Set to current timestamp (NOW() or CURRENT_TIMESTAMP) at report generation time. Used for caching and report versioning purposes. Not a database field, computed at query execution time.
     */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Breakdown of article counts grouped by section for content analytics reporting. Each object represents a discussion board section with its corresponding article count during the specified reporting period. Used to analyze content distribution across topic categories, identify popular sections with high activity, and detect inactive sections requiring attention.
   */
  export type ISectionBreakdown = {
    /**
     * Unique identifier of the discussion board section.
     *
     * @x-autobe-specification Extracted from discussion_board_articles.section_id column via GROUP BY clause in aggregation query. Represents the section identifier for each grouped result.
     */
    section_id: string & tags.Format<"uuid">;

    /**
     * Display name of the discussion board section.
     *
     * @x-autobe-specification Retrieved via INNER JOIN from discussion_board_sections.name where discussion_board_articles.section_id matches discussion_board_sections.id. Provides human-readable section name for each grouped result.
     */
    section_name: string;

    /**
     * Number of articles created in this section during the reporting period.
     *
     * @x-autobe-specification COUNT(*) aggregation of discussion_board_articles records grouped by section_id within the reporting period (created_at BETWEEN period_start AND period_end) where deleted_at IS NULL. Returns the total number of articles created in each section during the specified time range.
     */
    article_count: number & tags.Type<"int32"> & tags.Minimum<0>;
  };

  /**
   * Tag usage frequency statistics for discussion board content analytics reports. Represents how many times each tag was assigned to articles during a specified reporting period. Used by administrators to identify popular tags, analyze content categorization trends, and understand topic distribution across the platform.
   */
  export type ITagUsage = {
    /**
     * Unique identifier of the tag. UUID format matching the discussion_board_tags table primary key.
     *
     * @x-autobe-specification Extracted from discussion_board_article_tags.discussion_board_tag_id (UUID). This is a foreign key reference to discussion_board_tags.id, used in the aggregation query to group tag usage counts.
     */
    tag_id: string & tags.Format<"uuid">;

    /**
     * Human-readable name of the tag as defined in the discussion_board_tags table.
     *
     * @x-autobe-specification Retrieved from discussion_board_tags.name via JOIN operation. The JOIN connects discussion_board_article_tags.discussion_board_tag_id to discussion_board_tags.id to fetch the human-readable tag name.
     */
    tag_name: string;

    /**
     * Number of articles tagged with this tag during the reporting period. Computed count excludes soft-deleted articles.
     *
     * @x-autobe-specification Computed aggregation via COUNT(*) GROUP BY discussion_board_article_tags.discussion_board_tag_id. Counts articles tagged with this tag where articles.created_at is within the reporting period AND articles.deleted_at IS NULL. Only non-deleted articles are included in the count.
     */
    usage_count: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
