import { tags } from "typia";

import { IDiscussionBoardAdmin } from "./IDiscussionBoardAdmin";

export namespace IDiscussionBoardAdminPasswordReset {
  /**
   * Query parameters for filtering and paginating password reset records across both member and administrator accounts.
   *
   * Enables comprehensive password reset audit queries with support for filtering by actor type, token expiration status, creation date range, specific user identification, and text search on email or display name. Used by administrators to monitor account recovery activities and audit password reset workflows.
   */
  export type IRequest = {
    /**
     * Filter by actor type to limit results to member or administrator password resets. Omit to search across both actor types.
     *
     * @x-autobe-specification Determines which password reset table(s) to query: 'member' queries discussion_board_member_password_resets only, 'admin' queries discussion_board_admin_password_resets only. When absent or null, both tables are queried and results merged.
     */
    actorType?: "member" | "admin" | undefined;

    /**
     * Filter by token expiration status. Use 'expired' to find expired reset tokens, 'active' to find currently valid tokens.
     *
     * @x-autobe-specification Computed from expired_at column: 'expired' matches records where expired_at < NOW(), 'active' matches records where expired_at >= NOW(). Filters token validity status at query time.
     */
    status?: "expired" | "active" | undefined;

    /**
     * Filter reset requests created on or after this timestamp.
     *
     * @x-autobe-specification Inclusive lower bound date filter for created_at column in both discussion_board_member_password_resets and discussion_board_admin_password_resets tables. Used with createdAtTo for date range filtering.
     */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter reset requests created on or before this timestamp.
     *
     * @x-autobe-specification Inclusive upper bound date filter for created_at column in both discussion_board_member_password_resets and discussion_board_admin_password_resets tables. Used with createdAtFrom for date range filtering.
     */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter by specific member account to view their password reset history.
     *
     * @x-autobe-specification Filters by discussion_board_member_id column in discussion_board_member_password_resets table. Only applies when actorType is 'member' or null. Ignored when actorType='admin'.
     */
    member_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by specific administrator account to view their password reset history.
     *
     * @x-autobe-specification Filters by discussion_board_admin_id column in discussion_board_admin_password_resets table. Only applies when actorType is 'admin' or null. Ignored when actorType='member'.
     */
    admin_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Search text to filter by user email address or display name. Supports partial matching.
     *
     * @x-autobe-specification LIKE search on email and display_name columns from discussion_board_members or discussion_board_admins tables via JOIN. Case-insensitive partial match on email address or display name of the user who requested the reset.
     */
    search?: string | undefined;

    /**
     * Page number for pagination. Starts at 1.
     *
     * @x-autobe-specification 1-indexed page number for pagination. Used with limit to calculate offset. Default value: 1. Minimum: 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records to return per page. Range: 1-100.
     *
     * @x-autobe-specification Maximum number of records per page. Used to limit query results. Default: 20, Minimum: 1, Maximum: 100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Lightweight password reset request summary for administrator accounts, providing essential audit information including the reset token, expiration timestamp, creation time, and associated administrator account. Designed for security auditing and administrative oversight of password reset activities.
   */
  export type ISummary = {
    /**
     * Unique identifier for the password reset request record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_admin_password_resets.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Secure token used to validate and complete the password reset process.
     *
     * @x-autobe-database-schema-property token
     * @x-autobe-specification Direct mapping from discussion_board_admin_password_resets.token. Unique cryptographic token for password reset verification.
     */
    token: string;

    /**
     * Expiration timestamp for the password reset token. After this time, a new reset request must be initiated.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from discussion_board_admin_password_resets.expired_at. Timestamp when the reset token becomes invalid.
     */
    expiredAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the password reset request was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_admin_password_resets.created_at. Used for audit trail and rate limiting.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * The administrator account that requested the password reset.
     *
     * @x-autobe-database-schema-property admin
     * @x-autobe-specification Relation object from discussion_board_admin_password_resets.admin (via discussion_board_admin_id FK). Joins to discussion_board_admins table and returns IDiscussionBoardAdmin.ISummary variant.
     */
    admin: IDiscussionBoardAdmin.ISummary;
  };
}
