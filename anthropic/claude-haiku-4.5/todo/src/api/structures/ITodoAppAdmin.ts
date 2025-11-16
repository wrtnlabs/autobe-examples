import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppAdmin {
  /**
   * Request body for creating a new administrator account or authenticating
   * an existing administrator. Contains email and password credentials for
   * account establishment or login.
   *
   * This DTO is used for both admin registration (POST /auth/admin/join) and
   * admin login (POST /auth/admin/login) operations. In both cases, the
   * credentials are validated against security requirements and the password
   * is processed using bcrypt hashing before database storage.
   */
  export type ICreate = {
    /**
     * Administrator's email address used for authentication and system
     * notifications. Must be in valid email format and unique across all
     * admin accounts. This is the primary login identifier for admin panel
     * access.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password for the admin account. Backend receives this
     * plain password, validates against security requirements, and stores a
     * bcrypt hash with salt rounds >= 12. Passwords are never stored in
     * plain text in the database.
     *
     * The password must meet configured security requirements including
     * minimum length and character complexity standards appropriate for
     * admin accounts.
     */
    password: string & tags.MinLength<1>;
  };

  /**
   * Authorization response containing authenticated administrator information
   * and JWT tokens.
   *
   * This DTO is returned upon successful admin authentication (login or
   * refresh). It contains the administrator's unique identifier and JWT token
   * information necessary for authenticating subsequent API requests.
   *
   * The token object includes the access token (short-lived, typically 1-2
   * hours) used to authenticate API calls, and a refresh token (long-lived,
   * typically 7-30 days) that can be used to obtain new access tokens without
   * re-authentication.
   *
   * Administrators should securely store both tokens and use the access token
   * in the Authorization header for all subsequent API requests. When the
   * access token expires, the administrator should use the refresh token to
   * obtain a new access token via the refresh endpoint.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated administrator. This UUID is
     * assigned when the admin account is created and serves as the primary
     * identifier for all admin-related operations and session management.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Administrator's email address used for authentication and system
     * notifications. Must be in valid email format and unique across all
     * admin accounts. This is the primary login identifier for admin panel
     * access.
     */
    email: string & tags.Format<"email">;

    /**
     * Admin account creation timestamp in UTC. This value is immutable and
     * records when the admin account was first created by system operator.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last modification timestamp. Updated whenever admin profile
     * information or password is changed. Enables tracking of account
     * modifications.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft deletion timestamp. If null, the account is active. If set, the
     * admin account is marked for deletion but data is retained for audit
     * trail and compliance purposes.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp of the admin's most recent activity (login or API request).
     * Updated with each authenticated request. Used to monitor admin
     * activity and identify inactive admin accounts.
     */
    last_active_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Administrator refresh token request for obtaining a new access token.
   *
   * This DTO accepts a valid refresh token issued to an authenticated
   * administrator during login or registration. The refresh token serves as a
   * long-lived credential that can be used multiple times to obtain fresh
   * access tokens without requiring the administrator to re-submit their
   * authentication credentials.
   *
   * The refresh token must be valid and non-expired. Upon successful
   * validation, the system issues a new access token with appropriate
   * admin-level claims, enabling continuous session management and
   * uninterrupted access to administrative functions.
   *
   * This operation is essential for maintaining administrator session
   * continuity while limiting the exposure window of short-lived access
   * tokens.
   */
  export type IRefresh = {
    /**
     * Valid refresh token issued during a previous login or registration
     * operation. This long-lived token is used to obtain a new access token
     * without requiring email and password re-submission. The refresh token
     * must be currently valid and not expired.
     */
    refresh_token: string;
  };
}
