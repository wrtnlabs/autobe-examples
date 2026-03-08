import { tags } from "typia";

export namespace IRedditPlatformPostFeed {
  /**
   * Request parameters for filtering and sorting post feed results. Used to customize which posts appear in a feed and how they are ranked.
   *
   * The `feedType` specifies which content source to query: `POPULAR` retrieves posts from all communities across the platform, `HOME` retrieves posts only from communities the user is subscribed to, and `COMMUNITY` retrieves posts from a specific community.
   *
   * The `sortType` determines the ranking algorithm:
   * - **HOT**: Combines vote score with recency decay to surface trending content
   * - **NEW**: Orders by creation time (most recent first)
   * - **TOP**: Orders by vote score (highest first)
   * - **CONTROVERSIAL**: Orders by absolute score near zero (content with many upvotes and downvotes)
   *
   * The `timeRange` filter applies only when `sortType` is `TOP`, limiting results to a specific time period. The `commentsSortType` controls how nested replies within each post are ordered.
   */
  export type IRequest = {
    /**
     * Type of feed to retrieve. Determines the scope of posts to include in the results.
     *
     * @x-autobe-specification REQUIRED enum parameter. POPULAR=platform-wide feed, HOME=subscribed-only feed (requires auth), COMMUNITY=specific community feed. Used to filter which reddit_platform_posts table scope to query.
     */
    feedType: "POPULAR" | "HOME" | "COMMUNITY";

    /**
     * How to rank and sort posts in the feed results.
     *
     * @x-autobe-specification REQUIRED enum parameter. Determines the sorting algorithm for feed ranking:
     * - HOT: vote_score weighted by recency decay function
     * - NEW: created_at descending (most recent first)
     * - TOP: vote_score descending (highest scores first)
     * - CONTROVERSIAL: ABS(vote_score) ascending (scores near zero indicate divisive content)
     */
    sortType: "HOT" | "NEW" | "TOP" | "CONTROVERSIAL";

    /**
     * Time period filter for TOP-ranked posts. Only applies when sortType is TOP.
     *
     * @x-autobe-specification OPTIONAL enum parameter, only applies when sortType=TOP. Limits results to a specific time window:
     * - TODAY: created_at >= NOW() - INTERVAL '1 day'
     * - WEEK: created_at >= NOW() - INTERVAL '7 days'
     * - MONTH: created_at >= NOW() - INTERVAL '30 days'
     * - YEAR: created_at >= NOW() - INTERVAL '365 days'
     * - ALL: no time filter (default if not specified)
     */
    timeRange?: "TODAY" | "WEEK" | "MONTH" | "YEAR" | "ALL" | undefined;

    /**
     * Current page number in the paginated results. Starts from 1.
     *
     * @x-autobe-specification OPTIONAL integer parameter, 1-indexed page number. Default: 1. Used for pagination to navigate through large result sets. Must be >= 1. Page number is used with limit to calculate OFFSET for SQL queries.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Maximum number of posts to return per page. Controls the size of each page of results.
     *
     * @x-autobe-specification OPTIONAL integer parameter, items per page. Default: 20. Maximum: 100. Used for pagination to control response size. The actual number of records returned may be less on the final page or if total records are fewer than the limit.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;

    /**
     * How to sort nested comments within each post. Controls the display order of replies.
     *
     * @x-autobe-specification OPTIONAL enum parameter for sorting comments within each post:
     * - BEST: top comments by score with nested replies (default)
     * - NEW: comments ordered by created_at DESC (newest first)
     * - CONTROVERSIAL: comments with |score| near zero (high engagement with split opinions)
     *
     * Used when fetching detailed post content to determine how nested replies are displayed.
     */
    commentsSortType?: "BEST" | "NEW" | "CONTROVERSIAL" | undefined;
  };
}
