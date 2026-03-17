import { tags } from "typia";

export namespace IShoppingMallSellerSession {
  /**
   * Request parameters for filtering and paginating authentication session history. Allows users to search sessions by active/expired status, date ranges, and control pagination and sorting of results.
   */
  export type IRequest = {
    /**
     * Page number for pagination, starting from 1.
     *
     * @x-autobe-specification Pagination page number (1-indexed). Used to calculate OFFSET: (page - 1) * limit. Defaults to 1 if not provided.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page, maximum 100.
     *
     * @x-autobe-specification Maximum number of records per page. Used to calculate LIMIT clause. Defaults to 20, maximum 100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter sessions by status: 'active' (not expired) or 'expired'.
     *
     * @x-autobe-specification Filter sessions by computed status: 'active' means expired_at > NOW(), 'expired' means expired_at <= NOW(). Translates to WHERE clause on expired_at column.
     */
    status?: "active" | "expired" | undefined;

    /**
     * Filter sessions created on or after this date-time.
     *
     * @x-autobe-specification Filter sessions by created_at >= dateFrom. Nullable - if null, no lower bound on created_at. Maps to WHERE created_at >= ? clause.
     */
    dateFrom?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Filter sessions created on or before this date-time.
     *
     * @x-autobe-specification Filter sessions by created_at <= dateTo. Nullable - if null, no upper bound on created_at. Maps to WHERE created_at <= ? clause.
     */
    dateTo?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Sort order in 'field,order' format (e.g., 'created_at,desc'). Defaults to 'created_at,desc'.
     *
     * @x-autobe-specification Sort order in 'field,order' format (e.g., 'created_at,desc' or 'created_at,asc'). Defaults to 'created_at,desc'. Translates to ORDER BY clause. Only created_at field is supported.
     */
    sort?: string | undefined;
  };

  /**
   * Session summary for seller list displays. Provides essential session information for sellers to monitor their login history and identify potentially unauthorized access. Includes IP address, login time, expiration time, and current active status. Used in paginated session history views for security monitoring.
   */
  export type ISummary = {
    /**
     * Unique identifier for the seller session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_seller_sessions.id. UUID format.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Client IP address at the time of session creation.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from shopping_mall_seller_sessions.ip. Client IP at session creation for security auditing.
     */
    ip: string;

    /**
     * Timestamp when the session was created (login time).
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from shopping_mall_seller_sessions.created_at. Session creation timestamp.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the session expires and becomes invalid.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from shopping_mall_seller_sessions.expired_at. Session expiration timestamp for security enforcement.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * Indicates whether the session is currently active (not expired).
     *
     * @x-autobe-specification Computed field: isActive = (expired_at > current_timestamp). Returns true if session has not yet expired.
     */
    isActive: boolean;
  };
}
