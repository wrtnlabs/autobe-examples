import { tags } from "typia";

export namespace IRedditCommunityPostVote {
  /**
   * The updated total vote score of the post after the vote change. This is an integer representing the difference between upvotes and downvotes. A positive value indicates net upvotes; a negative value indicates net downvotes. This value is used for post ranking and sorting in the feed.
   */
  export type ISummary = {
    /**
     * The updated total vote score of the post after the vote change. This is an integer representing the difference between upvotes and downvotes. A positive value indicates net upvotes; a negative value indicates net downvotes. This value is used for post ranking and sorting in the feed.
     *
     * @x-autobe-database-schema-property vote_score
     * @x-autobe-specification Directly maps to the vote_score field in the reddit_community_posts table. After any vote change (upvote/downvote/remove), the updated vote_score value is returned. No computation needed; simply retrieve the single integer field.
     */
    voteScore: number & tags.Type<"int32">;
  };

  /**
   * Request payload for casting, changing, or removing a vote on a post. Specifies the target vote state: 'upvote', 'downvote', or 'none'. User identity and post identity are implicitly provided via authenticated JWT token and URL path parameter respectively, and are not included in the request body.
   */
  export type IRequest = {
    /**
     * The desired vote state to apply: 'upvote', 'downvote', or 'none' to remove previous vote.
     *
     * @x-autobe-database-schema-property vote_type
     * @x-autobe-specification Direct mapping from reddit_community_post_votes.vote_type. Must be 'upvote', 'downvote', or 'none'.
     */
    voteType: "upvote" | "downvote" | "none";

    /**
     * Target page number to retrieve (1-indexed).
     *
     * Specifies which page of results to return. Page numbering starts from 1.
     * If omitted, null, or undefined, defaults to page 1 (first page).
     * Requesting a page beyond the available range returns an empty data array
     * with valid pagination metadata reflecting the actual totals.
     *
     * @x-autobe-specification 1-indexed page number. Defaults to 1 if not provided.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page.
     *
     * Controls how many records are included in each page response. If omitted,
     * null, or undefined, defaults to 100 records per page. The server may
     * enforce upper bounds to prevent excessive resource consumption on large
     * requests.
     *
     * @x-autobe-specification Maximum records per page. Defaults to 100 if not provided.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
