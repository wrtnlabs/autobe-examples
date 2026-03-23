import { tags } from "typia";

export namespace IEcommerceMallDashboard {
  /**
   * Request parameters for filtering seller dashboard statistics and pagination.
   */
  export type IRequest = {
    /**
     * Start datetime for filtering creation timestamps.
     *
     * @x-autobe-specification Filter for creation date range start. Used to filter seller's products and order items by creation timestamp.
     */
    createdAt_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End datetime for filtering creation timestamps.
     *
     * @x-autobe-specification Filter for creation date range end. Used to filter seller's products and order items by creation timestamp.
     */
    createdAt_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Category identifier to filter products.
     *
     * @x-autobe-specification Filter by product category ID. Matches ecommerce_mall_products.category_id.
     */
    category_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Order item status to filter.
     *
     * @x-autobe-specification Filter by order item status (paid|shipped|delivered|cancelled|refunded). Matches ecommerce_mall_order_items.item_status.
     */
    item_status?:
      | "paid"
      | "shipped"
      | "delivered"
      | "cancelled"
      | "refunded"
      | undefined;

    /**
     * Page number for paginated results.
     *
     * @x-autobe-specification Pagination page number for result sets.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Maximum number of items per page.
     *
     * @x-autobe-specification Pagination limit for maximum items per page.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;
  };

  /**
   * Seller dashboard summary statistics for business performance monitoring.
   */
  export type ISummary = {
    /**
     * Total count of active products created by the seller.
     *
     * @x-autobe-specification COUNT(*) of non-deleted products per seller. Join ecommerce_mall_products WHERE seller_id matches authenticated seller AND deleted_at IS NULL.
     */
    totalProducts: number & tags.Type<"int32">;

    /**
     * Count of pending cancellation requests awaiting seller response.
     *
     * @x-autobe-specification COUNT(*) of pending cancellation requests per seller. Join ecommerce_mall_cancellation_requests WHERE seller_id matches authenticated seller AND status = 'pending'.
     */
    pendingCancellationRequests: number & tags.Type<"int32">;

    /**
     * Count of pending refund requests awaiting seller response.
     *
     * @x-autobe-specification COUNT(*) of pending refund requests per seller. Join ecommerce_mall_refund_requests WHERE seller_id matches authenticated seller AND status = 'pending'.
     */
    pendingRefundRequests: number & tags.Type<"int32">;

    /**
     * Total number of order items sold by the seller.
     *
     * @x-autobe-specification COUNT(*) of all order items per seller. Join ecommerce_mall_order_items WHERE seller_id matches authenticated seller.
     */
    totalOrderItemsSold: number & tags.Type<"int32">;
  };
}
