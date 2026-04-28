import { tags } from "typia";

export namespace IRedditLikePopularFeed {
  /**
   * Request parameters for retrieving the popular feed with pagination, sorting, and filtering options.
   *
   * This type defines all query parameters that can be used to customize the popular feed response, including pagination controls, sorting algorithms, time-based filtering, and content search capabilities.
   *
   * **Pagination**
   *
   * Uses cursor-based pagination where cursor is the pagination token from the previous response and limit controls the number of items per page. The page parameter provides an alternative 1-indexed page number approach.
   *
   * **Sorting**
   *
   * Four algorithms available - hot for trending content with recent activity, new for chronological reverse order, top for highest vote scores (requires time_filter), and controversial for divisive content.
   *
   * **Time Filter**
   *
   * Only applies when sort=top, restricts results to posts within the specified time period (today, week, month, year, or all time).
   *
   * **Search**
   *
   * Full-text search on post titles using GIN trigram index for efficient text matching.
   *
   * **Community Filter**
   *
   * Optional filter to show posts only from a specific community by providing the community UUID.
   */
  export type IRequest = {
    /**
     * Pagination cursor token for retrieving subsequent pages.
     *
     * This opaque token encodes the last record's position (created_at timestamp and id) from the previous page. When provided, the server decodes it to fetch records after that position, enabling efficient cursor-based pagination without calculating offsets.
     *
     * Omit this parameter when requesting the first page, or provide the cursor value from the previous response's pagination metadata to retrieve the next page.
     *
         * @x-autobe-specification Cursor token for pagination, decoded to
         *   (created_at, id) composite key for deterministic ordering across
         *   pages
     */
    cursor?: string | undefined;

    /**
     * Maximum number of records to return per page.
     *
     * Controls the page size for pagination. Valid values range from 1 to 100. The actual number of records returned may be less than this value on the final page or when fewer matching records exist.
     *
     * This parameter directly maps to the SQL LIMIT clause and affects query performance. Larger values return more data per request but increase response size.
     *
         * @x-autobe-specification Maximum records per page, validated to range
         *   1-100. Used in SQL LIMIT clause.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Algorithm for sorting posts in the feed.
     *
     * Four sorting options are available:
     *
     * - **hot**: Trending content weighted by vote score and recency. Posts with high recent activity rank higher.
     * - **new**: Chronological reverse order. Newest posts appear first.
     * - **top**: Highest vote scores. Requires the time_filter parameter to define the scoring period.
     * - **controversial**: Highly divisive content with many votes but near-zero net scores. Useful for finding polarizing discussions.
     *
     * Defaults to 'hot' if not specified.
     *
         * @x-autobe-specification Sorting algorithm: hot (vote_score *
         *   recency_factor DESC), new (created_at DESC), top (vote_score DESC
         *   with time_filter), or controversial (ABS(vote_score) / total_votes
         *   DESC)
     */
    sort?: "hot" | "new" | "top" | "controversial" | undefined;

    /**
     * Time period filter for top-sorted posts.
     *
     * Restricts results to posts created within the specified time period. This parameter only applies when sort=top is selected.
     *
     * Available options:
     * - **today**: Posts from the last 24 hours
     * - **week**: Posts from the last 7 days
     * - **month**: Posts from the last 30 days
     * - **year**: Posts from the last 365 days
     * - **all_time**: No time restriction, all posts included
     *
     * If sort=top is used without time_filter, defaults to 'all_time'.
     *
         * @x-autobe-specification Time boundary for top sorting: today, week,
         *   month, year, or all_time. Applied as created_at >= timeBoundary
         *   filter when sort=top.
     */
    time_filter?: "today" | "week" | "month" | "year" | "all_time" | undefined;

    /**
     * Search term for filtering posts by title.
     *
     * Performs full-text search on post titles using PostgreSQL's GIN trigram index for efficient pattern matching. Supports partial matches and is case-insensitive.
     *
     * When provided, only posts whose titles contain the search term (or are similar according to trigram matching) are included in the results. This parameter works in combination with other filters like sort, time_filter, and community_id.
     *
         * @x-autobe-specification Full-text search query on post titles using
         *   GIN trigram index. Implemented as title ILIKE %search% or GIN
         *   trigram similarity match.
     */
    search?: string | undefined;

    /**
     * Optional community identifier to filter posts.
     *
     * When provided, restricts results to posts from the specified community only. The value must be a valid UUID matching a community's id field.
     *
     * If omitted or null, posts from all communities are included in the popular feed. This is useful for viewing a specific community's content through the same endpoint used for the global popular feed.
     *
         * @x-autobe-specification Filter posts by community ID (UUID format).
         *   Applied as WHERE reddit_like_community_id = community_id in SQL
         *   query.
     */
    community_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Target page number for pagination.
     *
     * Specifies which page of results to retrieve using 1-indexed page numbers. Page 1 is the first page, page 2 is the second, and so on.
     *
     * This parameter provides an alternative to cursor-based pagination. If both cursor and page are provided, cursor takes precedence. If omitted, null, or undefined, defaults to page 1.
     *
     * Requesting a page number beyond the available range returns an empty data array with valid pagination metadata reflecting the actual total pages.
     *
         * @x-autobe-specification 1-indexed page number, defaults to 1 if not
         *   provided. Alternative to cursor-based pagination.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
