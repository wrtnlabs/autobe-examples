import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppAdminSession {
  /**
   * Request body for registering a new system administrator account.
   */
  export type IJoin = {
    /**
     * Admin email address for authentication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from todo_app_admins.email. Unique constraint enforced.
     */
    email: string & tags.Format<"email">;

    /**
     * Admin password (will be securely hashed before storage).
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plain text password input that is hashed with bcrypt before storing in password_hash column.
     */
    password: string & tags.MinLength<8> & tags.Format<"password">;

    /**
     * URL path accessed by the admin before registration.
     *
     * @x-autobe-specification Session context field stored in admin_sessions table. Represents the URL path accessed before authentication.
     */
    href?: (string & tags.Format<"uri">) | undefined;

    /**
     * Referrer URL of the admin's session.
     *
     * @x-autobe-specification Session context field stored in admin_sessions table. Represents the referrer URL of the admin's session.
     */
    referrer?: (string & tags.Format<"uri">) | undefined;

    /**
     * IP address of the admin's session.
     *
     * @x-autobe-specification Session context field stored in admin_sessions table. Represents the IP address of the admin's session.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Request body for refreshing admin authentication tokens. Contains the refresh token used to validate and renew the admin's authenticated session.
   */
  export type IRefresh = {
    /**
     * JWT refresh token for renewing admin authentication session.
     *
     * @x-autobe-database-schema-property refresh_token
     * @x-autobe-specification Refresh token from todo_app_admin_sessions.refresh_token used to authenticate session renewal for admin users. Required field for token rotation and session continuity.
     */
    refresh_token: string;
  };

  /**
   * Authorization token information containing JWT tokens for authenticated admin session and expiration timestamp.
   */
  export type IAuthorized = {
    /**
     * JWT access token for API authentication.
     *
     * @x-autobe-database-schema-property access_token
     * @x-autobe-specification Direct mapping from todo_app_admin_sessions.access_token. JWT access token for API authentication.
     */
    access: string;

    /**
     * JWT refresh token for session renewal.
     *
     * @x-autobe-database-schema-property refresh_token
     * @x-autobe-specification Direct mapping from todo_app_admin_sessions.refresh_token. JWT refresh token for session renewal.
     */
    refresh: string;

    /**
     * Token expiration timestamp in ISO 8601 format.
     *
     * @x-autobe-database-schema-property expires_at
     * @x-autobe-specification Direct mapping from todo_app_admin_sessions.expires_at. Token expiration timestamp.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for admin login authentication.
   */
  export type ILogin = {
    email: string;
    password: string & tags.Format<"password">;
    href?: (string & tags.Format<"uri">) | undefined;
    referrer?: (string & tags.Format<"uri">) | undefined;
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };
}
