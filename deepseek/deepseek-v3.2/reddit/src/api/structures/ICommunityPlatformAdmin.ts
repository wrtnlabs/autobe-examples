import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformAdmin {
  /**
   * Search criteria and pagination parameters for filtering platform administrator accounts. Provides email search, account status filtering (active vs deleted), creation date ranges, and pagination controls for administrative review interfaces.
   */
  export type IRequest = {
    /**
     * Partial match search term for administrator email addresses. Searches email field using case-insensitive LIKE %search% pattern.
     *
     * @x-autobe-specification Email partial match filter using LIKE %search% pattern on community_platform_admins.email column. Case-insensitive implementation. When provided, adds WHERE email ILIKE '%' || search || '%' to query.
     */
    search?: string | undefined;

    /**
     * Whether to include deleted administrator accounts in results. If true, includes administrators with non-null deleted_at timestamp. If false or omitted, filters to only active administrators (deleted_at IS NULL).
     *
     * @x-autobe-specification Boolean flag controlling visibility of soft-deleted administrators. When false or omitted, adds WHERE deleted_at IS NULL to filter active accounts. When true, includes all rows regardless of deletion status.
     */
    include_deleted?: boolean | undefined;

    /**
     * Optional start date for creation timestamp filtering. Inclusive lower bound for created_at field.
     *
     * @x-autobe-specification Optional start date for creation timestamp filtering. When provided, adds WHERE created_at >= start_created_at to query. Inclusive lower bound.
     */
    start_created_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional end date for creation timestamp filtering. Inclusive upper bound for created_at field.
     *
     * @x-autobe-specification Optional end date for creation timestamp filtering. When provided, adds WHERE created_at <= end_created_at to query. Inclusive upper bound.
     */
    end_created_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Page number for pagination. Page 1 is the first page. Calculates offset = (page-1)*limit.
     *
     * @x-autobe-specification Page number for pagination (1-indexed). Calculates offset = (page-1)*limit. Must be >= 1. Used with LIMIT clause for result pagination.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of results per page. Maximum 100 items per page to prevent excessive load.
     *
     * @x-autobe-specification Maximum number of records per page. Enforced maximum of 100 items to prevent excessive load. Used with LIMIT clause and offset calculation.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Administrator authentication response containing identity information and JWT tokens for session management. Returned after successful administrator registration, login, or token refresh operations. Provides essential information for subsequent authenticated API requests.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the administrator account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_admins.id. Unique administrator identifier.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Email address associated with the administrator account.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from community_platform_admins.email. Unique email address used for authentication.
     */
    email: string;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Administrator login credentials for authenticating to the platform administration interface. Contains email address and password for verifying administrator identity and establishing authenticated sessions with privileged access.
   */
  export type ILogin = {
    /**
     * Administrator's email address used for authentication and account identification.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from community_platform_admins.email column. Must be unique across all administrator accounts.
     */
    email: string & tags.Format<"email">;

    /**
     * Administrator's password for authentication. Stored securely as a hash in the database.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Transformation mapping: plaintext password provided by user is securely hashed and compared against stored password_hash column in community_platform_admins table.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * Request body for administrator registration. Contains email and password credentials for authentication, along with session context information for security auditing and initial session creation.
   */
  export type IJoin = {
    /**
     * Email address for administrator authentication and communication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from community_platform_admins.email column. Must be unique across all administrator accounts. Used as login identifier.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password for administrator authentication. Securely hashed before storage.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Maps to community_platform_admins.password_hash column after server-side cryptographic hashing. Plaintext password is never stored.
     */
    password: string & tags.Format<"password">;

    /**
     * URL of the page where the registration request originated.
     *
     * @x-autobe-specification Current page URL where registration was initiated. Used for security auditing and session creation context. Stored in session metadata, not in admin table.
     */
    href: string & tags.Format<"uri">;

    /**
     * URL of the referring page that directed the user to the registration page.
     *
     * @x-autobe-specification Referrer URL indicating where the user came from. Used for security auditing and session creation context. Stored in session metadata, not in admin table.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address. Optional for server-side rendering scenarios where client IP is determined by the server.
     *
     * @x-autobe-specification Client IP address for security auditing. Optional because in server-side rendering (SSR) scenarios, the client may not know its own IP; server captures it as fallback (body.ip ?? serverIp). Stored in session metadata, not in admin table.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;
  };

  /**
   * Lightweight summary of an administrator account for use in administrative lists and review interfaces. Provides essential identification and timestamp information while excluding sensitive security data.
   */
  export type ISummary = {
    /**
     * Unique identifier for the administrator account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_admins.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Administrator's email address for authentication and communication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from community_platform_admins.email. Unique constraint.
     */
    email: string & tags.Format<"email">;

    /**
     * Timestamp when the administrator account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from community_platform_admins.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the administrator account was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from community_platform_admins.updated_at.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the administrator account was soft-deleted, null if active.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from community_platform_admins.deleted_at. Nullable field indicates soft deletion timestamp.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };

  /**
   * Request body for refreshing administrator authentication tokens. Provides a refresh token previously issued during login or previous refresh operation to obtain new access and refresh tokens for continued API access.
   */
  export type IRefresh = {
    /**
     * JWT refresh token previously issued during authentication. Used to obtain new access and refresh tokens without requiring re-authentication.
     *
     * @x-autobe-database-schema-property refresh_token
     * @x-autobe-specification Direct mapping from community_platform_admin_session_tokens.refresh_token. JWT refresh token string that must be validated for existence, non-expiry, and association with an active admin session and account.
     */
    refresh_token: string;
  };
}
