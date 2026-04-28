import { tags } from "typia";

export namespace IHrmMemberPasswordReset {
  /**
   * Password reset request containing the member's email address for account identification.
   *
   * This type represents the request body for initiating a password reset flow. The system validates the email format, looks up the corresponding member account, and generates a secure one-time password reset token if the account exists.
   *
   * **Security Note**
   *
   * The API response does not indicate whether the email address exists in the system. This prevents email enumeration attacks where malicious actors could determine which email addresses are registered. A success response is returned whether or not the email exists in the database.
   */
  export type ICreate = {
    /**
     * The member's email address for account identification.
     *
     * This field serves as the primary identifier for the password reset request. The system validates the email format and uses it to look up the corresponding member account in the hrm_members table. If a matching active member account is found, a secure password reset token will be generated and sent to this email address.
     *
     * **Security Note**
     *
     * The API response does not indicate whether the email exists in the system to prevent email enumeration attacks. A success response is returned whether or not the email address is registered.
     *
         * @x-autobe-specification Input-only field. Backend validates email
         *   format, queries hrm_members table by email to find the member
         *   account, then uses the resulting hrm_member_id to create the
         *   password reset record. The email itself is not stored in
         *   hrm_member_password_resets.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Password reset request containing the one-time token and new password.
   *
   * This request body is used to reset a member's password after they have received a one-time reset token via email. The token is validated for existence, expiration, and single-use status before the password is updated.
   *
   * ## Required Fields
   *
   * - `token` - The one-time reset token sent to the member's email
   * - `password` - The new password (plain text, will be hashed by the server)
   *
   * ## Security Notes
   *
   * - Tokens are single-use only; once consumed, they cannot be reused
   * - Expired tokens are rejected with an appropriate error
   * - The password must meet the system's password policy requirements
   */
  export type IRequest = {
    /**
     * One-time password reset token received via email.
     *
     * This token is generated when a member requests a password reset and is sent to their registered email address. The token is validated for existence, expiration status, and single-use constraint before the password reset is processed.
     *
     * ## Validation Rules
     *
     * - Token must exist in the password reset records
     * - Token must not have expired (current time before expires_at)
     * - Token must not have been used previously (used_at is null)
     * - Associated member account must exist and be active
     *
         * @x-autobe-database-schema-property token
         * @x-autobe-specification Direct mapping from
         *   hrm_member_password_resets.token. Used to lookup and validate the
         *   password reset record. Token must exist, not be expired, and not
         *   have been used previously.
     */
    token: string;

    /**
     * New password for the member account.
     *
     * This is the plain text password that will be securely hashed by the server before storage in the hrm_members table. The password must meet the system's password policy requirements including minimum length and complexity constraints.
     *
     * ## Security Notes
     *
     * - Password is transmitted over HTTPS only
     * - Password is never stored in plain text
     * - Password is hashed using bcrypt or equivalent secure algorithm
     * - Password policy requirements must be met
     *
         * @x-autobe-specification Plain text password input that is hashed
         *   using bcrypt and stored in hrm_members.password_hash. This field
         *   does not map to any column in hrm_member_password_resets but
         *   triggers an update to the member's password in hrm_members table
         *   after token validation.
     */
    password: string;

    /**
     * Target page number to retrieve (1-indexed).
     *
     * Specifies which page of results to return. Page numbering starts from 1.
     * If omitted, null, or undefined, defaults to page 1 (first page).
     * Requesting a page beyond the available range returns an empty data array
     * with valid pagination metadata reflecting the actual totals.
     *
         * @x-autobe-specification 1-indexed page number. Defaults to 1 if not
         *   provided.
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
         * @x-autobe-specification Maximum records per page. Defaults to 100 if
         *   not provided.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
