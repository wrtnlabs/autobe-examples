import { tags } from "typia";

export namespace IEcommerceMallSellerPasswordReset {
  /**
   * Summary view of a seller password reset token for administrative listing and audit purposes.
   */
  export type ISummary = {
    /**
     * Unique identifier for the password reset token.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_password_resets.id (UUID primary key).
     */
    id: string & tags.Format<"uuid">;

    /**
     * Reference to the seller who requested the password reset.
     *
     * @x-autobe-database-schema-property seller_id
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_password_resets.seller_id (UUID foreign key).
     */
    sellerId: string & tags.Format<"uuid">;

    /**
     * Secure password reset token string used for authentication recovery.
     *
     * @x-autobe-database-schema-property token
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_password_resets.token (String, unique).
     */
    token: string;

    /**
     * Timestamp when the password reset token becomes invalid.
     *
     * @x-autobe-database-schema-property expires_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_password_resets.expires_at (DateTime with timezone).
     */
    expiresAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the password reset token was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_password_resets.created_at (DateTime with timezone).
     */
    createdAt: string & tags.Format<"date-time">;
  };

  /**
   * Request body for filtering and paginating password reset tokens across all actor types. Supports filtering by actor type, token validity status, and creation date range with pagination and sorting options.
   */
  export type IRequest = {
    /**
     * Actor type filter to narrow results to specific user type (customer, seller, admin, superAdmin). Null returns all actor types.
     *
     * @x-autobe-specification Filter parameter. Values: 'customer', 'seller', 'admin', 'superAdmin', or null (all). When specified, query only the corresponding password reset table. When null, query across all actor types and union results.
     */
    actorType?:
      | "customer"
      | "seller"
      | "admin"
      | "superAdmin"
      | null
      | undefined;

    /**
     * Token status filter. 'valid' returns non-expired tokens, 'expired' returns expired tokens, null returns all.
     *
     * @x-autobe-specification Computed filter on token expiration. 'valid': expires_at >= NOW(), 'expired': expires_at < NOW(), null: no filter. Applied as SQL condition on expires_at column.
     */
    status?: "valid" | "expired" | null | undefined;

    /**
     * Start of creation date range filter. Filters tokens created on or after this datetime.
     *
     * @x-autobe-specification Filter parameter. When provided, filters records where created_at >= startDate. Used in combination with endDate for date range queries. Format: ISO 8601 datetime.
     */
    startDate?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * End of creation date range filter. Filters tokens created on or before this datetime.
     *
     * @x-autobe-specification Filter parameter. When provided, filters records where created_at <= endDate. Used in combination with startDate for date range queries. Format: ISO 8601 datetime.
     */
    endDate?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Page number for pagination (1-indexed). Controls which page of results to return.
     *
     * @x-autobe-specification Pagination parameter. 1-indexed page number. Default: 1. Used with limit to calculate OFFSET for SQL query: OFFSET = (page - 1) * limit.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | null | undefined;

    /**
     * Maximum number of records to return per page (1-100).
     *
     * @x-autobe-specification Pagination parameter. Number of records per page. Min: 1, Max: 100. Used in SQL LIMIT clause. Default: typically 10 or 20.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | null
      | undefined;

    /**
     * Sort order for results. Options by creation time or expiration time, ascending or descending.
     *
     * @x-autobe-specification Sorting parameter. Determines SQL ORDER BY clause. 'createdAt_DESC': created_at DESC, 'createdAt_ASC': created_at ASC, 'expiresAt_DESC': expires_at DESC, 'expiresAt_ASC': expires_at ASC. Default: createdAt_DESC.
     */
    sort?:
      | "createdAt_DESC"
      | "createdAt_ASC"
      | "expiresAt_DESC"
      | "expiresAt_ASC"
      | null
      | undefined;
  };
}
