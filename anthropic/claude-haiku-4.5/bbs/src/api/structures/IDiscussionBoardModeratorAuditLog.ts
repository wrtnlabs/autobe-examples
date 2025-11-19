import { tags } from "typia";

import { IDiscussionBoardModerator } from "./IDiscussionBoardModerator";
import { IDiscussionBoardContributor } from "./IDiscussionBoardContributor";

export namespace IDiscussionBoardModeratorAuditLog {
  /**
   * Search and filtering parameters for moderation audit log entries.
   *
   * This request DTO enables moderators to query the immutable, append-only
   * audit trail of all moderation actions performed on the platform. Supports
   * advanced multi-dimensional filtering across action type, moderator,
   * affected contributor, related content (articles/comments), date range,
   * and reason text to enable compliance review, dispute investigation,
   * moderation quality analysis, and regulatory audits.
   *
   * The audit log maintains a complete record of every action performed by
   * moderators—article
   * approvals/rejections/edits/deletions/archiving/pinning/locking, comment
   * edits/removals, user
   * warnings/restrictions/suspensions/unsuspensions—ensuring full visibility
   * into moderation decisions, reasoning, and enforcement patterns. All
   * filter fields are optional and combine to narrow results for targeted
   * audit examination.
   *
   * The audit log is read-only from the API perspective (entries created only
   * through moderation actions), ensuring immutability and integrity of the
   * compliance record. Entries are never modified or deleted after creation,
   * preserving authoritative history for appeals, regulatory compliance, and
   * institutional accountability.
   */
  export type IRequest = {
    /**
     * Page number for pagination (1-indexed). Defaults to 1 if not
     * specified. Used with limit to retrieve specific result set windows
     * from potentially thousands of audit log entries.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of audit log entries per page. Defaults to 20 if not
     * specified. Maximum 100 entries per page. Controls result set size for
     * pagination of audit records.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter by specific moderator action type. Optional. When specified,
     * returns only audit log entries recording this action type. Enables
     * review of specific moderation decision categories (e.g., all article
     * approvals, all user suspensions, all comment removals).
     */
    action_type?:
      | "article_approved"
      | "article_rejected"
      | "article_edited"
      | "article_deleted"
      | "article_archived"
      | "article_pinned"
      | "article_unpinned"
      | "article_locked"
      | "article_unlocked"
      | "comment_edited"
      | "comment_removed"
      | "user_warned"
      | "user_restricted"
      | "user_suspended"
      | "user_unsuspended"
      | "violation_recorded"
      | undefined;

    /**
     * Filter by moderator ID to review actions performed by a specific
     * moderator. Optional. When specified, returns all audit entries where
     * this moderator was the actor, enabling performance review,
     * consistency analysis of individual moderator decisions, and quality
     * assessment of moderation patterns.
     */
    moderator_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by affected contributor ID to review all moderation actions
     * taken against a specific user. Optional. When specified, returns all
     * audit entries where this contributor was the subject of the action,
     * showing complete enforcement history for dispute investigation,
     * appeals, or escalation review.
     */
    affected_contributor_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by article ID to review all moderation actions related to a
     * specific article. Optional. When specified, returns audit entries for
     * actions taken on this article (approval, rejection, deletion,
     * archiving, pinning, locking), enabling investigation of specific
     * content moderation decisions and timeline.
     */
    article_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by comment ID to review all moderation actions taken on a
     * specific comment. Optional. When specified, returns audit entries for
     * actions taken on this comment (editing, removal, user warnings
     * related to comment), enabling review of individual comment moderation
     * decisions.
     */
    comment_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter audit log entries created on or after this ISO 8601 datetime.
     * Optional. When combined with date_to, creates date range filter for
     * temporal analysis of moderation activity trends, incident
     * investigation, or compliance period review.
     */
    date_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter audit log entries created on or before this ISO 8601 datetime.
     * Optional. When combined with date_from, creates date range for
     * reviewing recent moderation activity or historical audit trails for
     * specific periods.
     */
    date_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Full-text search across moderator-provided reason/justification text
     * in audit log entries. Optional. When specified, returns entries where
     * the reason field contains this text, enabling text-based search of
     * moderator reasoning, justification, and decision documentation.
     */
    reason_search?:
      | (string & tags.MinLength<1> & tags.MaxLength<500>)
      | undefined;

    /**
     * Field to sort results by. Defaults to 'created_at' (most recent
     * first) if not specified. Enables different analytical perspectives on
     * audit log data.
     */
    order_by?: "created_at" | "action_type" | "moderator_id" | undefined;

    /**
     * Sort direction for the selected order_by field. Defaults to 'desc' if
     * not specified.
     */
    order_direction?: "asc" | "desc" | undefined;
  };

  /**
   * Summary view of a moderator audit log entry optimized for list displays
   * and compliance review.
   *
   * Provides essential information about a moderation action including the
   * action type, the moderator who performed it, the affected contributor (if
   * applicable), and the action timestamp. Includes an optional reason field
   * explaining the moderation decision.
   *
   * Omits detailed state transition information (old_status, new_status) and
   * extensive metadata to optimize list view performance while preserving
   * critical accountability information.
   *
   * Used in moderation audit trails, moderator activity dashboards,
   * compliance reviews, and appeal handling to track all moderation decisions
   * and enforce accountability standards.
   */
  export type ISummary = {
    /**
     * Unique identifier for the audit log entry. Generated automatically as
     * UUID upon action logging.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of moderator action performed. Possible values:
     * 'article_approved' (article approved for publication),
     * 'article_rejected' (article rejected from publication),
     * 'article_edited' (moderator edited article), 'article_deleted'
     * (article removed), 'article_archived' (article archived),
     * 'article_pinned' (article featured at top), 'article_unpinned'
     * (featured status removed), 'article_locked' (comments disabled),
     * 'article_unlocked' (comments enabled), 'comment_edited' (comment
     * edited), 'comment_removed' (comment deleted), 'user_warned' (warning
     * issued), 'user_restricted' (posting restricted), 'user_suspended'
     * (account suspended), 'user_unsuspended' (suspension lifted), or
     * 'violation_recorded' (violation documented). Documents the specific
     * action taken.
     */
    action_type: string;

    /**
     * Optional explanation of why the action was taken. Provides context
     * for moderation decisions enabling audit trail clarity and appeal
     * handling.
     */
    reason?: string | null | undefined;

    /**
     * Summary identification of the moderator who performed the action.
     * Tracks who made moderation decisions for accountability and
     * performance analysis.
     */
    moderator: IDiscussionBoardModerator.ISummary;

    /**
     * Summary identification of the contributor affected by the action.
     * Present when the action directly impacts a user (warnings,
     * restrictions, suspensions). Null for content-only actions like
     * article approval. Tracks which contributors are subject to
     * enforcement actions.
     */
    affected_contributor?:
      | IDiscussionBoardContributor.ISummary
      | null
      | undefined;

    /**
     * Timestamp when the action was performed. This is the authoritative
     * timestamp for when the moderation action occurred in the system.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
