import { tags } from "typia";

export namespace IShoppingMallOrderDeliveryConfirmation {
  /**
   * Response containing delivery confirmation details including timestamp and identifiers.
   */
  export type IResponse = {
    /**
     * The ID of the shipment that was confirmed.
     *
     * @x-autobe-database-schema-property shopping_mall_shipment_id
     * @x-autobe-specification Direct mapping from shopping_mall_order_delivery_confirmations.shopping_mall_shipment_id. Represents the shipment being confirmed.
     */
    shipment_id: string & tags.Format<"uuid">;

    /**
     * The ID of the order item that was confirmed.
     *
     * @x-autobe-database-schema-property shopping_mall_order_item_id
     * @x-autobe-specification Direct mapping from shopping_mall_order_delivery_confirmations.shopping_mall_order_item_id. Represents the order item that was confirmed.
     */
    order_item_id: string & tags.Format<"uuid">;

    /**
     * The timestamp when delivery was confirmed (either customer confirmation or automatic confirmation after 14 days).
     *
     * @x-autobe-specification Computed field using COALESCE(customer_confirmed_at, auto_confirmed_at, NULL). Returns the earliest of customer manual confirmation, automatic 14-day confirmation, or NULL if neither occurred yet.
     */
    confirmed_at: string & tags.Format<"date-time">;
  };
}
