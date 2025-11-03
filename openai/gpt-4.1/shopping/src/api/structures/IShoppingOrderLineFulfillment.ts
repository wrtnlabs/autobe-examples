import { tags } from "typia";

export namespace IShoppingOrderLineFulfillment {
  /**
   * Summary of a fulfillment shipment/packing event associated with an order
   * line. Used in IShoppingOrderLine.fulfillments (from
   * shopping_order_fulfillments).
   */
  export type ISummary = {
    /**
     * UUID primary key of this fulfillment entry (from
     * shopping_order_fulfillments.id).
     */
    id: string & tags.Format<"uuid">;

    /**
     * Business-traceable code or label for the fulfillment (from
     * fulfillment_code).
     */
    fulfillment_code: string;

    /** Quantity shipped/fulfilled in this event (from quantity_fulfilled). */
    quantity_fulfilled: number & tags.Type<"int32">;

    /**
     * Fulfillment event status (pending, shipped, delivered, canceled, etc
     * from shopping_order_fulfillments.status).
     */
    status: string;

    /**
     * Timestamp when fulfillment completed
     * (shopping_order_fulfillments.fulfilled_at).
     */
    fulfilled_at: string & tags.Format<"date-time">;

    /**
     * UUID of the address where fulfillment originated
     * (shopping_seller_address_id).
     */
    seller_address_id: string & tags.Format<"uuid">;
  };
}
