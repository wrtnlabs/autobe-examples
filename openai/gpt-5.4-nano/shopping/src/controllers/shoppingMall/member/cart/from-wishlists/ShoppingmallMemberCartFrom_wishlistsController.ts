import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IShoppingMallCart } from "../../../../../api/structures/IShoppingMallCart";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { postShoppingMallMemberCartFromWishlists } from "../../../../../providers/postShoppingMallMemberCartFromWishlists";

@Controller("/shoppingMall/member/cart/from-wishlists")
export class ShoppingmallMemberCartFrom_wishlistsController {
  /**
   * Convert a member's wishlist selections into cart line items.
   *
   * This operation is the bridge from the wishlist domain (saved interest in products) to the cart domain (temporary selection of product variants and quantities to purchase). In the underlying schema, the member's wishlist content is stored in `shopping_mall_wishlists` and `shopping_mall_wishlist_items` (wishlist items reference `shopping_mall_products`). The cart container for the member is `shopping_mall_carts`, and each cart line is a row in `shopping_mall_cart_items` that references exactly one `shopping_mall_product_variants` row and stores the chosen `quantity` and `subtotal_amount`.
   *
   * Inventory availability is enforced during conversion: even if a wishlist item exists, the referenced product variants must be checked against current availability derived from `shopping_mall_inventory_records` and also respect variant-level availability flags (e.g., `shopping_mall_product_variants.deleted_at` and `is_active`). When a referenced variant is unavailable, the system must block adding it to the cart (wishlist presence does not imply cart availability). If the operation cannot complete, it must not partially update the cart; it should keep the cart contents consistent and readable.
   *
   * Authorization: this operation applies only to the authenticated member. The system must ensure it only reads wishlist data that belongs to the authenticated member (`shopping_mall_wishlists.shopping_mall_member_id`) and only creates/updates cart data that belongs to the same member (`shopping_mall_carts.shopping_mall_member_id`). If the customer is not logged in, cart operations must be rejected.
   *
   * Related operations:
   * - Wishlist removal/no-op semantics keep wishlist views consistent when a product is absent from the wishlist; this operation similarly must avoid corrupting cart state.
   * - Cart item operations require that each cart change applies only to the authenticated member's cart.
   *
   * Expected behavior:
   * - On success, return the updated cart summary reflecting new cart items and the cart-level `warning_inventory_insufficient` state.
   * - On error, do not partially add some items while rejecting others; keep cart data consistent within a single transaction.
   *
   * @param connection
   * @param body Criteria for which wishlist items to convert and how to select the target product variants and quantities for cart line items.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation steps for Realize Agent:
   *
   * 1) Authenticate and identify the member.
   * 2) Load the member's wishlist (`shopping_mall_wishlists`) and its items (`shopping_mall_wishlist_items`) based on request criteria (e.g., specific wishlist item ids). Ensure every wishlist item belongs to the authenticated member.
   * 3) For each wishlist item, determine the target product variant(s) to add to cart.
   *    - Use request body selection fields to pick the exact `shopping_mall_product_variants.id` and quantity to add.
   *    - Validate the selected variant belongs to the wishlist item's product.
   * 4) Availability checks before writing:
   *    - Reject variants where `shopping_mall_product_variants.deleted_at` is set or `is_active` is false.
   *    - Derive current purchasable availability from `shopping_mall_inventory_records` for the selected variant.
   *    - If the requested quantity exceeds available quantity (derived), do not add that cart item; mark the cart as requiring inventory warning when applicable, according to existing cart rules (cart-level `warning_inventory_insufficient`).
   * 5) Transactional write:
   *    - Start a DB transaction.
   *    - Ensure the member has a cart (`shopping_mall_carts`). If none exists, create one.
   *    - Insert or update `shopping_mall_cart_items` rows for the cart:
   *      - Each row must reference `shopping_mall_product_variant_id` and set `quantity` and `subtotal_amount`.
   *    - Recompute cart-level `warning_inventory_insufficient` based on the resulting cart items and derived inventory availability.
   *    - Commit transaction.
   * 6) No partial updates:
   *    - If any selected variant is unavailable per rules, or if validation fails, roll back the transaction.
   * 7) Response:
   *    - Return the updated cart using existing cart DTOs (cart summary suitable for list/display).
   *
   * Edge cases:
   * - Empty selection: return the current cart unchanged.
   * - Wishlist item exists but all corresponding selected variants are unavailable: reject or treat as no-op according to request criteria, but ensure cart consistency within transaction.
   * - Concurrent cart edits: rely on transaction isolation; when inserting cart items, be careful to avoid duplicate variant lines for the same cart if the DB model enforces uniqueness via soft-delete behavior.
   *
   * Integrations:
   * - None external; all logic should be performed via DB queries on the referenced models.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async createCartFromWishlists(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IShoppingMallCart.ICreateFromWishlist,
  ): Promise<IShoppingMallCart> {
    try {
      return await postShoppingMallMemberCartFromWishlists({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
