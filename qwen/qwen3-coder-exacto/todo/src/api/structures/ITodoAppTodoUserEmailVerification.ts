import { tags } from "typia";

export namespace ITodoAppTodoUserEmailVerification {
  /**
   * Email verification request containing the token needed to verify a user's email address. This DTO is used during the user registration workflow when users must confirm their email ownership by submitting a verification token.
   */
  export type IVerify = {};

  /**
   * Response confirming successful email verification for a todo app user. Contains verification timestamp and status information.
   */
  export type IVerifyResponse = {
    /**
     * Unique identifier for this email verification record. This is the primary key in the database.
     *
     * @x-autobe-specification Direct mapping from todo_app_todo_user_email_verifications.id column. This is the primary key for the email verification record.
     */
    id: string;

    /**
     * ID of the user this email verification belongs to. References the todo_app_todo_users table.
     *
     * @x-autobe-specification Direct mapping from todo_app_todo_user_email_verifications.user_id column. Foreign key referencing the user who owns this verification.
     */
    userId: string;

    /**
     * Timestamp when this email verification token expires and becomes invalid.
     *
     * @x-autobe-specification Direct mapping from todo_app_todo_user_email_verifications.expires_at column. DateTime value converted to ISO 8601 string format.
     */
    expiresAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when this email verification token was used, null if not yet used.
     *
     * @x-autobe-specification Direct mapping from todo_app_todo_user_email_verifications.used_at column. Nullable DateTime value converted to ISO 8601 string format. Null when token has not been used.
     */
    usedAt?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp when this email verification record was created.
     *
     * @x-autobe-specification Direct mapping from todo_app_todo_user_email_verifications.created_at column. DateTime value converted to ISO 8601 string format.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when this email verification record was last updated.
     *
     * @x-autobe-specification Direct mapping from todo_app_todo_user_email_verifications.updated_at column. DateTime value converted to ISO 8601 string format.
     */
    updatedAt: string & tags.Format<"date-time">;
  };
}
