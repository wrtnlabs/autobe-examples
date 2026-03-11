import { tags } from "typia";

export namespace IEcommerceMallOrderAnalytic {
  /**
   * Request body parameters for filtering and paginating order lifecycle analytics data. Accepts date range filters, order status filter, and pagination controls to query aggregated order metrics from the ecommerce_mall_orders table.
   */
  export type IRequest = {
    /**
     * Optional lower bound for order creation date range filter. Orders created on or after this timestamp will be included.
     *
     * @x-autobe-specification Query filter: WHERE created_at >= fromDate. Format: ISO 8601 date-time (e.g., '2024-01-01T00:00:00Z'). Optional parameter - if omitted, no date filtering is applied.
     */
    fromDate?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for pagination (1-indexed). Controls which subset of results to return.
     *
     * @x-autobe-specification Pagination parameter: which page of results to return (1-indexed). Used in OFFSET calculation: (page - 1) * pageSize. Defaults to 1 if omitted or invalid.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of results to return per page. Must be between 1 and 100. Controls pagination granularity.
     *
     * @x-autobe-specification Pagination parameter: number of results per page (1-100). Used in SELECT with LIMIT clause. Defaults to 20 if omitted. Maximum enforced: 100 to prevent excessive resource consumption.
     */
    pageSize?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter orders by their lifecycle status. Limits results to orders in the specified state.
     *
     * @x-autobe-specification Query filter: WHERE overall_status = status. Valid values: 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'. Optional parameter - if omitted, all statuses are included.
     */
    status?:
      | "paid"
      | "shipped"
      | "delivered"
      | "cancelled"
      | "refunded"
      | undefined;

    /**
     * Optional upper bound for order creation date range filter. Orders created on or before this timestamp will be included.
     *
     * @x-autobe-specification Query filter: WHERE created_at <= toDate. Format: ISO 8601 date-time (e.g., '2024-12-31T23:59:59Z'). Optional parameter - if omitted, no upper date limit is applied.
     */
    toDate?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Maximum number of records to return per page. Defaults to 100 if not provided or null.
     *
     * @x-autobe-specification Query parameter: maximum number of records to return (optional override for pageSize). If null, omitted, or undefined, defaults to 100. Alternative pagination control mechanism.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Aggregated order lifecycle analytics metrics with pagination metadata. This response type provides a summary of orders distributed across different lifecycle stages (paid, shipped, delivered, cancelled, refunded) for efficient dashboard display and reporting. Contains count metrics per status and pagination information for large result sets.
   */
  export type ISummary = {
    /**
     * Pagination metadata containing current page position and total data count.
     *
     * @x-autobe-specification Computed pagination metadata. page and pageSize reflect request parameters. totalItems = count of orders matching filters. totalPages = ceil(totalItems / pageSize). All values are non-negative integers calculated by the server.
     */
    pagination: {
      page: number & tags.Type<"int32">;
      pageSize: number & tags.Type<"int32">;
      totalItems: number & tags.Type<"int32">;
      totalPages: number & tags.Type<"int32">;
    };

    /**
     * Order lifecycle metrics including counts per status (paid, shipped, delivered, cancelled, refunded) and total order count.
     *
     * @x-autobe-specification Computed order lifecycle metrics aggregated from ecommerce_mall_orders table. Each field counts orders by their overall_status: ordersCreated (paid), ordersShipped (shipped), ordersDelivered (delivered), ordersCancelled (cancelled), ordersRefunded (refunded), totalOrders (all statuses). Values are calculated using SQL aggregate functions with optional filtering by date range and status.
     */
    data: {
      ordersCreated: number & tags.Type<"int32">;
      ordersShipped: number & tags.Type<"int32">;
      ordersDelivered: number & tags.Type<"int32">;
      ordersCancelled: number & tags.Type<"int32">;
      ordersRefunded: number & tags.Type<"int32">;
      totalOrders: number & tags.Type<"int32">;
    };
  };
}
