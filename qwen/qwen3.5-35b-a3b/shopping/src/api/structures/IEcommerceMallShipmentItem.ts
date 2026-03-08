import { tags } from "typia";

import { IEcommerceMallOrderItem } from "./IEcommerceMallOrderItem";
import { IEcommerceMallShipment } from "./IEcommerceMallShipment";

export namespace IEcommerceMallShipmentItem {
  /**
   * Lightweight shipment item entity for listing operations. Contains the association between a shipment and an order item, with references to the parent shipment details and the order item being shipped. Used in shipment detail views and order tracking workflows.
   */
  export type ISummary = {
    /**
     * Unique identifier for the shipment item association record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from ecommerce_mall_shipment_items.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The shipment this order item is being delivered in.
     *
     * @x-autobe-database-schema-property shipment
     * @x-autobe-specification JOIN from shipment_id to ecommerce_mall_shipments.id. Returns IEcommerceMallShipment.ISummary with carrier_name and tracking_number.
     */
    shipment: IEcommerceMallShipment.ISummary;

    /**
     * The order item being shipped in this shipment.
     *
     * @x-autobe-database-schema-property orderItem
     * @x-autobe-specification JOIN from order_item_id to ecommerce_mall_order_items.id. Returns IEcommerceMallOrderItem.ISummary with item_status, quantity, unitPrice, and snapshots.
     */
    orderItem: IEcommerceMallOrderItem.ISummary;

    /**
     * Timestamp when this shipment item association was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_shipment_items.created_at. ISO 8601 date-time format.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this shipment item association was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from ecommerce_mall_shipment_items.updated_at. ISO 8601 date-time format.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
