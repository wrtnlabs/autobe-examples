import { tags } from "typia";

export namespace IRedditLikeCommentRevision {
  /**
   * Summary of a comment revision containing the text content at the time of the revision and metadata.
   */
  export type ISummary = {
    /**
     * Unique identifier for this revision.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_like_comment_revisions.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Comment text content at the time of this revision.
     *
     * @x-autobe-database-schema-property content
     * @x-autobe-specification Direct mapping from reddit_like_comment_revisions.content.
     */
    content: string;

    /**
     * Timestamp when this revision was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_like_comment_revisions.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Parent comment's unique identifier.
     *
     * @x-autobe-database-schema-property comment_id
     * @x-autobe-specification Direct mapping from reddit_like_comment_revisions.comment_id. FK to parent comment.
     */
    comment_id: string & tags.Format<"uuid">;
  };
}
