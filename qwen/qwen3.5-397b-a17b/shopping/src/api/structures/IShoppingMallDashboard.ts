import { tags } from "typia";

export namespace IShoppingMallDashboard {
  /**
   * Seller dashboard summary statistics providing an at-a-glance view of shop performance and pending tasks requiring attention.
   */
  export type ISummary = {
    /**
     * Total number of products listed by the seller.
     *
     * @x-autobe-specification COUNT(*) FROM shopping_mall_products WHERE seller_id = auth.seller.id. Computed at query time.
     */
    products_count: number & tags.Type<"int32">;

    /**
     * Total number of order items across all seller's products.
     *
     * @x-autobe-specification COUNT(*) FROM shopping_mall_order_items JOIN shopping_mall_products ON order_items.product_id = products.id WHERE products.seller_id = auth.seller.id. Computed at query time.
     */
    order_items_count: number & tags.Type<"int32">;

    /**
     * Count of pending cancellation requests awaiting seller response.
     *
     * @x-autobe-specification COUNT(*) FROM shopping_mall_cancellation_requests JOIN shopping_mall_order_items ON cancellation_requests.order_item_id = order_items.id JOIN shopping_mall_products ON order_items.product_id = products.id WHERE products.seller_id = auth.seller.id AND cancellation_requests.responded_at IS NULL. Computed at query time.
     */
    pending_cancellations_count: number & tags.Type<"int32">;

    /**
     * Count of pending refund requests awaiting seller response.
     *
     * @x-autobe-specification COUNT(*) FROM shopping_mall_refund_requests JOIN shopping_mall_order_items ON refund_requests.order_item_id = order_items.id JOIN shopping_mall_products ON order_items.product_id = products.id WHERE products.seller_id = auth.seller.id AND refund_requests.responded_at IS NULL. Computed at query time.
     */
    pending_refunds_count: number & tags.Type<"int32">;
  };
}
