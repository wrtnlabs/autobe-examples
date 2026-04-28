import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IShoppingMallCartItem } from "../../../../../../../api/structures/IShoppingMallCartItem";
import { MemberAuth } from "../../../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../../../decorators/payload/MemberPayload";
import { postShoppingMallMemberCartItemsAvailabilityCleanups } from "../../../../../../../providers/postShoppingMallMemberCartItemsAvailabilityCleanups";

@Controller("/shoppingMall/member/cart/items/availability/cleanups")
export class ShoppingmallMemberCartItemsAvailabilityCleanupsController {
  /**
   * This operation performs a reconciliation pass to clean up cart item availability for the authenticated customer.
   *
   * It updates the customer-owned cart items so that availability reflects the latest state of the referenced product variants and inventory history. In the domain model, cart lines are stored in `shopping_mall_cart_items` (quantity, subtotal amount, and a nullable `deleted_at` that represents when the cart line is no longer active), while cart-level warnings are stored in `shopping_mall_carts.warning_inventory_insufficient`. Variant availability is governed by `shopping_mall_product_variants.deleted_at` and `shopping_mall_product_variants.is_active`, and purchasable stock is derived from `shopping_mall_inventory_records` (stock/available/reserved values captured at record creation time).
   *
   * From the user-facing behavior requirements: when a variant is deleted or becomes out of stock after the cart is shown, the system must mark the corresponding cart line as unavailable and must not allow unavailable lines to be checked out. Unavailable items must remain visible in the cart so the customer can understand why the item cannot be purchased. Additionally, cart totals and warnings must stay internally consistent after availability changes, and inventory-triggered updates must ensure checkout eligibility is respected.
   *
   * Security and ownership are enforced by always scoping the cleanup to the cart that belongs to the authenticated member (`shopping_mall_carts.shopping_mall_member_id`). The operation never operates on another customer's cart or cart lines.
   *
   * If a cart item’s variant becomes available again later, this operation reassesses the cart line and updates its availability indicators accordingly so that the cart can be purchased consistently.
   *
   * Related operations:
   *
   * - Cart item listing and display should read the cart items and present their availability state.
   * - Cart item add/update should prevent adding variants that are deleted or out of stock.
   * - Cart item removal must still succeed even when the cart line is already unavailable (availability cleanup keeps totals aligned).
   *
   * @param connection
   * @param body Reconciliation input for cart item availability cleanup. Allows optional targeting by cart or cart item scope, while always applying ownership scoping to the authenticated member.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement a write-side reconciliation transaction
     *   for the authenticated member's active cart(s).
   *
   * Algorithm:
   * 1) Identify target cart scope:
   *    - Find the authenticated member’s current cart(s) where `deleted_at` is null.
   *    - If request includes an optional cartId or cartItemIds, restrict the query accordingly.
   * 2) Load cart items with their variant relationship and inventory context:
   *    - Join `shopping_mall_cart_items` to `shopping_mall_product_variants` via `shopping_mall_product_variant_id`.
   *    - For each variant, determine current availability by evaluating the latest `shopping_mall_inventory_records` entry for that variant (based on `created_at` descending). Use `available_quantity` (and optionally ensure it is > 0) as the immediate purchasable quantity.
   * 3) Decide availability state per cart item:
   *    - Variant is unavailable if `shopping_mall_product_variants.deleted_at` is not null OR `shopping_mall_product_variants.is_active` is false.
   *    - Variant is also unavailable if latest `available_quantity` is <= 0.
   *    - Quantity vs stock: if cart quantity exceeds latest available quantity, mark unavailable or update warning state so checkout is not allowed.
   * 4) Apply updates:
   *    - For each cart item currently active (cart line row where `shopping_mall_cart_items.deleted_at` is null):
   *      - If unavailable now, set `shopping_mall_cart_items.deleted_at = now()` (and keep row visible per domain meaning).
   *      - If available now, ensure `shopping_mall_cart_items.deleted_at` remains null.
   *    - Recompute cart-level warning flag `shopping_mall_carts.warning_inventory_insufficient`:
   *      - Set true if any active cart item has unavailable conditions (deleted variant, inactive variant, or quantity exceeds available/available<=0).
   *      - Otherwise set false.
   * 5) Consistency checks:
   *    - Totals are derived from cart item subtotal_amount; do not change subtotal_amount unless quantity changed by the request (this endpoint is a reconciliation of availability).
   *    - Ensure cart totals and warnings remain aligned with what can be purchased: checkout eligibility must not include items where availability is false.
   * 6) Return result: include counts of reconciled carts/items and optionally the cart summary / item summaries.
   *
   * Error handling:
   * - If the authenticated member has no cart, return an empty reconciliation result (no error).
   * - If requested cartId/cartItemIds do not belong to the authenticated member, reject with an authorization/ownership error.
   *
   * Transaction:
   * - Use a single database transaction for the per-request reconciliation to keep cart item deleted_at markers and cart warning flag consistent.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async createAvailabilityCleanup(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IShoppingMallCartItem.ICreate,
  ): Promise<void> {
    try {
      return await postShoppingMallMemberCartItemsAvailabilityCleanups({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
