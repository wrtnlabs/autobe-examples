import { tags } from "typia";

export namespace IShoppingMallCustomerSession {
  /**
   * Detailed metadata of an active customer authentication session. Includes IP address, referrer URL, and timestamps to support security auditing, session monitoring, and fraud detection. This is a snapshot of the session context at retrieval time and never modified after creation. All fields are essential for tracing session origin and authenticity.
   */
  export type IDetail = {
    /**
     * Unique identifier for the authentication session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.id. Guaranteed unique UUID.
     */
    id: string & tags.Format<"uuid">;

    /**
     * ID of the customer who owns this authentication session.
     *
     * @x-autobe-database-schema-property shopping_mall_customer_id
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.shopping_mall_customer_id. References shopping_mall_customers.id.
     */
    shopping_mall_customer_id: string & tags.Format<"uuid">;

    /**
     * Client's IP address when the session was initiated.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.ip. Captured at login time.
     */
    ip: string;

    /**
     * URL of the page where the customer initiated login.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.href. Captured from the browser's document.location.href.
     */
    href: string;

    /**
     * The previous web page URL from which the user arrived at the login page.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.referrer. Captured from the HTTP Referer header.
     */
    referrer: string;

    /**
     * Date and time when the authentication session was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.created_at. Timestamp when the session was created.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Date and time when this authentication session expires.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.expired_at. Token expiration timestamp with 30-minute access or 30-day refresh.
     */
    expired_at: string & tags.Format<"date-time">;
  };

  /**
   * Request parameters for filtering and paginating authentication sessions across all actor types (customer, seller, admin). Used for security auditing, session management, and system monitoring. Filters session records by type, status, and token issuance/expiry time ranges.
   */
  export type IRequest = {
    /**
     * Type of actor whose authentication session is being filtered: customer, seller, or admin. Used to scope session queries across all user roles in security audit contexts.
     *
     * @x-autobe-specification Maps to the actor_type discriminator inferred from the joined user table (customer, seller, or admin). Derived from the session token's originating actor context, not a direct column.
     */
    actor_type?: "customer" | "seller" | "admin" | undefined;

    /**
     * The current state of the authentication session: active, expired, or invalidated. Used for filtering sessions by their viability for ongoing use. Derived from token expiration and explicit invalidation events, not stored as a direct status field.
     *
     * @x-autobe-specification Derived from comparison of current time with expired_at field: active (expired_at > now), expired (expired_at <= now and not invalidated), invalidated (explicit logout or security event). No direct column in db, computed from expiration timestamp and session state.
     */
    status?: "active" | "expired" | "invalidated" | undefined;

    /**
     * Time range filter for searching sessions issued between two timestamps. Used to audit authentication events within a defined period (e.g., last 24 hours). Uses created_at column under the hood.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Queries sessions based on token issuance timestamp (created_at) within a time range. Filters records where created_at is within the min and max provided, enabling audit of sessions created in specific time windows.
     */
    token_issued_at_range?:
      | {
          min: string & tags.Format<"date-time">;
          max: string & tags.Format<"date-time">;
        }
      | undefined;

    /**
     * Time range filter for searching sessions that expire between two timestamps. Used to identify active sessions nearing expiration or to find expired sessions for cleanup. Uses expired_at column under the hood.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Queries sessions based on token expiration timestamp (expired_at) within a time range. Filters records where expired_at is within the min and max provided, enabling identification of sessions that will expire soon or have already expired.
     */
    token_expires_at_range?:
      | {
          min: string & tags.Format<"date-time">;
          max: string & tags.Format<"date-time">;
        }
      | undefined;

    /**
     * The page number (1-indexed) of results to retrieve. Used for client-side pagination of large session reports. Page 1 returns the first set of results as defined by limit.
     *
     * @x-autobe-specification Pagination control parameter. Specifies the 1-indexed page number to return, used with limit to offset results for efficient large dataset traversal. Does not map to any database column.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of session records to return in a single response. Defaults to 100 if not provided. Used for controlling network payload size and improving response latency.
     *
     * @x-autobe-specification Pagination control parameter. Defines the maximum number of session records to return per page. Used with page to implement cursor-based pagination. Does not correspond to any database column.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Summary representation of a customer's authentication session. Contains immutable metadata captured at login including client IP, referrer URL, and session timestamps. For security, all authentication tokens and credentials are excluded. Used in session management dashboards to audit user login activity.
   */
  export type ISummary = {
    /**
     * Unique identifier for the authentication session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.id. Primary key for the session record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Email address of the customer who initiated this session.
     *
     * @x-autobe-database-schema-property customer
     * @x-autobe-specification Join from shopping_mall_customer_sessions.shopping_mall_customer_id to shopping_mall_customers.email. Returns the customer's email address.
     */
    email: string & tags.Format<"email">;

    /**
     * IP address of the client device at the time of session creation.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.ip. Captured at login time.
     */
    ip: string & tags.Format<"ipv4">;

    /**
     * URL of the page from which the customer initiated login.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.href. The URL of the page where login occurred.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL (the previous page) that directed the customer to the login page.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.referrer. The browser's referrer header value at login time.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Timestamp when the authentication session was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.created_at. Timestamp when the session was established.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the session expires, determining token validity.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.expired_at. Always set to 30 minutes after created_at for access token or 30 days for refresh token.
     */
    expired_at: string & tags.Format<"date-time">;
  };
}
