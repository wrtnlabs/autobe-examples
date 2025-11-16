import { tags } from "typia";

export namespace IShoppingMallGuestCartItemForCart {
  /**
   * Guest cart item payload used inside IShoppingMallGuestCart.IUpdate to
   * describe the desired state of each line item in the cart.
   *
   * This DTO is focused strictly on SKU selection and target quantity. The
   * owning cart identity and all system-managed fields, such as timestamps
   * and internal identifiers, are derived from the surrounding cart context
   * and are not accepted from the client.
   *
   * It is typically used when the client sends a full cart update, allowing
   * the backend to reconcile the requested SKU and quantity set with the
   * existing guest cart items.
   */
  export type IUpdate = {
    /**
     * Identifier of the SKU that this cart line item refers to.
     *
     * The backend resolves this to the corresponding
     * `shopping_mall_product_sku_id` in the database. The client must not
     * provide any internal database identifiers, only this external SKU
     * identifier.
     */
    sku_id: string;

    /**
     * Desired quantity of this SKU in the guest cart after the update
     * operation completes.
     *
     * This must be a positive integer and is subject to stock constraints,
     * per-order limits, and other business rules. It does not allow the
     * client to alter any system-managed audit or pricing fields.
     */
    quantity: number & tags.Type<"int32"> & tags.Minimum<1>;
  };
}
