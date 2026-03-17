import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IShoppingMallSuperAdmin {
  /**
   * Request body for super administrator account registration. This DTO captures the credentials and session context required to create a new super administrator account. The email must be unique across all super administrator accounts. The password will be securely hashed using bcrypt before storage. Session context fields (href, referrer, ip) are captured for audit trail and session management purposes.
   */
  export type IJoin = {
    /**
     * Email address for authentication, unique across all super administrator accounts.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from shopping_mall_super_admins.email column. Must be unique across all super administrator accounts. Validated for email format.
     */
    email: string & tags.Format<"email">;

    /**
     * Bcrypt hashed password for secure authentication. Must meet minimum length and complexity requirements.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Maps to shopping_mall_super_admins.password_hash column. Password is bcrypt hashed by the service before storage. Minimum length and complexity validation applied.
     */
    password: string & tags.Format<"password">;

    /**
     * URL of the page where the super administrator registration was initiated. Captured for audit trail and session management.
     *
     * @x-autobe-specification Session context field captured from HTTP request. Stored in shopping_mall_super_admin_sessions table, not in super_admins table. Represents the page URL where registration was initiated.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP referrer URL indicating the source page that linked to the registration page. Captured for audit trail purposes.
     *
     * @x-autobe-specification Session context field captured from HTTP Referer header. Stored in shopping_mall_super_admin_sessions table, not in super_admins table. Represents the HTTP referrer URL.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address captured during registration. Optional field that may be null in server-side rendering scenarios. Validated for IPv4 format when provided.
     *
     * @x-autobe-specification Session context field captured from HTTP request (X-Forwarded-For or remote address). Stored in shopping_mall_super_admin_sessions table, not in super_admins table. Nullable to support SSR scenarios where client cannot know its own IP. Validated for IPv4 format when provided.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };

  /**
   * Authentication credentials for super administrator login. This request body is used when a super administrator authenticates to establish a new session. The email must match an existing super administrator account, and the password is verified against the stored bcrypt hash. Session context information (href, referrer, ip) is captured for audit and session management purposes.
   */
  export type ILogin = {
    /**
     * Email address for authentication, unique across all super administrator accounts.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from shopping_mall_super_admins.email. Used for unique indexed lookup to find the super administrator account. Must be valid email format.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password. Backend will hash using bcrypt for comparison against stored password_hash.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Maps to shopping_mall_super_admins.password_hash. Plain text password from request is compared against stored bcrypt hash using bcrypt.compare(). Never store plain text password.
     */
    password: string & tags.Format<"password">;

    /**
     * Full URL where the authentication was initiated. Used for session tracking and audit.
     *
     * @x-autobe-specification Session context field captured from HTTP request. Stored in shopping_mall_super_admin_sessions.href, not in shopping_mall_super_admins table. Represents the full URL where authentication was initiated for audit tracking.
     */
    href: string & tags.Format<"uri">;

    /**
     * HTTP referrer header value indicating the previous page. Used for session tracking.
     *
     * @x-autobe-specification Session context field captured from HTTP Referrer header. Stored in shopping_mall_super_admin_sessions.referrer, not in shopping_mall_super_admins table. Indicates the previous page for session tracking.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address. Optional to support server-side rendering (SSR) scenarios where IP may not be available.
     *
     * @x-autobe-specification Session context field captured from client IP address. Stored in shopping_mall_super_admin_sessions.ip, not in shopping_mall_super_admins table. Optional to support SSR scenarios where server captures IP as fallback. Format: ipv4.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Request body for refreshing a super administrator's JWT access token. Contains the refresh token obtained from a previous authentication (login) or refresh operation. Submitting this request validates the refresh token against active sessions and returns a new access/refresh token pair without requiring re-authentication with email and password credentials.
   */
  export type IRefresh = {
    /**
     * JWT refresh token obtained from a previous authentication response (login or prior refresh). This token proves the user has an active session and is used to obtain a new access token without re-entering credentials. The token is validated against the shopping_mall_super_admin_sessions table to ensure the session has not expired.
     *
     * @x-autobe-specification JWT refresh token string validated against shopping_mall_super_admin_sessions. Service decodes token to extract session ID, queries session table to verify expired_at timestamp is in future, confirms linked super administrator account exists and is active (deleted_at is null). Token format follows JWT standard with signature verification.
     */
    refresh_token: string;
  };

  /**
   * Authentication response for super administrator containing account identification and JWT tokens. Returned after successful join, login, or token refresh operations. The access token authorizes subsequent API requests, while the refresh token enables obtaining new access tokens without re-authentication.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the super administrator account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_super_admins.id. UUID format primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Email address associated with the super administrator account, used for login authentication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from shopping_mall_super_admins.email. Unique email address used for authentication.
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
   * Request parameters for searching and filtering super administrator accounts. Supports partial email matching, creation date range filtering, pagination, and sorting. All parameters are optional to allow flexible query combinations. Only accessible by super administrators for platform governance oversight.
   */
  export type IRequest = {
    /**
     * Partial match search term for filtering super administrators by email address. Matches any record where the email contains the search string.
     *
     * @x-autobe-specification Partial match filter on shopping_mall_super_admins.email column using SQL LIKE operator with wildcards. Translates to: WHERE email LIKE '%{search}%'. Case-insensitive matching recommended. Optional parameter - omit if no search needed.
     */
    search?: string | undefined;

    /**
     * Filter super administrators created on or after this timestamp. Only returns accounts with created_at greater than or equal to this value.
     *
     * @x-autobe-specification Filter on shopping_mall_super_admins.created_at column with >= comparison. Translates to: WHERE created_at >= '{created_at_from}'. ISO 8601 datetime format expected. Optional parameter - omit if no lower bound needed.
     */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter super administrators created on or before this timestamp. Only returns accounts with created_at less than or equal to this value.
     *
     * @x-autobe-specification Filter on shopping_mall_super_admins.created_at column with <= comparison. Translates to: WHERE created_at <= '{created_at_to}'. ISO 8601 datetime format expected. Optional parameter - omit if no upper bound needed.
     */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for pagination, starting from 1. Determines which page of results to return based on the limit parameter.
     *
     * @x-autobe-specification Pagination parameter for cursor-based pagination. Translates to OFFSET calculation: OFFSET = (page - 1) * limit. 1-indexed (page 1 = first page). Default value: 1. Must be >= 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page. Controls how many super administrator records are returned in a single response. Maximum 100 items per page.
     *
     * @x-autobe-specification Pagination parameter specifying maximum records per page. Translates to LIMIT clause: LIMIT {limit}. Default value: 20. Maximum allowed: 100. Must be >= 1 and <= 100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Sort field and direction for ordering results. Format is 'fieldName,direction' (e.g., 'created_at,desc' or 'email,asc'). Defaults to newest accounts first.
     *
     * @x-autobe-specification Sort specification for ORDER BY clause. Format: 'field,direction' where field is a column name (e.g., 'created_at', 'email') and direction is 'asc' or 'desc'. Default: 'created_at,desc'. Translates to: ORDER BY {field} {direction}.
     */
    sort?: string | undefined;
  };

  /**
   * Super administrator account summary for list displays and detail views. Contains essential account identification information including the administrator's email address and account timestamps. This schema is used in paginated lists of super administrators and when retrieving individual super administrator details. Sensitive authentication credentials are excluded for security. Only active (non-deleted) accounts are returned.
   */
  export type ISummary = {
    /**
     * Unique identifier of the super administrator account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_super_admins.id. UUID format generated by database on insert.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Email address for authentication, unique across all super administrator accounts.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from shopping_mall_super_admins.email. Unique constraint enforced at database level. Email format validation required.
     */
    email: string & tags.Format<"email">;

    /**
     * Timestamp when the super administrator account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from shopping_mall_super_admins.created_at. Auto-populated by database on INSERT with CURRENT_TIMESTAMP.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the super administrator account was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from shopping_mall_super_admins.updated_at. Auto-updated by database on UPDATE with CURRENT_TIMESTAMP.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
