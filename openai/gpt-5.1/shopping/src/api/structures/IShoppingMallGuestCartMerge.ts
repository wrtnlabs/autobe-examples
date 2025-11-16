import { tags } from "typia";

export namespace IShoppingMallGuestCartMerge {
  /**
   * Request body for merging a guest cart into an authenticated customer's
   * persistent cart.
   *
   * Carries the guest cart identifier to be merged and optional merge
   * behavior hints. The identity of the target customer is derived
   * exclusively from the authenticated context (JWT/session) of the caller
   * and is not accepted from the request body.
   */
  export type ICreate = {
    /**
     * Identifier of the guest cart to be merged, corresponding to the
     * primary key of a record in `shopping_mall_guest_carts`.
     *
     * The backend uses this value to locate the temporary guest cart and
     * its items before merging them into the authenticated customer's
     * persistent cart.
     */
    guest_cart_id: string & tags.Format<"uuid">;

    /**
     * Optional hint indicating how to handle duplicate SKUs when both the
     * guest cart and the customer cart contain the same SKU.
     *
     * Typical strategies include:
     *
     * - `sum-quantities`: add quantities from guest and customer carts
     *   together
     * - `guest-wins`: prefer quantities from the guest cart
     * - `customer-wins`: keep existing customer cart quantities and ignore
     *   duplicates
     *
     * If omitted, the service applies the platform's default merge
     * behavior.
     */
    merge_strategy?: string | undefined;
  };
}
