import { tags } from "typia";

export namespace IRedditLikeContentSearch {
  /**
   * Search criteria and pagination parameters for comprehensive content search across posts and comments.
   */
  export type IRequest = {
    /**
     * Search query text to match against post titles, content, and comment content.
     *
     * @x-autobe-specification Search text query matched against post titles, content, and comment content using PostgreSQL full-text search.
     */
    query: string;

    /**
     * Filter results to specific community by ID. Optional - if omitted, search across all accessible communities.
     *
     * @x-autobe-specification Optional UUID to filter results to a specific community. When omitted, search across all accessible communities based on user subscription status.
     */
    community_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter results by post content type. Optional - if omitted, search all types.
     *
     * @x-autobe-specification Optional content type filter (text|link|image) to restrict search results to specific post types. When omitted, search all content types.
     */
    type?: "text" | "link" | "image" | undefined;

    /**
     * Start date for filtering content by creation time. Optional - if omitted, no lower bound on date range.
     *
     * @x-autobe-specification Optional ISO 8601 datetime to filter content created after this timestamp. Applied to post.created_at field. When omitted, no lower date bound is applied.
     */
    start_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for filtering content by creation time. Optional - if omitted, no upper bound on date range.
     *
     * @x-autobe-specification Optional ISO 8601 datetime to filter content created before this timestamp. Applied to post.created_at field. When omitted, no upper date bound is applied.
     */
    end_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Sort order for search results. Defaults to 'relevance'.
     *
     * @x-autobe-specification Sort order for search results (relevance|new|hot|controversial). Defaults to 'relevance' when omitted. Controls PostgreSQL ranking function and ordering clause.
     */
    sort?: "relevance" | "new" | "hot" | "controversial" | undefined;

    /**
     * Page number for pagination. Defaults to 1.
     *
     * @x-autobe-specification Page number for pagination (1-indexed). Defaults to 1 when omitted or invalid. Controls OFFSET calculation for pagination.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of results per page. Defaults to 20, maximum 100.
     *
     * @x-autobe-specification Number of results per page (1-100). Defaults to 20 when omitted or invalid. Controls LIMIT clause and maximum page size.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
