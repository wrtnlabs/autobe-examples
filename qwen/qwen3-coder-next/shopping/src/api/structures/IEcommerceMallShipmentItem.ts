import { tags } from "typia";

export namespace IEcommerceMallShipmentItem {
  /**
   * Lightweight representation of a shipment item for listing which order items are included in a physical shipment package. Provides basic identification without nested object details.
   */
  export type ISummary = {
    /**
     * Unique identifier for this shipment item record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_shipment_items.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * UUID of the shipment that contains this order item.
     *
     * @x-autobe-database-schema-property shipment_id
     * @x-autobe-specification Direct mapping from ecommerce_mall_shipment_items.shipment_id. References the parent shipment record.
     */
    shipment_id: string & tags.Format<"uuid">;

    /**
     * UUID of the order item included in this shipment.
     *
     * @x-autobe-database-schema-property order_item_id
     * @x-autobe-specification Direct mapping from ecommerce_mall_shipment_items.order_item_id. References the order item being shipped.
     */
    order_item_id: string & tags.Format<"uuid">;

    /**
     * Timestamp when this shipment item record was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_shipment_items.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this shipment item record was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_shipment_items.updated_at.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
