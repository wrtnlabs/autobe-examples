import { tags } from "typia";

import { IShoppingMallOrderItem } from "./IShoppingMallOrderItem";
import { IShoppingMallShipment } from "./IShoppingMallShipment";

export namespace IShoppingMallShipmentItem {
  /**
   * Request parameters for listing order items within a shipment. Supports pagination (page, limit) and optional filtering by order item status. Use this to retrieve paginated results of shipment contents with customizable page size and status-based filtering.
   */
  export type IRequest = {
    /**
     * Page number for pagination (default: 1).
     *
     * @x-autobe-specification Query parameter for pagination. Current page number (1-indexed). Default value is 1, minimum is 1. Used to calculate offset when querying shopping_mall_shipment_items joined with shopping_mall_order_items. Offset = (page - 1) * limit.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of items per page (default: 20, max: 100).
     *
     * @x-autobe-specification Query parameter for pagination. Number of items per page. Default value is 20, minimum is 1, maximum is 100. Applied as LIMIT clause when querying shopping_mall_shipment_items joined with shopping_mall_order_items.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Filter by order item status (paid, shipped, delivered, cancelled, refunded).
     *
     * @x-autobe-specification Optional query parameter for filtering order items by fulfillment status. Filters on shopping_mall_order_items.status column. Valid values: 'paid' (order placed, payment confirmed), 'shipped' (item dispatched), 'delivered' (item received), 'cancelled' (pre-shipment cancellation approved), 'refunded' (post-delivery return approved). Applied as WHERE clause: shopping_mall_order_items.status = ? when provided.
     */
    status?:
      | "paid"
      | "shipped"
      | "delivered"
      | "cancelled"
      | "refunded"
      | undefined;

    /**
     * Sort order (default: created_at desc).
     *
     * @x-autobe-specification Optional query parameter for result ordering. Default value is 'created_at desc' (newest items first). Applied as ORDER BY clause when querying shopping_mall_shipment_items. Supports sorting by created_at in ascending or descending order.
     */
    sort?: string | undefined;
  };

  /**
   * Lightweight representation of an order item within a shipment. Includes the shipment item's identifier and creation timestamp, along with references to the parent shipment and the order item details (product information, quantity, price, and fulfillment status). Used in paginated lists to display shipment contents without loading full detail data.
   */
  export type ISummary = {
    /**
     * Unique identifier for the shipment item record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_shipment_items.id. Primary key of the junction table.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when this order item was added to the shipment.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from shopping_mall_shipment_items.created_at. Timestamp when the shipment item association was created.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * The parent shipment containing this order item, including tracking carrier, tracking number, and delivery status.
     *
     * @x-autobe-database-schema-property shipment
     * @x-autobe-specification Join from shopping_mall_shipment_items.shopping_mall_shipment_id to shopping_mall_shipments.id. Returns IShoppingMallShipment.ISummary with tracking information and seller details.
     */
    shipment: IShoppingMallShipment.ISummary;

    /**
     * The order item being shipped, including product snapshot, quantity, price, and current status.
     *
     * @x-autobe-database-schema-property orderItem
     * @x-autobe-specification Join from shopping_mall_shipment_items.shopping_mall_order_item_id to shopping_mall_order_items.id. Returns IShoppingMallOrderItem.ISummary with product details, quantity, price, and fulfillment status.
     */
    orderItem: IShoppingMallOrderItem.ISummary;
  };
}
