import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";
import { IShoppingMallSellerProfile } from "./IShoppingMallSellerProfile";

export namespace IShoppingMallSeller {
  /**
   * Request body for refreshing seller authentication tokens. Contains the JWT refresh token used to obtain a new access and refresh token pair without re-entering credentials. The refresh token must be valid and associated with an active seller session.
   */
  export type IRefresh = {
    /**
     * JWT refresh token for obtaining new authentication tokens. Must be valid and associated with an active seller session that has not expired.
     *
     * @x-autobe-specification JWT refresh token string. Server validates token signature, extracts seller_id from payload, queries shopping_mall_seller_sessions table checking expired_at is in future and seller deleted_at is null. Token is not stored in database - it's a signed JWT validated against session records.
     */
    refresh_token: string;
  };

  /**
   * Seller login credentials for authentication. Contains the seller's registered email address and password for identity verification, along with session context information (page URL, referrer URL, and optionally IP address) for security tracking and session management.
   */
  export type ILogin = {
    /**
     * Seller's registered email address for account identification.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from shopping_mall_sellers.email. Used to look up seller account. Must match unique email column exactly.
     */
    email: string & tags.Format<"email">;

    /**
     * Seller's account password for authentication.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Maps to shopping_mall_sellers.password_hash. Plain text password is compared against stored bcrypt hash using bcrypt.compare(). Password is never stored, only the hash.
     */
    password: string;

    /**
     * URL of the page where the login was initiated, used for session tracking.
     *
     * @x-autobe-specification Session context field stored in shopping_mall_seller_sessions table upon successful authentication. Represents the page URL where login was initiated. Not stored in shopping_mall_sellers table.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL from which the login request originated, used for session tracking.
     *
     * @x-autobe-specification Session context field stored in shopping_mall_seller_sessions table upon successful authentication. Represents the referrer URL. Not stored in shopping_mall_sellers table.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for session security tracking. Optional as server may capture it automatically.
     *
     * @x-autobe-specification Optional session context field stored in shopping_mall_seller_sessions table upon successful authentication. Represents client IP address. In SSR contexts, server captures IP as fallback if not provided. Not stored in shopping_mall_sellers table.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Lightweight seller account summary for administrative list views. Includes seller ID, email address, account creation timestamp, and current approval status (pending, approved, or rejected) derived from the most recent seller approval request.
   */
  export type ISummary = {
    /**
     * Unique identifier for the seller account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_sellers.id. UUID format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Seller's email address used for authentication and communication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from shopping_mall_sellers.email. Unique constraint enforced at database level.
     */
    email: string & tags.Format<"email">;

    /**
     * Timestamp when the seller account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from shopping_mall_sellers.created_at. Timestamp with timezone.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Current seller approval status: pending (awaiting review), approved (can list products), or rejected (registration denied).
     *
     * @x-autobe-specification Computed from latest shopping_mall_seller_approval_requests per seller. Query: SELECT approval_status FROM shopping_mall_seller_approval_requests WHERE seller_id = ? ORDER BY submitted_at DESC LIMIT 1. Default to 'pending' if no approval requests exist.
     */
    approval_status: "pending" | "approved" | "rejected";
  };

  /**
   * Query parameters for filtering and paginating seller accounts in administrative views. Supports email search, approval status filtering, account creation date range, pagination controls, and sorting options. Used by administrators and super administrators to browse and manage seller accounts.
   */
  export type IRequest = {
    /**
     * Partial match filter for seller email address. Searches for sellers whose email contains the provided substring.
     *
     * @x-autobe-specification Query parameter for email partial match filtering. Translates to SQL: WHERE email ILIKE '%{search}%'. Server applies this filter on shopping_mall_sellers.email column. Optional parameter - if omitted, no email filtering applied.
     */
    search?: string | undefined;

    /**
     * Filter by seller approval status. Shows only sellers with the specified approval status (pending, approved, or rejected).
     *
     * @x-autobe-specification Query parameter for approval status filtering. Requires JOIN with shopping_mall_seller_approval_requests to get latest approval status per seller. Uses subquery: SELECT status FROM shopping_mall_seller_approval_requests WHERE seller_id = s.id ORDER BY submitted_at DESC LIMIT 1. Filters by exact match: pending, approved, or rejected. Optional parameter - if omitted, returns sellers with any status.
     */
    status?: "pending" | "approved" | "rejected" | undefined;

    /**
     * Filter sellers created on or after this datetime. ISO 8601 format (e.g., 2024-01-01T00:00:00Z).
     *
     * @x-autobe-specification Query parameter for filtering sellers created on or after this datetime. Translates to SQL: WHERE created_at >= {created_at_from}. Applied on shopping_mall_sellers.created_at column. Optional parameter - if omitted, no lower bound on creation date.
     */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sellers created on or before this datetime. ISO 8601 format (e.g., 2024-12-31T23:59:59Z).
     *
     * @x-autobe-specification Query parameter for filtering sellers created on or before this datetime. Translates to SQL: WHERE created_at <= {created_at_to}. Applied on shopping_mall_sellers.created_at column. Optional parameter - if omitted, no upper bound on creation date.
     */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for pagination (1-indexed). Defaults to page 1 if not specified.
     *
     * @x-autobe-specification Pagination parameter for page number (1-indexed). Defaults to 1 if not provided. Minimum value is 1. Used with limit parameter to calculate OFFSET: OFFSET (page - 1) * limit. Server validates and bounds-checks this value.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of results per page. Must be between 1 and 100. Controls page size for pagination.
     *
     * @x-autobe-specification Pagination parameter for number of results per page. Minimum 1, maximum 100. Defaults to server default (typically 20) if not provided. Used with page parameter to calculate LIMIT and OFFSET. Server enforces maximum limit of 100 to prevent excessive query load.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Sort order for results. Options: created_at_DESC (newest first), email_ASC (alphabetical), email_DESC (reverse alphabetical). Defaults to newest first.
     *
     * @x-autobe-specification Sorting parameter controlling result order. Supported values: created_at_DESC (default, newest first), email_ASC (alphabetical A-Z), email_DESC (alphabetical Z-A). Translates to SQL ORDER BY clause. Defaults to created_at_DESC if not provided.
     */
    sort?: "created_at_DESC" | "email_ASC" | "email_DESC" | undefined;
  };

  /**
   * Complete seller account information with shop profile. Includes authentication account details (id, email, timestamps) and nested shop profile containing shop name, description, and logo image. Used for seller account review during approval process and for customers viewing seller shop information.
   */
  export type IInvert = {
    id: string & tags.Format<"uuid">;
    email: string & tags.Format<"email">;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
    deleted_at: (string & tags.Format<"date-time">) | null;
    profile: IShoppingMallSellerProfile;
  };

  /**
   * Authentication response containing seller identity and JWT tokens. Returned upon successful seller registration, login, or token refresh. Includes the seller's unique identifier and authentication tokens for session management.
   */
  export type IAuthorized = {
    /**
     * Seller's unique identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_sellers.id. UUID format. Identifies the authenticated seller account.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for registering a new seller account on the shopping mall platform. Contains email for authentication and communication, password for account security (will be hashed with bcrypt), and session context information (href, referrer, and optionally ip) for tracking the registration source. Email must be unique across all seller accounts. Password must meet security requirements including minimum length and complexity.
   */
  export type IJoin = {
    /**
     * Unique email address for seller authentication and communication. Must be valid email format and not already registered.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from shopping_mall_sellers.email. Backend validates email format, uniqueness across all sellers, and stores as-is. Used for authentication and communication.
     */
    email: string & tags.Format<"email">;

    /**
     * Account password for authentication. Will be hashed using bcrypt before storage. Must meet security requirements including minimum length and complexity.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Maps to shopping_mall_sellers.password_hash. Backend hashes the provided password using bcrypt before storage. Password must meet security requirements (minimum length, complexity). Never stored or returned in plain text.
     */
    password: string & tags.Format<"password">;

    /**
     * URL of the page where the seller initiated registration. Used for tracking registration source and session audit.
     *
     * @x-autobe-specification Computed property: current page URL where registration was initiated. Not stored in shopping_mall_sellers table. Captured for session tracking and stored in shopping_mall_seller_sessions. Required for self-authentication audit trail.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL indicating the source that led the seller to the registration page. Used for tracking user journey and session audit.
     *
     * @x-autobe-specification Computed property: referrer URL (HTTP Referer header) indicating how the user arrived at the registration page. Not stored in shopping_mall_sellers table. Captured for session tracking and stored in shopping_mall_seller_sessions. Required for self-authentication audit trail.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address at registration time. Optional field used for session tracking and security monitoring. If not provided, server will capture it automatically.
     *
     * @x-autobe-specification Computed property: client IP address at registration time. Not stored in shopping_mall_sellers table. Optional in request body (format: ipv4) because in SSR the server captures it as fallback (body.ip ?? serverIp). Stored in shopping_mall_seller_sessions for session audit and security monitoring.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };
}
