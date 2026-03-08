import { tags } from "typia";

export namespace IRedditLikeCommentVote {
  /**
   * Vote value payload for comment voting operations. Specifies the vote direction: +1 for upvote, -1 for downvote, or 0 to remove existing vote.
   */
  export type ICreate = {
    /**
     * Vote value: +1 for upvote, -1 for downvote, 0 to remove vote
     *
     * @x-autobe-database-schema-property value
     * @x-autobe-specification Direct mapping from reddit_like_comment_votes.value. Accepts +1 (upvote), -1 (downvote), or 0 (none/removal).
     */
    value: number & tags.Type<"int32"> & tags.Minimum<-1> & tags.Maximum<1>;
  };
}
