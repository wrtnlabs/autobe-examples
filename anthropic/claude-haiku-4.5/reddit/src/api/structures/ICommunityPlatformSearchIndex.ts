import { tags } from "typia";

export namespace ICommunityPlatformSearchIndex {
  /**
   * Search query parameters including keywords, filtering options, sorting
   * preferences, and pagination controls for full-text content discovery
   * across posts and comments.
   *
   * This DTO implements the core search mechanism for finding relevant
   * discussions and contributions across the community platform. Supports
   * comprehensive filtering across multiple dimensions: specific communities,
   * content creators, date ranges, post types, quality thresholds, and
   * engagement levels.
   *
   * All filter criteria combine using AND logic (all must match). Results are
   * ranked by relevance using TF-IDF algorithm with keyword highlighting. The
   * search operation executes within 2-second SLA (95th percentile)
   * supporting both offset-based pagination (page/limit) and cursor-based
   * refinement for consistency in real-time environments.
   *
   * Security filtering applied automatically: deleted/removed posts hidden
   * except to authors and moderators; private community content excluded
   * unless user is member; content from suspended users completely excluded.
   */
  export type IRequest = {
    /**
     * Full-text search query containing keywords to find matching posts and
     * comments.
     *
     * Supports multiple keywords with AND logic by default (all keywords
     * must be present). Search is performed against post titles (weighted
     * 1.5x), post body text, link metadata (title and description), and
     * comment content.
     *
     * Keyword highlighting is applied in search results showing matching
     * keywords in context. Minimum 1 character required for search
     * execution.
     */
    q: string;

    /**
     * Page number for offset-based pagination, starting from 1.
     *
     * Determines which batch of results to retrieve. Combined with limit
     * parameter to calculate result offset: offset = (page - 1) * limit.
     * Required for all search requests.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Number of search results to return per page.
     *
     * Maximum 100 items per request to ensure performance (95th percentile
     * execution <2 seconds). Actual result count may be less if fewer
     * results match criteria. Required for all search requests.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /**
     * Filter search results to specific communities by their unique
     * identifiers.
     *
     * Multiple community IDs can be specified for searching across multiple
     * communities simultaneously. If not provided, search includes all
     * communities accessible to the requesting user (respecting private
     * community membership). Filters both post_community_id and comment
     * parent post community.
     */
    community?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Filter search results to content created by a specific member.
     *
     * Accepts member username (3-50 characters). Returns only posts and
     * comments authored by this member. Username must be exact match
     * (case-sensitive). If user is not found, returns empty results.
     */
    creator?: string | undefined;

    /**
     * Filter search results to content created on or after this date.
     *
     * ISO 8601 UTC format required (e.g., 2024-01-15T10:30:00Z). Filters
     * both posts and comments by their created_at timestamp. When combined
     * with dateTo, creates date range filter (inclusive on both ends).
     */
    dateFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter search results to content created on or before this date.
     *
     * ISO 8601 UTC format required (e.g., 2024-12-31T23:59:59Z). Filters
     * both posts and comments by their created_at timestamp. When combined
     * with dateFrom, creates date range filter (inclusive on both ends).
     */
    dateTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter results by post type: 'text' for text-only posts, 'link' for
     * link posts, 'image' for image posts, or 'all' for all post types.
     *
     * Comments are not filtered by post type - all comments are included
     * regardless. Only affects which posts appear in results. Default value
     * (when not specified) is 'all'.
     */
    postType?: "text" | "link" | "image" | "all" | undefined;

    /**
     * Filter search results to content with at least this vote score.
     *
     * Filters both posts and comments by vote_score field (upvotes -
     * downvotes). Useful for finding high-quality or popular content.
     * Minimum value is 0 (no filtering if 0 or omitted).
     */
    minScore?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Filter search results to posts with at least this many comments.
     *
     * Filters posts by comment_count field. Only applies to posts -
     * comments are excluded from this filter even if they have replies.
     * Identifies highly-discussed topics and active threads. Useful when
     * seeking engagement-heavy content.
     *
     * Minimum value is 0 (no filtering if 0 or omitted).
     */
    minComments?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Sort order for results: 'relevance' (TF-IDF ranked, default), 'hot'
     * (trending based on recency and engagement), 'new' (most recent
     * first), or 'top' (highest voted first).
     *
     * Each sort method applies different ranking within the filtered result
     * set. Relevance is default when sortBy not specified. Secondary
     * sorting by vote score applies within equal primary sort values.
     */
    sortBy?: "relevance" | "hot" | "new" | "top" | undefined;

    /**
     * Pagination cursor for cursor-based pagination refinement.
     *
     * Used to retrieve the next set of results when real-time changes
     * (votes, new content) affect ordering consistency. Cursor value is
     * provided in response pagination metadata. Optional - page/limit
     * parameters are primary pagination method.
     */
    cursor?: string | undefined;
  };
}
