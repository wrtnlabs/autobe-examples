import { tags } from "typia";

import { IDiscussionBoardAdmin } from "./IDiscussionBoardAdmin";

export namespace IDiscussionBoardAdminPasswordReset {
  /**
   * Request body for filtering and searching password reset records across member and administrator accounts. Enables administrators to audit password reset activities by applying filters for user type, token status, creation date ranges, and expiration date ranges. All filter parameters are optional to allow flexible query combinations. Supports pagination for efficient browsing of large result sets.
   */
  export type IRequest = {
    /**
     * Type of password reset record to filter: member or administrator account.
     *
     * @x-autobe-specification Enum filter for password reset record type: 'member' for discussion_board_member_password_resets, 'admin' for discussion_board_admin_password_resets. Used to determine which table(s) to query.
     */
    type?: "member" | "admin" | undefined;

    /**
     * Token status filter: active (unused and not expired), used (already consumed), or expired (past expiration time).
     *
     * @x-autobe-specification Computed status enum: 'active' (expires_at > now AND used_at is null), 'used' (used_at is not null), 'expired' (expires_at <= now). Client-side computation based on expires_at and used_at timestamps from database.
     */
    status?: "active" | "used" | "expired" | undefined;

    /**
     * Search text to match against user email addresses or display names in password reset records.
     *
     * @x-autobe-specification Text search filter applied to email (for admin) or member email/display_name (for member). Uses LIKE or full-text search depending on database configuration.
     */
    search?: string | undefined;

    /**
     * Start date-time for filtering password reset records by creation date (inclusive).
     *
     * @x-autobe-specification Filter password reset records where created_at >= this timestamp. ISO 8601 date-time format. Used for querying records created after a specific date.
     */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date-time for filtering password reset records by creation date (inclusive).
     *
     * @x-autobe-specification Filter password reset records where created_at <= this timestamp. ISO 8601 date-time format. Used for querying records created before a specific date.
     */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Start date-time for filtering password reset records by expiration date (inclusive).
     *
     * @x-autobe-specification Filter password reset records where expires_at >= this timestamp. ISO 8601 date-time format. Used for querying records expiring after a specific date.
     */
    expires_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date-time for filtering password reset records by expiration date (inclusive).
     *
     * @x-autobe-specification Filter password reset records where expires_at <= this timestamp. ISO 8601 date-time format. Used for querying records expiring before a specific date.
     */
    expires_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for pagination (1-indexed). Defaults to 1 if not specified.
     *
     * @x-autobe-specification 1-indexed page number for pagination. Minimum value is 1. Used to retrieve specific page of results. Combined with limit parameter for cursor-based pagination.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of password reset records to return per page. Range: 1-100.
     *
     * @x-autobe-specification Maximum number of records per page. Minimum value is 1, maximum is 100. Controls the size of result set returned. Used with page parameter for pagination.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Summary representation of an administrator password reset record for audit and administrative listing purposes. This type excludes sensitive token values for security while providing essential metadata about the password reset request including timestamps and associated administrator information. Used in administrative password reset audit logs to track password reset activities across the platform.
   */
  export type ISummary = {
    /**
     * Unique identifier for the password reset record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_admin_password_resets.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Administrator account associated with this password reset request.
     *
     * @x-autobe-database-schema-property admin
     * @x-autobe-specification Join from discussion_board_admin_password_resets.discussion_board_admin_id to discussion_board_admins.id. Returns IDiscussionBoardAdmin.ISummary.
     */
    admin: IDiscussionBoardAdmin.ISummary;

    /**
     * Timestamp when the password reset token expires and becomes invalid.
     *
     * @x-autobe-database-schema-property expires_at
     * @x-autobe-specification Direct mapping from discussion_board_admin_password_resets.expires_at. Token becomes invalid after this time.
     */
    expires_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the password reset record was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_admin_password_resets.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the password reset record was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from discussion_board_admin_password_resets.updated_at.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft-deletion timestamp; null if the password reset record is active.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from discussion_board_admin_password_resets.deleted_at. Nullable; null if record is active.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };
}
