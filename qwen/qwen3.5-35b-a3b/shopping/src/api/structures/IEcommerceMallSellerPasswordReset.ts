import { tags } from "typia";

export namespace IEcommerceMallSellerPasswordReset {
  /**
   * Summary representation of a seller password reset request for use in paginated lists.
   *
   * This lightweight DTO provides essential information for browsing password recovery requests: the unique request identifier, the seller's email address, and timestamps for when the request was created and when the token expires.
   *
   * Used in list operations such as the admin password reset audit endpoint, this summary type is optimized for performance while maintaining sufficient information for review and filtering.
   */
  export type ISummary = {
    /**
     * Unique identifier for the password reset request.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_password_resets.id (UUID primary key).
     */
    id: string & tags.Format<"uuid">;

    /**
     * Email address of the seller who requested password reset.
     *
     * @x-autobe-database-schema-property seller
     * @x-autobe-specification JOIN via seller_id to ecommerce_mall_sellers.email. Returns seller email address for actor identification.
     */
    email: string & tags.Format<"email">;

    /**
     * Timestamp when the password reset token becomes invalid.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_password_resets.expired_at (timestamp when token expires).
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the password reset request was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_seller_password_resets.created_at (timestamp when request was initiated).
     */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Request body for paginated listing of password reset requests. Supports filtering by actor type, request status, email address, and creation date range. Includes pagination and sorting parameters for efficient data retrieval.
   */
  export type IRequest = {
    /**
     * Page number for pagination, starting from 1
     *
     * @x-autobe-specification Page number for cursor-based pagination (1-indexed). Must be >= 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of records per page (max 100)
     *
     * @x-autobe-specification Maximum number of records per page (1-100). Controls result set size.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Search query for pattern matching on email and other fields
     *
     * @x-autobe-specification Text search query for pattern matching across email and other searchable fields using LIKE operators.
     */
    search?: (string & tags.MaxLength<100>) | undefined;

    /**
     * Field to sort results by
     *
     * @x-autobe-specification Field to sort results by. Valid values: createdAt (primary default), expiredAt, requestStatus, actorType, email. Maps to database column ordering.
     */
    sort?:
      | "createdAt"
      | "expiredAt"
      | "requestStatus"
      | "actorType"
      | "email"
      | undefined;

    /**
     * Sort order (ascending or descending), defaults to desc
     *
     * @x-autobe-specification Sort direction: asc (ascending) or desc (descending). Defaults to desc if not specified.
     */
    sortOrder?: "asc" | "desc" | undefined;

    /**
     * Filter by actor type who requested password reset
     *
     * @x-autobe-specification Filter by actor type of the seller who requested password reset. Values: customer, seller, admin. Determined by JOIN with actor tables.
     */
    actorType?: "customer" | "seller" | "admin" | undefined;

    /**
     * Filter by password reset request status
     *
     * @x-autobe-specification Filter by password reset request status. Values: pending (awaiting use), used (token consumed), expired (past expiration). Maps directly to request_status column.
     */
    requestStatus?: "pending" | "used" | "expired" | undefined;

    /**
     * Email address for pattern matching filter
     *
     * @x-autobe-specification Email address pattern filter for seller who requested reset. Pattern matched against seller.email via JOIN with ecommerce_mall_sellers table.
     */
    email?: (string & tags.MaxLength<255> & tags.Format<"email">) | undefined;

    /**
     * Filter password reset requests created after this timestamp
     *
     * @x-autobe-specification Lower bound for createdAt timestamp filtering. Returns records where created_at >= this value. ISO 8601 date-time format.
     */
    createdAtFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter password reset requests created before this timestamp
     *
     * @x-autobe-specification Upper bound for createdAt timestamp filtering. Returns records where created_at <= this value. ISO 8601 date-time format.
     */
    createdAtTo?: (string & tags.Format<"date-time">) | undefined;
  };
}
