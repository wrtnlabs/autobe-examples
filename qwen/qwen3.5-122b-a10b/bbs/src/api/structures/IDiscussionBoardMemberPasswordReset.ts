import { tags } from "typia";

export namespace IDiscussionBoardMemberPasswordReset {
  /**
   * Password reset token validation metadata for API consumers. This summary provides validation information for a password reset token without exposing the actual token value. Used to verify token validity before allowing a user to proceed with password reset, including expiration timestamp and usage status.
   */
  export type ISummary = {
    /**
     * Unique identifier for the password reset token record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_member_password_resets.id. UUID primary key for password reset record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the password reset token expires and becomes invalid.
     *
     * @x-autobe-database-schema-property expires_at
     * @x-autobe-specification Direct mapping from discussion_board_member_password_resets.expires_at. Token becomes invalid after this timestamp.
     */
    expires_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the token was used for password reset. Null if still available for use.
     *
     * @x-autobe-database-schema-property used_at
     * @x-autobe-specification Direct mapping from discussion_board_member_password_resets.used_at. Null if token has not been used yet. After use, token is invalidated.
     */
    used_at: (string & tags.Format<"date-time">) | null;

    /**
     * Timestamp when the password reset token was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_member_password_resets.created_at. When the password reset request was initiated.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
