import { tags } from "typia";

export namespace IRedditLikeDashboardEngagement {
  /**
   * Aggregated engagement statistics including vote counts and net score for a post or comment.
   */
  export type ISummary = {
    /**
     * Total number of upvotes (+1 votes).
     *
     * @x-autobe-specification COUNT of +1 votes from reddit_like_post_votes and reddit_like_comment_votes tables.
     */
    upvote_count: number & tags.Type<"int32">;

    /**
     * Total number of downvotes (-1 votes).
     *
     * @x-autobe-specification COUNT of -1 votes from reddit_like_post_votes and reddit_like_comment_votes tables.
     */
    downvote_count: number & tags.Type<"int32">;
  };
}
