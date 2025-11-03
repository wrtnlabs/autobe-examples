import { tags } from "typia";

export namespace IDiscussionBoardCommentModeration {
  /**
   * Request body for moderator review and moderation action on comments.
   * Moderators use this DTO to approve, remove, or restore comments. The
   * operation updates comment status (published/moderated/deleted) and
   * creates corresponding moderation log entries for audit trails. When
   * removing comments, the status changes to 'moderated' making the content
   * hidden while preserving the comment record for thread integrity and audit
   * purposes. When approving comments, the status is set to 'published' and
   * any flags are cleared.
   *
   * The action_type field is required and determines the moderation outcome:
   * 'approve' clears flags and restores visibility, 'remove' hides content
   * from regular users while preserving the record, 'restore' reverses
   * previous moderation. The reason field is optional but recommended for
   * transparency, documenting why the moderator took this action for the
   * comment author and audit trail purposes. All moderation actions are
   * logged immutably in discussion_board_moderation_logs for compliance
   * tracking.
   */
  export type IUpdate = {
    /**
     * Type of moderation action to take on the comment. Valid values are:
     * 'approve' (clear flags and set status to published), 'remove' (mark
     * as moderated and hide content from regular users), or 'restore'
     * (restore previously moderated comment). This field determines how the
     * comment status will be updated and what moderation log entry is
     * created. Required to specify the intended moderation outcome.
     */
    action_type: string;

    /**
     * Moderator-provided explanation for the moderation action taken.
     * Optional detailed reason explaining why the comment was approved,
     * removed, or restored. Should reference specific community guideline
     * violations when applicable. Supports transparency by documenting the
     * basis for moderation decisions. Maximum 500 characters. Displayed to
     * comment author and recorded in moderation audit log.
     */
    reason?: (string & tags.MaxLength<500>) | undefined;
  };
}
