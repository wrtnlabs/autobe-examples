import { tags } from "typia";

export namespace IEcommerceShopDashboard {
  /**
   * Shop dashboard summary containing aggregated statistics for the seller's shop.
   *
   * This type provides a quick overview of shop activity and pending actions requiring seller attention. All counts are computed in real-time from the products, order items, cancellation requests, and refund requests tables.
   *
   * **Statistics Fields**
   *
   * - product_count — Total number of products owned by the seller (excluding soft-deleted)
   * - order_item_count — Total number of order items for the seller's products
   * - pending_cancellation_request_count — Number of cancellation requests with 'pending' status for the seller's order items
   * - pending_refund_request_count — Number of refund requests with 'pending' status for the seller's order items
   */
  export type ISummary = {
    /**
     * Total number of products owned by the seller.
     *
     * This count includes all active products in the seller's shop, excluding soft-deleted products (where deleted_at IS NOT NULL). The value is computed in real-time from the products table and reflects the current inventory size.
     *
     * **Business Context**
     *
     * Sellers use this metric to understand their shop's product catalog size. A count of zero indicates a new seller who has not yet added any products.
     *
         * @x-autobe-specification COUNT from ecommerce_products WHERE seller_id
         *   = authenticated seller AND deleted_at IS NULL. Returns zero if
         *   seller has no products.
     */
    product_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of order items for the seller's products.
     *
     * This count represents all purchased items across all orders that contain products owned by the seller. It is computed by joining the order_items table with products and filtering by the authenticated seller's ID.
     *
     * **Business Context**
     *
     * This metric helps sellers understand their sales volume. A higher count indicates more products have been sold through their shop.
     *
         * @x-autobe-specification COUNT from ecommerce_order_items JOIN
         *   ecommerce_products on product_variant_id WHERE products.seller_id =
         *   authenticated seller. Returns zero if seller has no order items.
     */
    order_item_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of pending cancellation requests for the seller's order items.
     *
     * This count tracks cancellation requests that are awaiting seller review. A cancellation request is considered 'pending' when the customer has submitted a request but the seller has not yet approved or rejected it.
     *
     * **Business Context**
     *
     * Sellers should review and respond to pending cancellation requests promptly. This metric helps identify how many requests require immediate attention.
     *
         * @x-autobe-specification COUNT from ecommerce_cancellation_requests
         *   JOIN ecommerce_order_items JOIN ecommerce_products WHERE
         *   products.seller_id = authenticated seller AND
         *   cancellation_requests.status = 'pending'. Returns zero if no
         *   pending cancellation requests exist.
     */
    pending_cancellation_request_count: number &
      tags.Type<"int32"> &
      tags.Minimum<0>;

    /**
     * Number of pending refund requests for the seller's order items.
     *
     * This count tracks refund requests that are awaiting seller review. A refund request is considered 'pending' when the customer has submitted a request for a delivered item but the seller has not yet approved or rejected it.
     *
     * **Business Context**
     *
     * Sellers should review and respond to pending refund requests promptly. This metric helps identify how many requests require immediate attention.
     *
         * @x-autobe-specification COUNT from ecommerce_refund_requests JOIN
         *   ecommerce_order_items JOIN ecommerce_products WHERE
         *   products.seller_id = authenticated seller AND
         *   refund_requests.status = 'pending'. Returns zero if no pending
         *   refund requests exist.
     */
    pending_refund_request_count: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
