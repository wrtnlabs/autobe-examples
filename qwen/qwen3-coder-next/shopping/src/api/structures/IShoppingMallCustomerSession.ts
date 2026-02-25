import { tags } from "typia";

export namespace IShoppingMallCustomerSession {
  /**
   * Lightweight session summary for display in session lists and management interfaces.
   */
  export type ISummary = {
    /**
     * Unique session identifier for the customer session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.id (UUID primary key).
     */
    id: string & tags.Format<"uuid">;

    /**
     * JWT access token for authenticating API requests in this session.
     *
     * @x-autobe-database-schema-property access_token
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.access_token (JWT access token).
     */
    access_token: string;

    /**
     * JWT refresh token used to obtain new access tokens when they expire.
     *
     * @x-autobe-database-schema-property refresh_token
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.refresh_token (JWT refresh token).
     */
    refresh_token: string;

    /**
     * Timestamp when this session was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.created_at (session creation timestamp).
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this session will expire and become invalid.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.expired_at (session expiration timestamp).
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * IP address of the client that created this session.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.ip (client IP address).
     */
    ip: string;

    /**
     * Referrer URL of the client that created this session (null if direct navigation).
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.referrer (nullable referrer URL).
     */
    referrer: string | null;

    /**
     * Browser user agent string for session tracking and device identification (null if not captured).
     *
     * @x-autobe-database-schema-property user_agent
     * @x-autobe-specification Direct mapping from shopping_mall_customer_sessions.user_agent (nullable browser user agent string).
     */
    user_agent: string | null;
  };

  /**
   * Request parameters for filtering and paginating active customer login sessions.
   */
  export type IRequest = {
    /**
     * Page number for pagination (starts at 1).
     *
     * @x-autobe-specification Pagination page number (1-indexed). Minimum value is 1.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Maximum number of records to return per page (1-100).
     *
     * @x-autobe-specification Maximum number of records per page (1-100). Defaults to 20.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;

    /**
     * Filter sessions by exact IP address match.
     *
     * @x-autobe-specification Exact match filter for client IP address.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;

    /**
     * Filter sessions by user agent string (partial match).
     *
     * @x-autobe-specification Partial match filter for browser user agent string.
     */
    user_agent?: string | undefined;

    /**
     * Filter sessions created after this timestamp (inclusive).
     *
     * @x-autobe-specification Filter sessions created after this timestamp (inclusive).
     */
    created_at_min?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter sessions created before this timestamp (inclusive).
     *
     * @x-autobe-specification Filter sessions created before this timestamp (inclusive).
     */
    created_at_max?: (string & tags.Format<"date-time">) | undefined;
  };
}
