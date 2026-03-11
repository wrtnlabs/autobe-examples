import { tags } from "typia";

import { IDiscussionBoardArticle } from "./IDiscussionBoardArticle";

export namespace IDiscussionBoardArticleViewStat {
  /**
   * Request parameters for querying article view statistics and analytics data. Supports filtering by date ranges, specific articles, and viewer types with pagination controls for large result sets. Used by administrators and super administrators for platform analytics and monitoring.
   */
  export type IRequest = {
    /**
     * Start datetime for filtering article views (inclusive). Use ISO 8601 format for precise date-time filtering.
     *
     * @x-autobe-specification Filters view statistics where viewed_at >= this datetime value. Inclusive range filtering for analytics queries. Maps conceptually to discussion_board_article_view_stats.viewed_at field but implemented as application-level filtering.
     */
    viewed_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End datetime for filtering article views (inclusive). Use ISO 8601 format for precise date-time filtering.
     *
     * @x-autobe-specification Filters view statistics where viewed_at <= this datetime value. Inclusive range filtering for analytics queries. Maps conceptually to discussion_board_article_view_stats.viewed_at field but implemented as application-level filtering.
     */
    viewed_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Specific article identifier to filter view statistics. Leave empty to include views from all articles.
     *
     * @x-autobe-specification Filters view statistics for a specific article. Maps conceptually to discussion_board_article_view_stats.discussion_board_article_id foreign key but implemented as application-level filtering. When provided, returns only views for the specified article.
     */
    discussion_board_article_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Viewer type filter: 'member' for authenticated members, 'admin' for administrators, 'super_admin' for super administrators, 'guest' for anonymous guests.
     *
     * @x-autobe-specification Filters by viewer actor type based on presence in corresponding ID fields: 'member' (discussion_board_member_id IS NOT NULL), 'admin' (discussion_board_admin_id IS NOT NULL), 'super_admin' (discussion_board_super_admin_id IS NOT NULL), 'guest' (discussion_board_guest_id IS NOT NULL). Computed logic rather than direct database field mapping.
     */
    viewer_type?: "member" | "admin" | "super_admin" | "guest" | undefined;

    /**
     * Page number for paginated results (1-indexed). Use with limit parameter to navigate through large datasets.
     *
     * @x-autobe-specification Pagination parameter for large result sets. Computed offset calculation: (page - 1) * limit. Not directly mapped to database schema - used for application-level result partitioning.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records to return per page (1-100). Controls the size of paginated result sets.
     *
     * @x-autobe-specification Maximum number of records to return per page. Used with page parameter for pagination. Not directly mapped to database schema - applied after database query results are retrieved.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Lightweight article view statistics summary showing view events with article context and viewer type indicators. Suitable for analytics dashboards and reporting without exposing sensitive session details.
   */
  export type ISummary = {
    /**
     * Unique identifier for the article view event record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_article_view_stats.id. UUID primary key for unique view event identification.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The article that was viewed, showing title, author, section, and basic metadata.
     *
     * @x-autobe-database-schema-property article
     * @x-autobe-specification JOIN from discussion_board_article_view_stats.discussion_board_article_id to discussion_board_articles.id. Returns IDiscussionBoardArticle.ISummary with essential article information.
     */
    article: IDiscussionBoardArticle.ISummary;

    /**
     * ID of the member who viewed the article, null if viewer was not an authenticated member.
     *
     * @x-autobe-database-schema-property discussion_board_member_id
     * @x-autobe-specification Direct mapping from discussion_board_article_view_stats.discussion_board_member_id. Nullable field indicating authenticated member viewer presence.
     */
    member_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * ID of the administrator who viewed the article, null if viewer was not an authenticated administrator.
     *
     * @x-autobe-database-schema-property discussion_board_admin_id
     * @x-autobe-specification Direct mapping from discussion_board_article_view_stats.discussion_board_admin_id. Nullable field indicating authenticated administrator viewer presence.
     */
    admin_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * ID of the super administrator who viewed the article, null if viewer was not an authenticated super administrator.
     *
     * @x-autobe-database-schema-property discussion_board_super_admin_id
     * @x-autobe-specification Direct mapping from discussion_board_article_view_stats.discussion_board_super_admin_id. Nullable field indicating authenticated super administrator viewer presence.
     */
    super_admin_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * ID of the guest who viewed the article, null if viewer was not an anonymous guest.
     *
     * @x-autobe-database-schema-property discussion_board_guest_id
     * @x-autobe-specification Direct mapping from discussion_board_article_view_stats.discussion_board_guest_id. Nullable field indicating anonymous guest viewer presence.
     */
    guest_id?: (string & tags.Format<"uuid">) | null | undefined;

    /**
     * Date and time when the article was viewed.
     *
     * @x-autobe-database-schema-property viewed_at
     * @x-autobe-specification Direct mapping from discussion_board_article_view_stats.viewed_at. Timestamp when the article view event occurred.
     */
    viewed_at: string & tags.Format<"date-time">;
  };
}
