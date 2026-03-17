import { tags } from "typia";

import { ICommunityPlatformMember } from "./ICommunityPlatformMember";
import { ICommunityPlatformUserReport } from "./ICommunityPlatformUserReport";

export namespace ICommunityPlatformUserReportHistory {
  /**
   * Summary representation of an audit history entry for user reports, showing key information about report lifecycle events including action type, actor information, timestamp, and state changes. Used in paginated audit trail lists.
   */
  export type ISummary = {
    /**
     * Unique identifier for the audit history entry.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_user_report_histories.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of audit action performed on the report.
     *
     * @x-autobe-database-schema-property action_type
     * @x-autobe-specification Direct mapping from community_platform_user_report_histories.action_type. Valid values: 'created' (report created), 'status_changed' (status updated), 'approved' (moderator approved), 'dismissed' (moderator dismissed), 'assigned' (assigned to moderator), 'note_added' (administrative note).
     */
    action_type: string;

    /**
     * Type of actor who performed the action.
     *
     * @x-autobe-database-schema-property actor_type
     * @x-autobe-specification Direct mapping from community_platform_user_report_histories.actor_type. Valid values: 'moderator' (community moderator), 'user' (reporting user), 'system' (automated system action).
     */
    actor_type: string;

    /**
     * Actor who performed the audit action. May be a member (if moderator or user) or system identifier string.
     *
     * @x-autobe-database-schema-property actor_id
     * @x-autobe-specification Dynamic resolution based on actor_type. If actor_type is 'moderator' or 'user', fetch ICommunityPlatformMember.ISummary via actor_id foreign key to community_platform_members table. If actor_type is 'system', use string identifier from actor_id column.
     */
    actor: ICommunityPlatformMember.ISummary | string;

    /**
     * Previous value before the action, if applicable. Null if no previous value existed.
     *
     * @x-autobe-database-schema-property old_value
     * @x-autobe-specification Direct mapping from community_platform_user_report_histories.old_value. Previous value before the action (optional). For status changes, contains previous status. For other changes, contains relevant previous attribute value.
     */
    old_value?: string | null | undefined;

    /**
     * New value after the action, if applicable. Null if no new value set.
     *
     * @x-autobe-database-schema-property new_value
     * @x-autobe-specification Direct mapping from community_platform_user_report_histories.new_value. New value after the action (optional). For status changes, contains new status. For other changes, contains relevant new attribute value.
     */
    new_value?: string | null | undefined;

    /**
     * When the audit event was recorded.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from community_platform_user_report_histories.created_at. Timestamp reflects when the action actually occurred, not when it was logged.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * The user report that this audit entry belongs to.
     *
     * @x-autobe-database-schema-property userReport
     * @x-autobe-specification Relation to community_platform_user_reports via user_report_id foreign key. Returns ICommunityPlatformUserReport.ISummary via JOIN.
     */
    user_report: ICommunityPlatformUserReport.ISummary;
  };
}
