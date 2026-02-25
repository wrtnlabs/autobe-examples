import { tags } from "typia";

export namespace IRedditCommunityPostAnalytic {
  /**
   * Filters and pagination parameters for retrieving aggregated post analytics across the platform or within a community. Use to narrow results by time period, community, minimum vote score, and page size.
   */
  export type IRequest = {
    /**
     * Time range for filtering posts by creation date. Must include both start and end timestamps in ISO 8601 UTC format.
     *
     * @x-autobe-specification User-specified time window for filtering posts. Must provide both start and end timestamps. System converts this into a WHERE clause on created_at >= start AND created_at <= end. Groups results by day (truncating to date). Used only for aggregation filter, not returned in response.
     */
    dateRange?:
      | {
          start: string & tags.Format<"date-time">;
          end: string & tags.Format<"date-time">;
        }
      | undefined;

    /**
     * The unique identifier of a community to filter analytics for. When provided, results are limited to posts within this community.
     *
     * @x-autobe-specification Filters analytics to a single community. Matches against reddit_community_posts.community_id. Required only when querying analytics for a specific community. For platform-wide analytics, omit this field.
     */
    communityId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Minimum average vote score threshold for communities to be included in results. Only communities with an average post score at or above this value will be returned.
     *
     * @x-autobe-specification Filters communities based on average vote score threshold. Applied after aggregation. Value must be between -1000 and 1000. Only communities with average vote score >= minVoteScore are included in results. For platform-wide analytics, acts as a filter on community-level performance.
     */
    minVoteScore?:
      | (number & tags.Minimum<-1000> & tags.Maximum<1000>)
      | undefined;

    /**
     * The page number of results to return (1-indexed). Defaults to 1. Each page contains up to 'limit' records.
     *
     * @x-autobe-specification Pagination control retrieving the nth page of results. Must be an integer >= 1. Default is 1. Used with limit to compute OFFSET in SQL query. Each page contains up to 'limit' records. Results are ordered by date descending, so page 1 contains the most recent day.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Maximum number of daily analytics records per page. Must be between 1 and 100. Defaults to 20.
     *
     * @x-autobe-specification Maximum number of daily analytics records to return per page. Must be between 1 and 100. Defaults to 20. Defines chunk size for pagination when retrieving multiple days of analytics data. Applied as LIMIT clause in database query.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;
  };

  /**
   * A daily summary of aggregated post analytics. Represents one day of post activity with counts of total posts, average vote score, total upvotes, total downvotes, and accumulated comment count. Used for trend analysis and engagement reporting across a platform or specific community.
   */
  export type ISummary = {
    /**
     * The date (YYYY-MM-DD) of the aggregated analytics period.
     *
     * @x-autobe-specification Computed by grouping reddit_community_posts.created_at at day level (DATE_TRUNC('day', created_at)). Ordered descending.
     */
    date: string & tags.Format<"date-time">;

    /**
     * Total number of posts created on this date across the target scope (platform or community).
     *
     * @x-autobe-specification COUNT of reddit_community_posts records where is_deleted = false, grouped by day.
     */
    total_posts: number & tags.Type<"int32">;

    /**
     * The average vote score of all posts on this date, representing net positive engagement (upvotes minus downvotes).
     *
     * @x-autobe-specification AVG of reddit_community_posts.vote_score, calculated by summing all vote values (upvote = +1, downvote = -1, none = 0) and dividing by count of votes. Excludes deleted posts.
     */
    avg_vote_score: number;

    /**
     * Total number of upvotes cast on all posts on this date.
     *
     * @x-autobe-specification SUM of reddit_community_post_votes.vote_type where vote_type = 'upvote' joined with reddit_community_posts, grouped by day. Excludes deleted posts.
     */
    total_upvotes: number & tags.Type<"int32">;

    /**
     * Total number of downvotes cast on all posts on this date.
     *
     * @x-autobe-specification SUM of reddit_community_post_votes.vote_type where vote_type = 'downvote' joined with reddit_community_posts, grouped by day. Excludes deleted posts.
     */
    total_downvotes: number & tags.Type<"int32">;

    /**
     * Total number of comments posted on all posts from this date.
     *
     * @x-autobe-specification COUNT of reddit_community_comments records linked to posts via post.id, grouped by the post's created_at day. Excludes deleted posts.
     */
    total_comments: number & tags.Type<"int32">;
  };
}
