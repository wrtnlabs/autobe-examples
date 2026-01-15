import { tags } from "typia";

export namespace ICommunityPlatformOrderReturnItem {
  /**
   * Request DTO for specifying individual order items to be returned in a
   * return request. This schema defines the details for each specific product
   * item within a return, including the original item identifier, quantity to
   * return, and specific reason for return. This enables granular return
   * processing, accurate refund calculations, and detailed inventory
   * management for returned items.
   */
  export type ICreate = {
    /**
     * Unique identifier of the specific order item to be returned. This
     * references the original item from the order being returned and
     * ensures accurate item matching for refund calculations and inventory
     * adjustments.
     *
     * The system validates that this item exists in the original order and
     * belongs to the same customer making the return request. Multiple
     * items can be returned in a single return request by including
     * multiple order_item_id values in the selected_items array.
     */
    order_item_id: string & tags.Format<"uuid">;

    /**
     * Number of this specific item to be returned. Must be greater than or
     * equal to 1 and cannot exceed the original quantity purchased in the
     * order.
     *
     * This allows customers to return partial quantities of an item rather
     * than the entire quantity they originally purchased. The returned
     * quantity is subtracted from the original order item quantity for
     * inventory reconciliation.
     *
     * The system validates that the requested return quantity does not
     * exceed the original purchase quantity for this item.
     */
    quantity: number & tags.Type<"int32"> & tags.Minimum<1>;
  };
}
