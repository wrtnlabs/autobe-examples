import { tags } from "typia";

export namespace IRedditCloneUserKarma {
  /**
   * Summary of a user's karma score on the platform. Represents the user's reputation calculated from votes received on their posts and comments.
   */
  export type ISummary = {
    /**
     * Computed karma score for the user. Increases by 1 for each upvote received on user's content, decreases by 1 for each downvote. Can be negative.
     *
         * @x-autobe-database-schema-property karma_score
         * @x-autobe-specification Direct mapping from
         *   reddit_clone_user_karmas.karma_score. Integer representing total
         *   votes received on user's content. Increases by 1 per upvote,
         *   decreases by 1 per downvote. Can be negative. Edge case: returns 0
         *   if no karma record exists.
     */
    karmaScore: number & tags.Type<"int32">;
  };
}
