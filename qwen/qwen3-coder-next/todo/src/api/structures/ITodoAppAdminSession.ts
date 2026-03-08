import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ITodoAppAdminSession {
  /**
   * Request body for registering a new system administrator account.
   */
  export type IJoin = {
    /**
     * Admin email address for authentication
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping to todo_app_admins.email. Must be unique and valid email format.
     */
    email: string & tags.Format<"email">;

    /**
     * Admin password (plain text, will be hashed by server)
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Maps to todo_app_admins.password_hash. Password is hashed by backend using bcrypt before storage.
     */
    password: string & tags.Format<"password">;

    /**
     * The URL of the web page where the user initiated the registration
     *
     * @x-autobe-specification Session context field. Captures the URL where the registration request originated. Used for security auditing.
     */
    href?: (string & tags.Format<"uri">) | undefined;

    /**
     * The URL of the previous web page that linked to the registration page
     *
     * @x-autobe-specification Session context field. Captures the referrer URL that led to the registration page. Used for security auditing.
     */
    referrer?: (string & tags.Format<"uri">) | undefined;

    /**
     * The IP address of the client registering the admin account
     *
     * @x-autobe-specification Session context field. Captures the client's IP address during registration. Used for security auditing and abuse prevention.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Administrator login request containing authentication credentials and session context metadata.
   */
  export type ILogin = {
    /**
     * Administrator's email address for authentication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from todo_app_admins.email. Must match exactly with database value.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password for verification against bcrypt hash.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Maps to todo_app_admins.password_hash via bcrypt verification. Plain text password verified against stored hash.
     */
    password: string & tags.Format<"password">;

    /**
     * Client IP address at login time for session tracking.
     *
     * @x-autobe-specification Computed from HTTP request context. Captures client IP address at login time, stored in todo_app_admin_sessions.ip.
     */
    ip: string & tags.Format<"ipv4">;

    /**
     * HTTP referrer header at login time for session context.
     *
     * @x-autobe-specification Computed from HTTP request headers. Captures referrer URL at login time, stored in todo_app_admin_sessions.referrer.
     */
    referrer?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Target URL path at login time for session tracking.
     *
     * @x-autobe-specification Computed from HTTP request context. Captures target URL path at login time, stored in todo_app_admin_sessions.href.
     */
    href?: (string & tags.Format<"uri">) | null | undefined;
  };

  /**
   * Authentication response containing JWT tokens and admin user information. Provides access and refresh tokens for subsequent authenticated requests along with basic admin profile information.
   */
  export type IAuthorized = {
    /**
     * Admin user ID
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from todo_app_admins.id. Admin user's unique identifier.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Admin email address
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from todo_app_admins.email. Admin's authenticated email address.
     */
    email: string & tags.Format<"email">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for refreshing authentication tokens. Contains the refresh token that will be validated and exchanged for a new access token.
   */
  export type IRefresh = {
    /**
     * JWT refresh token to validate and exchange for a new access token.
     *
     * @x-autobe-specification JWT refresh token string from the session table. Used to obtain new access tokens without re-authentication.
     */
    refresh_token: string;

    /**
     * Client IP address at refresh time.
     *
     * @x-autobe-specification Client IP address at refresh time. Optional: server uses body.ip ?? serverIp.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Page URL at refresh time.
     *
     * @x-autobe-specification Current page URL at refresh time.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL at refresh time.
     *
     * @x-autobe-specification Referrer URL at refresh time.
     */
    referrer: string & tags.Format<"uri">;
  };
}
