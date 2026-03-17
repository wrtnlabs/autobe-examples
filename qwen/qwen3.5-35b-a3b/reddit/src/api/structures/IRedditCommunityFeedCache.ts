import { tags } from "typia";

export namespace IRedditCommunityFeedCache {
  /**
   * Search criteria and pagination parameters for listing posts in a community feed. Controls which posts appear in the feed, their sort order, and how they are paginated. Sorting options: hot (recent activity and engagement), new (most recent first), top (highest vote score with optional time filter), or controversial (many votes but neutral score). The search parameter allows filtering posts by text content in the title or body.
   */
  export type IRequest = {
    /**
     * Page number for pagination (1-indexed).
     *
     * @x-autobe-specification Page number for offset-based pagination. 1-indexed. Used to calculate OFFSET = (page - 1) * limit. Default value is 1. Combined with limit parameter, controls which subset of posts is returned in each page.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Number of items per page.
     *
     * @x-autobe-specification Maximum number of posts to return per page (items per page). Range: 1-100. Default value is 20. Combined with page parameter for offset-based pagination. Larger limit values return more posts per page but increase response size.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;

    /**
     * Sorting algorithm for the feed.
     *
     * @x-autobe-specification Sorting algorithm for the feed. Enum values: hot: Ranks posts by recent activity and vote score using formula (upvotes-downvotes)*log10(total_votes+2)/time_decay; new: Orders by created_at descending (most recent first); top: Orders by vote_score descending (highest first); controversial: Orders by ABS(vote_score) descending (many votes but neutral score). Default value is hot.
     */
    sortType?: "hot" | "new" | "top" | "controversial" | undefined;

    /**
     * Time range filter for 'top' sorting. Only applicable when sortType is 'top'.
     *
     * @x-autobe-specification Time range filter for 'top' sorting. Only applicable when sortType is 'top'. Enum values: today (last 24h), week (last 7 days), month (last 30 days), year (last 365 days), all (no time restriction). Filters posts before applying vote_score sort order. Ignored when sortType is not 'top'.
     */
    timeFilter?: "today" | "week" | "month" | "year" | "all" | undefined;
  };
}
