import { tags } from "typia";

export namespace ITodoAppMemberPasswordReset {
  /**
   * Password reset token verification result with validity status and expiration information. This DTO is returned when validating a password reset token before allowing a member to change their password. It indicates whether the token is still valid (not expired and not consumed) along with its creation and expiration timestamps, without exposing the actual token value or other sensitive fields for security purposes.
   */
  export type IStatus = {
    /**
     * Indicates whether the password reset token is currently valid (not expired and not yet consumed).
     *
     * @x-autobe-specification Computed boolean: true if token record exists with id matching path parameter AND deleted_at IS NULL (not consumed) AND expires_at > current timestamp (not expired). False otherwise. This is a derived value, not a database column.
     */
    valid: boolean;

    /**
     * The expiration timestamp after which the password reset token becomes invalid and cannot be used.
     *
     * @x-autobe-database-schema-property expires_at
     * @x-autobe-specification Direct mapping from todo_app_member_password_resets.expires_at column. Stored as timestamptz, returned as ISO 8601 date-time string.
     */
    expiresAt: string & tags.Format<"date-time">;

    /**
     * The timestamp when the password reset token was originally generated.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from todo_app_member_password_resets.created_at column. Stored as timestamptz, returned as ISO 8601 date-time string.
     */
    createdAt: string & tags.Format<"date-time">;
  };

  /**
   * Request parameters for initiating a password reset. Contains the member's registered email address to identify the account requiring password recovery. The system will send a secure reset link to this email address if the account exists.
   */
  export type IRequest = {
    /**
     * The member's registered email address. Used to look up the account that requires password recovery in the todo_app_members table.
     *
     * @x-autobe-specification Member's registered email address for account lookup in todo_app_members table. Validated for email format. Query todo_app_members by email (case-insensitive). If member not found or soft-deleted, return generic 404 to prevent email enumeration. The email value is used to find the todo_app_member_id which is then used to create the password reset record.
     */
    email: string & tags.Format<"email">;

    /**
     * Target page number to retrieve (1-indexed).
     *
     * Specifies which page of results to return. Page numbering starts from 1.
     * If omitted, null, or undefined, defaults to page 1 (first page).
     * Requesting a page beyond the available range returns an empty data array
     * with valid pagination metadata reflecting the actual totals.
     *
     * @x-autobe-specification 1-indexed page number. Defaults to 1 if not provided.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page.
     *
     * Controls how many records are included in each page response. If omitted,
     * null, or undefined, defaults to 100 records per page. The server may
     * enforce upper bounds to prevent excessive resource consumption on large
     * requests.
     *
     * @x-autobe-specification Maximum records per page. Defaults to 100 if not provided.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Confirmation response returned after a password reset request is processed. For security, the response is generic and does not reveal whether the provided email exists in the system.
   */
  export type IResponse = {
    /**
     * Status of the password reset request processing.
     *
     * @x-autobe-specification Operation result status indicator. Always returns success for valid request format to prevent email enumeration.
     */
    status: string;

    /**
     * Confirmation message explaining the next steps.
     *
     * @x-autobe-specification Generic confirmation message explaining next steps. Content is intentionally generic to prevent email enumeration attacks.
     */
    message: string;
  };
}
