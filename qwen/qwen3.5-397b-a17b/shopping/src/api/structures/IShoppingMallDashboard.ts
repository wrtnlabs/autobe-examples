import { tags } from "typia";

export namespace IShoppingMallDashboard {
  /**
   * Seller dashboard statistics showing pending cancellation and refund request counts requiring seller attention.
   *
   * This response provides real-time metrics for sellers to monitor their order management workload. The cancellationPendingCount represents the number of customer cancellation requests awaiting seller review. The refundPendingCount represents the number of customer refund requests awaiting seller review.
   *
   * Both counts reflect only requests for order items containing the seller's products with status 'pending'. When a seller approves or rejects a request, it is no longer included in the count.
   */
  export type ICancellationRefund = {
    /**
     * Number of customer cancellation requests awaiting seller review.
     *
     * This count represents cancellation requests for order items containing the seller's products that are currently in 'pending' status. Each request is created by a customer seeking to cancel an order item before shipment. The seller must review and either approve or reject each request.
     *
     * The count decreases when the seller approves or rejects a pending request. Only requests with status 'pending' are included - approved, rejected, or cancelled requests are excluded.
     *
     * @x-autobe-specification COUNT(*) from shopping_mall_cancellation_requests JOIN shopping_mall_order_items ON shopping_mall_cancellation_requests.shopping_mall_order_item_id = shopping_mall_order_items.id WHERE shopping_mall_order_items.shopping_mall_seller_id = authenticated_seller_id AND shopping_mall_cancellation_requests.status = 'pending'. Returns integer >= 0.
     */
    cancellationPendingCount: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of customer refund requests awaiting seller review.
     *
     * This count represents refund requests for order items containing the seller's products that are currently in 'pending' status. Each request is created by a customer seeking a refund for a delivered order item. The seller must review and either approve or reject each request.
     *
     * The count decreases when the seller approves or rejects a pending request. Only requests with status 'pending' are included - approved, rejected, or cancelled requests are excluded.
     *
     * @x-autobe-specification COUNT(*) from shopping_mall_refund_requests JOIN shopping_mall_order_items ON shopping_mall_refund_requests.shopping_mall_order_item_id = shopping_mall_order_items.id WHERE shopping_mall_order_items.shopping_mall_seller_id = authenticated_seller_id AND shopping_mall_refund_requests.status = 'pending'. Returns integer >= 0.
     */
    refundPendingCount: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
