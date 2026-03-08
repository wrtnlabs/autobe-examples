import { tags } from "typia";

export namespace IDiscussionBoardMemberPasswordReset {
  /**
   * Request parameters for filtering and pagination of password reset requests.
   */
  export type IRequest = {
    /**
     * Filter password resets for a specific member
     *
     * @x-autobe-database-schema-property discussion_board_member_id
     */
    discussion_board_member_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by password reset status: pending (not expired and not used), expired (expired but not used), used (password reset completed)
     */
    status?: "pending" | "expired" | "used" | undefined;

    /**
     * Filter password resets created after this timestamp
     *
     * @x-autobe-database-schema-property created_at
     */
    created_after?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter password resets created before this timestamp
     *
     * @x-autobe-database-schema-property created_at
     */
    created_before?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter password resets expiring after this timestamp
     *
     * @x-autobe-database-schema-property expires_at
     */
    expires_after?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter password resets expiring before this timestamp
     *
     * @x-autobe-database-schema-property expires_at
     */
    expires_before?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter password resets used after this timestamp.
     *
     * @x-autobe-database-schema-property used_at
     * @x-autobe-specification Direct mapping from discussion_board_member_password_resets.used_at. Filter for records used after this timestamp.
     */
    used_after?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Filter password resets used before this timestamp.
     *
     * @x-autobe-database-schema-property used_at
     * @x-autobe-specification Direct mapping from discussion_board_member_password_resets.used_at. Filter for records used before this timestamp.
     */
    used_before?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Page number for pagination (1-indexed)
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Number of records per page
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;
  };

  /**
   * Summary information for password reset tracking. Contains essential metadata about password reset requests including user identification, reset status (pending/used/expired), and timestamp information for security auditing and user support workflows.
   */
  export type ISummary = {
    /**
     * Password reset record unique identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_member_password_resets.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Member who requested the password reset.
     *
     * @x-autobe-database-schema-property member
     * @x-autobe-specification Join via discussion_board_member_id to discussion_board_members.id.
     */
    member_id: string & tags.Format<"uuid">;

    /**
     * Password reset status indicating whether the token is pending (unused), used (password reset completed), or expired.
     *
     * @x-autobe-specification Computed: 'pending' if used_at is null and expires_at > now, 'used' if used_at present, 'expired' if expires_at < now.
     */
    status: "pending" | "used" | "expired";

    /**
     * Expiration time for the password reset token.
     *
     * @x-autobe-database-schema-property expires_at
     * @x-autobe-specification Direct mapping from discussion_board_member_password_resets.expires_at.
     */
    expires_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when password was successfully reset using this token.
     *
     * @x-autobe-database-schema-property used_at
     * @x-autobe-specification Direct mapping from discussion_board_member_password_resets.used_at. Nullable timestamp when password was successfully reset.
     */
    used_at: (string & tags.Format<"date-time">) | null;

    /**
     * When the password reset request was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_member_password_resets.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * When the password reset record was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from discussion_board_member_password_resets.updated_at.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft delete timestamp for the password reset record.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from discussion_board_member_password_resets.deleted_at. Nullable soft delete timestamp.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };
}
