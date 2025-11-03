import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppAdmin {
  /**
   * Admin login request containing credentials for authentication. WHEN an
   * admin submits login credentials, THE system SHALL validate the email
   * exists in todo_app_admins table, verify the password matches the stored
   * password_hash using secure comparison to prevent timing attacks, and upon
   * successful authentication create a todo_app_admin_sessions record and
   * issue JWT access token.
   *
   * The email is the unique login identifier. Password is validated
   * server-side against the stored bcrypt or Argon2 hash. Upon successful
   * validation, a JWT access token is issued with admin role claim and
   * 30-minute expiration. An admin session is created capturing connection
   * metadata (IP address, href URL, referrer URL) for audit trail and
   * security monitoring.
   *
   * IF credentials are invalid, THEN THE system SHALL deny access and return
   * error AUTH_INVALID_CREDENTIALS without revealing whether email exists or
   * password was incorrect (for security). IF admin account status is not
   * 'active', THEN THE system SHALL deny access with error
   * AUTH_ACCOUNT_INACTIVE. After 5 failed login attempts within 15 minutes
   * from the same email, THE system SHALL temporarily lock the admin account
   * for 30 minutes as a security measure against brute force attacks.
   */
  export type ILogin = {
    /**
     * Administrator's email address used for authentication. Must be unique
     * across all admin accounts and match exactly (case-insensitive) an
     * email in the todo_app_admins table. The system will verify this email
     * exists before checking the password. If email does not exist,
     * authentication fails with generic error message.
     */
    email: string & tags.Format<"email">;

    /**
     * Administrator's plaintext password for authentication. THE system
     * SHALL hash this password server-side using bcrypt or Argon2 and
     * compare against the stored password_hash in the todo_app_admins
     * table. Password is never stored in plaintext anywhere. Must be at
     * least 8 characters for the account to be valid. Clients MUST transmit
     * this over HTTPS/TLS encryption only.
     */
    password: string & tags.MinLength<8>;

    /**
     * Client IP address from which the login request originates. Optional
     * field - server can extract from request header if not provided. Used
     * for session tracking, security monitoring, and audit trail in
     * todo_app_admin_sessions table. Captured for detecting suspicious
     * access patterns and geographic anomalies.
     */
    ip?: string | undefined;

    /**
     * Connection URL / request URL representing the entry point when the
     * admin initiates login. This is the page URL where the login request
     * was submitted from. MANDATORY for session context and used in
     * todo_app_admin_sessions table for audit trail. Example:
     * 'https://todoapp.example.com/login'
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP Referrer URL indicating the source page that led to the login
     * page. MANDATORY for session context. Captured in
     * todo_app_admin_sessions for tracking traffic sources and user journey
     * analysis. Helps identify where admins came from before logging in.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Admin authorization response returned upon successful admin registration
   * or login. Contains the authenticated admin's unique identifier and JWT
   * token information needed for subsequent authenticated requests.
   *
   * Response Structure: This response is issued after successful validation
   * of admin registration credentials. The response confirms that the admin
   * account was created successfully (or authenticated successfully in login
   * case) and provides tokens needed for the admin to make authenticated
   * requests.
   *
   * Token Information: THE access token is valid for 30 minutes from
   * issuance. THE refresh token is valid for 7 days from issuance. When the
   * access token expires, the admin can use the refresh token to obtain a new
   * access token without re-entering credentials (via the /auth/admin/refresh
   * endpoint).
   *
   * Admin Role & Permissions: The JWT access token includes admin role claim
   * ('admin') which grants the authenticated admin permission to: view all
   * user accounts in todo_app_users table including email, status,
   * creation/update dates; delete specific user accounts (cascade deletes
   * associated todos from todo_app_todos); view system-wide statistics and
   * usage metrics; access and view immutable todo_app_audit_logs; modify
   * system configuration settings; perform backup and recovery operations;
   * view audit trail of all admin actions with admin ID, timestamp, affected
   * user, action type, and details.
   *
   * Token Usage: THE access token must be included in the Authorization
   * header of all subsequent authenticated requests: 'Authorization: Bearer
   * [access_token]'. The system validates the token signature, expiration,
   * and admin role claim on every authenticated request.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated admin account. Corresponds to
     * todo_app_admins.id. Used to identify the admin in all subsequent
     * requests and audit logs. This ID is embedded in the JWT access token
     * and used to verify admin identity for permission checks on
     * administrative operations.
     *
     * This ID is immutable and assigned by the system during admin account
     * creation. Never changes throughout the admin's lifetime in the
     * system.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Administrator's email address for authentication and administrative
     * communication. Must be unique across all admin accounts - no two
     * admins can share the same email. Used as the login identifier for
     * admin authentication. Must follow valid email format (RFC 5322).
     */
    email: string & tags.Format<"email">;

    /**
     * Current account status indicating whether the admin can access the
     * system. Valid values: 'active' means admin can log in and perform
     * operations, 'inactive' means admin cannot log in. Controlled by other
     * admins or system initialization.
     */
    status: "active" | "inactive";

    /**
     * Timestamp when the admin account was created in UTC timezone (ISO
     * 8601 format). Automatically set by the system at account creation
     * time. Immutable - never changes after account creation. Example:
     * 2024-10-31T14:23:45Z
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of the most recent update to any admin profile field in UTC
     * timezone (ISO 8601 format). Automatically updated whenever admin
     * information changes (such as email, status). Initially equals
     * created_at when account is created. Example: 2024-10-31T15:30:00Z
     */
    updated_at: string & tags.Format<"date-time">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Admin registration request body for creating new administrator accounts
   * during system initialization or by existing admins. Captures essential
   * authentication credentials (email and password) needed to establish admin
   * identity and access rights.
   *
   * Registration Process: WHEN a registration request is submitted with this
   * DTO, THE system SHALL validate email is in valid email format and does
   * not already exist in todo_app_admins table (checking email uniqueness).
   * THE system SHALL validate password meets minimum length requirement (8
   * characters). THE system SHALL verify password and password_confirmation
   * match exactly.
   *
   * Upon successful validation, THE system SHALL create new admin record in
   * todo_app_admins table with: unique id (UUID generated by system),
   * submitted email, password_hash (securely hashed from plaintext password),
   * status automatically set to 'active', created_at and updated_at set to
   * current UTC timestamp, deleted_at as NULL.
   *
   * Authentication & Session Creation: THE admin is automatically
   * authenticated upon successful registration and issued JWT access token
   * containing admin role claim ('admin'). The system creates initial
   * todo_app_admin_sessions record capturing connection metadata (ip address,
   * href/request URL, referrer URL, created_at timestamp, expired_at as NULL
   * for active session).
   *
   * Admin Privileges Granted: Upon successful registration, the new admin
   * immediately gains access to all administrative functions: view and manage
   * user accounts in todo_app_users table, delete user accounts (which
   * cascades deletion of associated todos from todo_app_todos), view system
   * statistics, access immutable todo_app_audit_logs audit trail, and perform
   * system maintenance including backups and configuration changes.
   *
   * Error Scenarios: IF email already exists in todo_app_admins table, THEN
   * THE system SHALL reject with error AUTH_EMAIL_ALREADY_EXISTS and message
   * 'This email is already registered as an admin account'. IF password
   * shorter than 8 characters, THEN THE system SHALL reject with error
   * AUTH_WEAK_PASSWORD. IF passwords do not match, THEN THE system SHALL
   * reject with error AUTH_PASSWORD_MISMATCH. IF email format is invalid,
   * THEN THE system SHALL reject with error AUTH_INVALID_EMAIL_FORMAT.
   */
  export type IRegister = {
    /**
     * Admin's email address for authentication and administrative
     * communication. Must follow valid email format (RFC 5322 standard,
     * e.g., admin@example.com). Unique across all admin accounts - the
     * system SHALL validate that no other admin account uses this email
     * address. Used as the login identifier for admin authentication.
     *
     * Validation: Must be in valid email format with at least one character
     * before '@', valid domain name, and valid extension. Examples of valid
     * formats: admin@company.com, admin.user@organization.co.uk. Examples
     * of invalid formats: notanemail, admin@, @domain.com.
     */
    email: string & tags.Format<"email">;

    /**
     * Admin's plaintext password for authentication. Minimum 8 characters
     * required. The system SHALL hash this password using bcrypt (cost
     * factor ≥ 12) or Argon2 before storage. NEVER stored in plaintext -
     * the plaintext password is received in the request, hashed
     * server-side, and the hash is stored in the password_hash column of
     * todo_app_admins table.
     *
     * Password Requirements: Minimum 8 characters in length, may contain
     * uppercase letters, lowercase letters, numbers, and special
     * characters. The system validates password meets minimum length
     * requirement and rejects passwords shorter than 8 characters with
     * error 'Password must be at least 8 characters long'.
     *
     * Field Mapping: This DTO field 'password' maps to the Prisma model's
     * 'password_hash' column. The plaintext password received here is
     * hashed and stored in password_hash column.
     */
    password: string & tags.MinLength<8>;

    /**
     * Confirmation of the admin's password for verification during
     * registration. Must exactly match the 'password' field. The system
     * validates that both password fields match character-for-character
     * before proceeding with account creation.
     *
     * Validation: THE system SHALL verify password and
     * password_confirmation fields match exactly. IF passwords do not
     * match, THEN THE system SHALL reject registration with error code
     * AUTH_PASSWORD_MISMATCH and display message 'Passwords do not match.
     * Please re-enter your password'.
     *
     * Usage: Used only during registration to prevent typos in password
     * entry. Not sent during login operations.
     */
    password_confirmation: string & tags.MinLength<8>;
  };

  /**
   * Admin token refresh request body for obtaining new JWT access token using
   * valid refresh token. Sent when admin's current access_token expires
   * (after 30 minutes) but refresh_token is still valid (within 7 days).
   *
   * Refresh Operation: WHEN an admin submits a refresh token request with
   * this DTO, THE system SHALL validate the refresh_token has not been
   * revoked, and the expiration timestamp has not passed (refresh tokens
   * valid for 7 days from issuance). THE system SHALL verify the admin
   * account referenced in the refresh_token still exists in todo_app_admins
   * table with status 'active'.
   *
   * Success Response: IF validation passes, THE system SHALL issue new
   * ITodoAppAdmin.IAuthorized response containing new JWT access_token with
   * admin role claim and 30-minute expiration. THE system optionally issues
   * new refresh_token extending the session (7-day validity).
   *
   * Error Handling: IF refresh_token is invalid (malformed, wrong signature),
   * THE system SHALL reject with error AUTH_INVALID_TOKEN. IF refresh_token
   * is expired (beyond 7-day window), THE system SHALL reject with error
   * AUTH_TOKEN_EXPIRED and display message 'Your session has expired. Please
   * log in again'. IF associated admin account is no longer active in
   * todo_app_admins (status not 'active' or deleted_at is set), THEN THE
   * system SHALL reject the refresh request with error AUTH_USER_INACTIVE and
   * message 'Your admin account is no longer active. Please contact system
   * administrator'.
   *
   * Audit Logging: Admin refresh token requests are NOT logged to
   * todo_app_audit_logs (authentication maintenance operations are not
   * audit-logged). However, if admin subsequently performs administrative
   * actions after refresh, those actions ARE logged in audit_logs with
   * admin's ID, action type, timestamp, and other audit context.
   *
   * Token Lifecycle: After refresh succeeds, the previous access_token
   * becomes invalid but can still be revoked if needed for security. The new
   * access_token can be used immediately in Authorization header for
   * subsequent requests.
   */
  export type IRefresh = {
    /**
     * Valid JWT refresh token obtained from previous authentication (admin
     * registration or login). Used to obtain new access_token when current
     * access_token expires. Valid for 7 days from issuance.
     *
     * Token Source: This refresh_token is provided in
     * ITodoAppAdmin.IAuthorized response from successful admin registration
     * or login operations. Client stores this token securely (ideally in
     * HttpOnly, Secure cookie) for future refresh operations.
     *
     * Validation: THE system SHALL validate that refresh_token exists, has
     * not been revoked, and the expiration timestamp (exp claim in JWT) has
     * not passed (refresh tokens valid for 7 days from issuance). THE
     * system SHALL verify the admin account referenced in the refresh_token
     * still exists in todo_app_admins table with status 'active' (not
     * 'inactive' or deleted with deleted_at set).
     *
     * Token Validity Window: Refresh tokens are valid for 7 days from
     * issuance. After 7 days, the refresh_token cannot be used and the
     * admin must re-authenticate using login operation with email and
     * password.
     *
     * Format: JWT format with three base64-encoded segments separated by
     * periods (header.payload.signature). Contains admin id,
     * refresh_token_id, and exp (expiration) claim with Unix timestamp.
     */
    refresh_token: string;
  };
}
