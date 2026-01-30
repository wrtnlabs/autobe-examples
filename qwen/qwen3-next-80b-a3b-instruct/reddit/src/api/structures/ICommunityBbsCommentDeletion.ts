import { tags } from "typia";

export namespace ICommunityBbsCommentDeletion {
  /**
   * Request DTO for creating a comment deletion request. Used to submit a
   * formal request for moderator review of a comment that may violate
   * community guidelines. Only includes fields that the user can provide: the
   * target comment ID and a reason for deletion. System-managed fields like
   * requester ID, timestamp, and status are automatically populated by the
   * backend from authentication context and default values.
   */
  export type ICreate = {
    /**
     * Unique identifier of the comment being requested for deletion. Must
     * reference an existing comment in the community_bbs_comments table.
     *
     * @x-autobe-specification Direct mapping from community_bbs_comment_deletions.comment_id column.
     */
    commentId: string & tags.Format<"uuid">;

    /**
     * Brief explanation of why the comment should be deleted, based on
     * community guidelines. Must be 10 to 500 characters in length.
     *
     * @x-autobe-specification Direct mapping from community_bbs_comment_deletions.reason column.
     */
    reason: string & tags.MinLength<10> & tags.MaxLength<500>;
  };
}
