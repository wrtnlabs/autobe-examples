import { tags } from "typia";

export namespace IEcommerceMallSalesAnalytic {
  /**
   * Request parameters for filtering and paginating seller sales analytics data.
   *
   * Filters allow narrowing aggregated shop performance metrics by:
   * - Date range: Filter orders within startDate to endDate
   * - Product: Filter to analytics for a specific product only
   *
   * Pagination parameters control the number of records returned per page.
   */
  export type IRequest = {
    /**
     * Start date for filtering orders by creation date (inclusive). Orders created on or after this date will be included in analytics. ISO 8601 date format (YYYY-MM-DD).
     *
     * @x-autobe-specification ISO 8601 date string (YYYY-MM-DD). Filters orders WHERE created_at >= startDate. Used to restrict analytics to orders placed on or after this date. Optional - if not provided, no date filtering applied.
     */
    startDate?: (string & tags.Format<"date">) | undefined;

    /**
     * End date for filtering orders by creation date (inclusive). Orders created on or before this date will be included in analytics. ISO 8601 date format (YYYY-MM-DD).
     *
     * @x-autobe-specification ISO 8601 date string (YYYY-MM-DD). Filters orders WHERE created_at <= endDate. Used to restrict analytics to orders placed on or before this date. Optional - if not provided, no date filtering applied.
     */
    endDate?: (string & tags.Format<"date">) | undefined;

    /**
     * Filter analytics to a specific product only. Provides detailed metrics for the product identified by this UUID. If omitted, analytics include all products owned by the seller.
     *
     * @x-autobe-specification UUID string. Filters analytics to a specific product only. Backend will only count order items belonging to this product. Optional - if not provided, analytics covers all products for the seller.
     */
    productId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Page number for pagination (1-indexed). Returns the specified page of analytics results. Defaults to 1 if not provided.
     *
     * @x-autobe-specification 1-indexed integer. Page number being requested. Defaults to 1 if not provided. Used for pagination of the analytics summary response.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records per page (1-100). Controls how many analytics summary records appear on each page. Defaults to 20 if not provided.
     *
     * @x-autobe-specification Integer between 1 and 100. Maximum number of records to return per page. Defaults to 20 if not provided. Used for pagination of the analytics summary response.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Seller sales analytics summary showing aggregated shop performance metrics.
   *
   * This type represents computed statistics for a seller's dashboard, including the total number of products in their catalog, count of order items for their products, and the number of pending cancellation and refund requests awaiting their response.
   *
   * Use this summary type for dashboard displays and analytics views where aggregate metrics are needed rather than detailed entity information.
   */
  export type ISummary = {
    /**
     * Total number of products in the seller's catalog.
     *
     * @x-autobe-specification Computed via LEFT JOIN to ecommerce_mall_products filtered by authenticated seller_id. Returns COUNT(DISTINCT product.id) for all products owned by the seller. Returns 0 if seller has no products.
     */
    productCount: number & tags.Type<"int32">;

    /**
     * Total number of order items for the seller's products across all orders.
     *
     * @x-autobe-specification Computed via LEFT JOIN to ecommerce_mall_order_items filtered by authenticated seller_id (via product.seller_id). Returns COUNT(DISTINCT order_item.id) for all order items containing the seller's products. Returns 0 if no order items exist.
     */
    orderItemCount: number & tags.Type<"int32">;

    /**
     * Number of pending cancellation requests awaiting seller approval or rejection.
     *
     * @x-autobe-specification Computed via LEFT JOIN to ecommerce_mall_cancellation_requests filtered by authenticated seller_id and request_status = 'pending'. Returns COUNT(DISTINCT cancellation_request.id) for pending cancellation requests awaiting seller response. Returns 0 if no pending cancellations exist.
     */
    pendingCancellationCount: number & tags.Type<"int32">;

    /**
     * Number of pending refund requests awaiting seller approval or rejection.
     *
     * @x-autobe-specification Computed via LEFT JOIN to ecommerce_mall_refund_requests filtered by authenticated seller_id and request_status = 'pending'. Returns COUNT(DISTINCT refund_request.id) for pending refund requests awaiting seller response. Returns 0 if no pending refunds exist.
     */
    pendingRefundCount: number & tags.Type<"int32">;
  };
}
