import { tags } from "typia";

export namespace IEcommerceMallSellerDashboard {
  /**
   * Dashboard summary containing aggregated statistics for the seller's shop performance.
   *
   * Returns four key metrics: totalProducts shows how many active products the seller has listed; totalOrderItems shows the total count of order items across all orders containing the seller's products; pendingCancellationRequests shows cancellation requests awaiting seller response; pendingRefundRequests shows refund requests awaiting seller response.
   *
   * All counts default to 0 when no matching records exist.
   */
  export type IResult = {
    /**
     * Count of active products listed by the seller.
     *
     * Represents the total number of products the seller has published that are not soft-deleted. Only products with null deleted_at timestamp are counted.
     *
     * @x-autobe-specification COUNT(ecommerce_mall_products) WHERE ecommerce_mall_seller_id = authenticated_seller_id AND deleted_at IS NULL. Counts only active (non-deleted) products owned by the authenticated seller. Returns 0 if no active products exist.
     */
    totalProducts: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Count of all order items containing the seller's products across all orders.
     *
     * Aggregates order items from all completed and in-progress orders that contain the seller's products. Includes items with any status.
     *
     * @x-autobe-specification COUNT(ecommerce_mall_order_items) via JOIN ecommerce_mall_products ON ecommerce_mall_order_items.product_id = ecommerce_mall_products.id WHERE ecommerce_mall_products.ecommerce_mall_seller_id = authenticated_seller_id. Counts all order items regardless of order status (includes paid, shipped, delivered, cancelled, refunded items).
     */
    totalOrderItems: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Count of cancellation requests with 'pending' status requiring seller action.
     *
     * Tracks customer-initiated cancellation requests for order items that are awaiting seller approval or rejection. Only requests with status 'pending' are counted.
     *
     * @x-autobe-specification COUNT(ecommerce_mall_cancellation_requests) WHERE ecommerce_mall_seller_id = authenticated_seller_id AND status = 'pending'. Only counts cancellation requests with status 'pending' awaiting seller approval or rejection. Returns 0 if no pending cancellation requests exist.
     */
    pendingCancellationRequests: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Count of refund requests with 'pending' status requiring seller action.
     *
     * Tracks customer-initiated refund requests for delivered order items that are awaiting seller approval or rejection. Only requests with status 'pending' are counted.
     *
     * @x-autobe-specification COUNT(ecommerce_mall_refund_requests) WHERE ecommerce_mall_seller_id = authenticated_seller_id AND status = 'pending'. Only counts refund requests with status 'pending' awaiting seller approval or rejection. Returns 0 if no pending refund requests exist.
     */
    pendingRefundRequests: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
