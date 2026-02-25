import { tags } from "typia";

export namespace IShoppingMallSellerStatistic {
  /**
   * Seller dashboard summary statistics showing key performance metrics for the seller's shop including total products, order items, pending requests, ratings, and revenue.
   */
  export type IDashboard = {
    /**
     * Total number of active products listed by the seller.
     *
     * @x-autobe-database-schema-property total_products
     * @x-autobe-specification Direct mapping from shopping_mall_seller_statistics.total_products.
     */
    total_products: number & tags.Type<"int32">;

    /**
     * Total number of order items for all seller's products.
     *
     * @x-autobe-database-schema-property total_order_items
     * @x-autobe-specification Direct mapping from shopping_mall_seller_statistics.total_order_items.
     */
    total_order_items: number & tags.Type<"int32">;

    /**
     * Number of pending cancellation requests for seller's products.
     *
     * @x-autobe-database-schema-property pending_cancellation_requests
     * @x-autobe-specification Direct mapping from shopping_mall_seller_statistics.pending_cancellation_requests.
     */
    pending_cancellation_requests: number & tags.Type<"int32">;

    /**
     * Number of pending refund requests for seller's products.
     *
     * @x-autobe-database-schema-property pending_refund_requests
     * @x-autobe-specification Direct mapping from shopping_mall_seller_statistics.pending_refund_requests.
     */
    pending_refund_requests: number & tags.Type<"int32">;

    /**
     * Current average rating from customer reviews.
     *
     * @x-autobe-specification Direct mapping from shopping_mall_seller_statistics.average_rating. Nullable float representing average review rating.
     * @x-autobe-database-schema-property average_rating
     */
    average_rating?: number | null | undefined;

    /**
     * Total number of reviews received by seller's products.
     *
     * @x-autobe-database-schema-property total_reviews
     * @x-autobe-specification Direct mapping from shopping_mall_seller_statistics.total_reviews.
     */
    total_reviews: number & tags.Type<"int32">;

    /**
     * Total sales revenue from all completed orders.
     *
     * @x-autobe-database-schema-property total_sales_revenue
     * @x-autobe-specification Direct mapping from shopping_mall_seller_statistics.total_sales_revenue.
     */
    total_sales_revenue: number;

    /**
     * Number of pending approvals from sellers.
     *
     * @x-autobe-database-schema-property pending_seller_approvals
     * @x-autobe-specification Direct mapping from shopping_mall_seller_statistics.pending_seller_approvals.
     */
    pending_seller_approvals: number & tags.Type<"int32">;

    /**
     * Number of pending order items waiting for shipment.
     *
     * @x-autobe-database-schema-property pending_shipments
     * @x-autobe-specification Direct mapping from shopping_mall_seller_statistics.pending_shipments.
     */
    pending_shipments: number & tags.Type<"int32">;

    /**
     * Date and time when statistics were last calculated.
     *
     * @x-autobe-database-schema-property last_calculated_at
     * @x-autobe-specification Direct mapping from shopping_mall_seller_statistics.last_calculated_at. Timestamp when statistics were last calculated.
     */
    last_calculated_at: string & tags.Format<"date-time">;
  };
}
