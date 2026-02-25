import { tags } from "typia";

export namespace IRedditCloneCommentVote {
  /**
   * Request body for voting on a comment. Specifies the vote action to apply to the comment identified by the path parameter commentId.
   */
  export type ICreate = {
    /**
     * The type of vote to cast on the comment: 'upvote', 'downvote', or 'neutral' (remove vote).
     *
     * @x-autobe-database-schema-property vote
     * @x-autobe-specification Direct mapping from reddit_clone_comment_votes.vote. Maps upvote→1, downvote→-1, neutral→0.
     */
    voteType: "upvote" | "downvote" | "neutral";
  };

  /**
   * Comment vote response containing the current vote score and the authenticated user's vote status.
   */
  export type IResponse = {
    /**
     * Current vote score of the comment (upvotes minus downvotes).
     *
     * @x-autobe-specification Computed from comment.vote_score field. Represents net votes (upvotes - downvotes) for the comment.
     */
    voteScore: number & tags.Type<"int32">;

    /**
     * Current user's vote status: 'upvote', 'downvote', or 'none' if not voted.
     *
     * @x-autobe-specification Derived from existing vote record: 1=upvote, -1=downvote, 0=none. When user has not voted on this comment, value is 'none'.
     */
    userVote: "upvote" | "downvote" | "none";
  };
}
