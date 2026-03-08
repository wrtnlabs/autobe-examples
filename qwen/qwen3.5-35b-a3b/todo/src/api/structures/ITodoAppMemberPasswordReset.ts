import { tags } from "typia";

export namespace ITodoAppMemberPasswordReset {
  /**
   * Request body for initiating a password reset for a member account. Provide your registered email address to receive a secure password reset link via email. The system will generate a temporary token valid for a limited time.
   */
  export type ICreate = {
    /**
     * The email address associated with the member account requesting password reset.
     *
     * @x-autobe-database-schema-property todo_app_member_id
     * @x-autobe-specification Email lookup: search todo_app_members.email field (case-insensitive) to find member account. Once member is found, create password reset token in todo_app_member_password_resets table with unique token and expires_at calculated from current timestamp. If no member exists with that email, still generate response with success status (security best practice to prevent email enumeration). Token sent via email to registered address.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Confirmation response for password reset token creation. Contains the unique identifier of the created reset token and its creation timestamp for audit tracking. Note: This response does not indicate whether the requested email address exists in the system, as security best practices require identical responses for valid and invalid emails.
   */
  export type ICreated = {
    /**
     * Unique identifier of the created password reset token.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from todo_app_member_password_resets.id. UUID primary key generated on token creation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Creation timestamp of the password reset token in ISO 8601 format.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from todo_app_member_password_resets.created_at. UTC timestamp when the reset token was generated.
     */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Password reset token status and metadata. Provides verification information about a password reset token including its creation time, expiration time, and current active status. The actual reset token value is never exposed for security reasons.
   */
  export type IStatus = {
    /**
     * Unique identifier of the password reset token.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from todo_app_member_password_resets.id (UUID). Primary key of the password reset token.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the password reset token was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from todo_app_member_password_resets.created_at (timestamptz). When the token was generated.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the password reset token expires.
     *
     * @x-autobe-database-schema-property expires_at
     * @x-autobe-specification Direct mapping from todo_app_member_password_resets.expires_at (timestamptz). When the token becomes invalid.
     */
    expires_at: string & tags.Format<"date-time">;

    /**
     * Indicates whether the password reset token is currently active and valid. False if expired, deleted, or already used.
     *
     * @x-autobe-specification Computed boolean: true when expires_at > current time AND deleted_at is null. Indicates whether the token is currently valid and usable.
     */
    isActive: boolean;
  };
}
