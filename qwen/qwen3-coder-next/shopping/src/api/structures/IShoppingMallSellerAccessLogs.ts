import { tags } from "typia";

import { IShoppingMallSeller } from "./IShoppingMallSeller";

export namespace IShoppingMallSellerAccessLogs {
  /**
   * Seller access log summary for audit dashboards and compliance reporting.
   */
  export type ISummary = {
    /**
     * Unique identifier for the access log entry.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_seller_access_logs.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * IP address from which the seller accessed the system.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from shopping_mall_seller_access_logs.ip.
     */
    ip: string & tags.Format<"ipv4">;

    /**
     * HTTP referrer header value showing the previous page URL (optional).
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from shopping_mall_seller_access_logs.referrer.
     */
    referrer?: string | null | undefined;

    /**
     * HTTP user agent string identifying the client application (optional).
     *
     * @x-autobe-database-schema-property user_agent
     * @x-autobe-specification Direct mapping from shopping_mall_seller_access_logs.user_agent.
     */
    userAgent?: string | null | undefined;

    /**
     * Geolocation data about the access location (optional).
     *
     * @x-autobe-database-schema-property geolocation
     * @x-autobe-specification Direct mapping from shopping_mall_seller_access_logs.geolocation.
     */
    geolocation?: string | null | undefined;

    /**
     * Whether the login attempt was successful or failed.
     *
     * @x-autobe-database-schema-property success
     * @x-autobe-specification Direct mapping from shopping_mall_seller_access_logs.success.
     */
    success: boolean;

    /**
     * Timestamp when this access log was created (login time or failed attempt time).
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from shopping_mall_seller_access_logs.created_at.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * The seller who accessed the system.
     *
     * @x-autobe-database-schema-property seller
     * @x-autobe-specification Join from shopping_mall_seller_access_logs.seller_id to shopping_mall_sellers.id. Returns ISummary.
     */
    seller: IShoppingMallSeller.ISummary;
  };

  /**
   * Request parameters for querying seller access logs with filtering, pagination, and sorting capabilities.
   */
  export type IRequest = {
    /**
     * Seller's unique identifier for filtering access logs
     *
     * @x-autobe-database-schema-property seller_id
     * @x-autobe-specification Direct mapping from shopping_mall_seller_access_logs.seller_id. UUID for seller identification.
     */
    seller_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Start of date range filter (inclusive)
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Start of date range filter for created_at column (inclusive). Maps to >= created_at condition.
     */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End of date range filter (inclusive)
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification End of date range filter for created_at column (inclusive). Maps to <= created_at condition.
     */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter by login success status
     *
     * @x-autobe-database-schema-property success
     * @x-autobe-specification Direct mapping from shopping_mall_seller_access_logs.success. Boolean for login success status.
     */
    success?: boolean | undefined;

    /**
     * Filter by IP address (partial match)
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Partial match filter for ip column using LIKE operator.
     */
    ip?: string | undefined;

    /**
     * Page number for pagination
     *
     * @x-autobe-specification Pagination parameter. Page number for result set (1-indexed). Defaults to 1.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Number of items per page
     *
     * @x-autobe-specification Pagination parameter. Maximum records per page (1-100). Defaults to 20.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;

    /**
     * Sort field with optional minus for descending order
     *
     * @x-autobe-specification Sort parameter. Accepts 'created_at' for ascending or '-created_at' for descending. Defaults to descending (newest first).
     */
    sort?: "created_at" | "-created_at" | undefined;
  };
}
