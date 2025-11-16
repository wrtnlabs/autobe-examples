import { tags } from "typia";

export namespace IRedditCommunityModerator {
  /**
   * Summary view of community and platform moderators with moderation
   * authority.
   *
   * Moderators enforce community standards, review reported content, and
   * maintain platform quality through graduated enforcement measures. This
   * summary provides essential moderator information suitable for assignment
   * displays and coordination interfaces while excluding sensitive
   * authentication details.
   *
   * Includes creation and update timestamps for audit tracking, deletion
   * timestamp for account management, and essential identification fields.
   * Provides comprehensive snapshot of moderator account status and authority
   * level for administrative and coordination contexts.
   */
  export type ISummary = {
    /**
     * Unique identifier for the moderator account. Primary key for
     * reference in community operations and audit trails.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Verified email address for moderator communications and secure
     * authentication. Essential for coordination with other moderators and
     * platform administrators.
     */
    email: string & tags.Format<"email">;

    /**
     * Unique display name for the moderator across the entire platform.
     * Used for identification and public acknowledgment of moderator
     * authority.
     */
    nickname: string;

    /**
     * Whether the moderator account is currently active and can perform
     * moderation duties. Used for workload management and authorization
     * control.
     */
    is_active: boolean;

    /**
     * Moderator authority level indicating permissions scope. Distinguishes
     * between community moderators and platform administrators.
     */
    role_level: string;

    /** Timestamp when the community moderator account was created. */
    created_at: string & tags.Format<"date-time">;

    /** Timestamp when the community moderator account was last updated. */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft deletion timestamp for account recovery and audit tracking. Null
     * indicates active account.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
