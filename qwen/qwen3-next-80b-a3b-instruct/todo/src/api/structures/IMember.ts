import { tags } from "typia";

export namespace IMember {
  /**
   * Request DTO for creating a new member account in the todo list
   * application. This schema defines the required credentials for user
   * registration: email and password.
   *
   * The IMember.IJoin DTO contains only the essential authentication
   * information needed to create a new user account. All additional user
   * context such as creator ID, session details, and account metadata are
   * derived automatically by the system after validation and are not included
   * in this request.
   *
   * This schema directly maps to the todo_list_user database table, where the
   * email field corresponds to the email column and the password field
   * corresponds to the hashed_password column (which receives the encrypted
   * value). The system enforces database-level constraints including email
   * uniqueness and password length requirements.
   *
   * The registration process follows a secure protocol where the password is
   * never stored in plaintext. After validation, the system applies
   * cryptographic hashing and salting before saving the record to the
   * database. Upon successful registration, the user is issued authentication
   * tokens for subsequent secure API access.
   */
  export type IJoin = {
    /**
     * The member's unique email address used for authentication and account
     * identification. Must be a valid RFC 5322 email address and must be
     * unique across all system accounts. This field serves as the primary
     * identifier for the user's account and is used for communication
     * purposes.
     *
     * The system enforces email uniqueness at the database level through a
     * unique index on the todo_list_user.email column. Duplicate email
     * registrations are rejected with a 409 Conflict error. The email is
     * stored in lowercase to prevent case-sensitive duplicates.
     *
     * Users must verify their email address through a confirmation link
     * sent to this address before gaining full access to the application's
     * features.
     */
    email: string & tags.Format<"email">;

    /**
     * The plain-text password provided by the member during account
     * registration. This value will be securely hashed using bcrypt with a
     * salt before storage in the database. The system never stores the
     * original password value.
     *
     * The password must meet minimum security requirements: at least 12
     * characters long, containing at least one uppercase letter, one
     * lowercase letter, one number, and one special character. Passwords
     * are never exposed in logs, responses, or error messages.
     *
     * After successful registration, the user must authenticate with this
     * password to obtain access tokens. Passwords are never transferred in
     * response bodies and are only accepted in secure HTTPS POST requests.
     */
    password: string;
  };

  /**
   * Request DTO for refreshing a member's authentication tokens. Contains
   * only the refresh token to be renewed. After validation against the
   * todo_list_user_sessions table, the server issues new access and refresh
   * tokens while immediately invalidating the provided refresh token to
   * enforce secure token rotation. This endpoint enables seamless
   * continuation of member sessions when access tokens expire, eliminating
   * the need for re-authentication while maintaining high security standards
   * through single-use token validation.
   */
  export type IRefresh = {
    /**
     * The refresh token to be renewed. This token must be valid and not
     * expired, and it must have been previously issued during a successful
     * login or join operation. The system uses this token to validate the
     * member's session and issue new access and refresh tokens. Refresh
     * tokens are cryptographically signed and bound to the member's
     * account, ensuring secure token rotation. Each refresh operation
     * invalidates the previous refresh token to prevent token reuse and
     * enhance account security.
     */
    refreshToken: string;
  };

  /**
   * Request DTO for member login authentication.
   *
   * Represents the credential data needed to authenticate a member user with
   * the todo list system.
   *
   * Used exclusively for the POST /auth/member/login endpoint, which
   * validates email and password against the todo_list_user table.
   *
   * The schema contains only two required fields: email and password.
   *
   * The password field contains plain text (not hashed), as the server is
   * responsible for hashing and comparing with the stored password_hashed
   * column.
   *
   * The actor (member) identity is not included in this request body - it is
   * determined from the email credential.
   *
   * No system-generated fields like id, created_at, or session_id are
   * included in this request body, as they are derived server-side from the
   * validated credentials.
   */
  export type ILogin = {
    /**
     * Member's email address used for authentication. Must match exactly
     * with a record in the todo_list_user table.
     *
     * Global unique identifier for the member account. Used as the primary
     * credential for login along with password.
     *
     * Follows standard email format with local-part@domain format as
     * defined in RFC 5322.
     *
     * This field is required for authentication and cannot be omitted.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password for authentication.
     *
     * The system compares this password against the stored password hash in
     * the todo_list_user table using secure comparison.
     *
     * Should be at least 8 characters long and contain a mix of letters,
     * numbers, and symbols according to security best practices.
     *
     * Client must provide the plain text password - server handles hashing
     * and storage in password_hashed column.
     *
     * This field is required for authentication and cannot be omitted.
     */
    password: string;
  };
}
