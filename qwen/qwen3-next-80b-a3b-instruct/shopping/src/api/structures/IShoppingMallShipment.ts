import { tags } from "typia";

export namespace IShoppingMallShipment {
  /**
   * A compact summary of a shipment, containing critical tracking information and item count for display in order shipment lists. This representation avoids the overhead of full item details while providing enough context for customers to track delivery progress. The status reflects the collective delivery status of all included order items. For complete details on individual products or variant states at time of purchase, refer to the order item snapshots.
   */
  export type ISummary = {
    /**
     * Unique identifier for this shipment.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_shipments.id. Primary key for the shipment.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The name of the carrier or courier service handling this shipment (e.g., FedEx, UPS).
     *
     * @x-autobe-database-schema-property carrier_name
     * @x-autobe-specification Direct mapping from shopping_mall_shipments.carrier_name. Name of the logistics provider.
     */
    carrier_name: string;

    /**
     * The unique tracking number provided by the carrier for this shipment.
     *
     * @x-autobe-database-schema-property tracking_number
     * @x-autobe-specification Direct mapping from shopping_mall_shipments.tracking_number. Assigned by the carrier for tracking.
     */
    tracking_number: string;

    /**
     * The exact timestamp when this shipment was created and dispatched by the seller.
     *
     * @x-autobe-database-schema-property shipped_at
     * @x-autobe-specification Direct mapping from shopping_mall_shipments.shipped_at. Timestamp when shipper dispatched the package.
     */
    shipped_at: string & tags.Format<"date-time">;

    /**
     * The timestamp when the last item in this shipment was confirmed as delivered by the customer, or null if not yet delivered.
     *
     * @x-autobe-specification Computed: earliest delivery timestamp among all order items in this shipment, or null if no item is delivered. Based on order_item status transitions.
     */
    delivered_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * The collective delivery status of all items in this shipment: 'shipped' (awaiting delivery), 'partially_delivered' (some items delivered), 'delivered' (all items delivered).
     *
     * @x-autobe-specification Derived value based on shipment's order items: 'delivered' if all items are delivered, 'partially_delivered' if any item is delivered but not all, 'shipped' if no items are delivered yet. Determined by joining with shopping_mall_order_items status field.
     */
    status: "shipped" | "partially_delivered" | "delivered";

    /**
     * Total number of order items included in this shipment.
     *
     * @x-autobe-specification Computed by counting associated order_item_ids in shopping_mall_shipment_items. Represents the total number of order items in this shipment.
     */
    item_count: number & tags.Type<"int32"> & tags.Minimum<1>;
  };

  /**
   * Request body to create a new shipment containing one or more paid order items. Seller provides carrier name and tracking number for delivery tracking.
   */
  export type ICreate = {
    /**
     * Name of the shipping carrier (e.g., FedEx, UPS).
     *
     * @x-autobe-database-schema-property carrier_name
     * @x-autobe-specification Direct mapping from shopping_mall_shipments.carrier_name. Provided by seller during shipment creation.
     */
    carrier_name: string;

    /**
     * Unique tracking number issued by the carrier for this shipment.
     *
     * @x-autobe-database-schema-property tracking_number
     * @x-autobe-specification Direct mapping from shopping_mall_shipments.tracking_number. Provided by seller and used by customer for delivery tracking.
     */
    tracking_number: string;

    /**
     * List of order item IDs to include in this shipment. Each must be a paid item belonging to the seller’s inventory.
     *
     * @x-autobe-specification Array of order_item_ids from shopping_mall_order_items. Used to create shopping_mall_shipment_items records and transition linked items to 'shipped' status. Each ID must belong to same seller and order, and have status 'paid'. This is a dependent set, not a modeled column.
     */
    order_item_ids: string[];
  };

  /**
   * Query parameters for filtering and paginating shipment records for a specific order.
   */
  export type IRequest = {
    /**
     * The page number of results to retrieve (1-indexed).
     *
     * @x-autobe-specification Pagination page number (1-indexed). Minimum value: 1, Maximum value: 100, default: 1. Used to retrieve the nth page of results from the filtered shipment list. Client calculates total pages from response records and uses this to navigate pagination UI.
     */
    page?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<1> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;

    /**
     * Maximum number of shipment records to return per page.
     *
     * @x-autobe-specification Number of records per page. Minimum value: 1, Maximum value: 50, default: 10. Controls how many shipment summaries appear per page. This parameter directly limits database query results for performance and UX control.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<10> &
          tags.Minimum<1> &
          tags.Maximum<50>)
      | undefined;

    /**
     * Filter shipments by carrier name using partial string matching.
     *
     * @x-autobe-database-schema-property carrier_name
     * @x-autobe-specification Direct filtering on shipping_mall_shipments.carrier_name using case-insensitive partial match (LIKE pattern). Accepts a string value to search for carriers containing the specified text, e.g., 'FedEx', 'UPS'.
     */
    carrier_name?: string | undefined;

    /**
     * Filter shipments by tracking number using partial string matching.
     *
     * @x-autobe-database-schema-property tracking_number
     * @x-autobe-specification Direct filtering on shipping_mall_shipments.tracking_number using case-insensitive partial match (LIKE pattern). Accepts a string value to search for tracking numbers containing the specified text, e.g., '1234567890'.
     */
    tracking_number?: string | undefined;

    /**
     * Filter shipments by their derived delivery status: 'shipped', 'partially_delivered', or 'delivered'.
     *
     * @x-autobe-specification Filters shipments based on derived status computed from associated order items. 'shipped' means all items are 'shipped'. 'partially_delivered' means some items are 'delivered' and some are 'shipped'. 'delivered' means all items are 'delivered'. This is a computed property based on shopping_mall_order_items.status. The value 'pending' is excluded as it is not a valid shipment status — only 'shipped', 'partially_delivered', and 'delivered' are possible. Used for UI filtering and reporting.
     */
    status?: "pending" | "shipped" | "delivered" | undefined;

    /**
     * Filter shipments for a specific seller. Requests are filtered by joining with shopping_mall_orders to determine which shipments belong to the specified seller.
     *
     * @x-autobe-specification Allows filtering shipments by seller identity via join to shopping_mall_orders. Seller_id is not a direct column in shopping_mall_shipments. Instead, the system joins shopping_mall_shipments → shopping_mall_orders → shopping_mall_sellers to find shipments whose associated orders belong to the seller with the specified ID. Used by seller API context to view only their own shipments. Value must be a valid UUID from shopping_mall_sellers.id.
     */
    seller_id?: (string & tags.Format<"uuid">) | undefined;
  };
}
