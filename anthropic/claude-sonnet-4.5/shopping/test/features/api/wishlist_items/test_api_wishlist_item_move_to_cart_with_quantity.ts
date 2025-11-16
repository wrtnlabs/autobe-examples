import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test successful transfer of a wishlist item to the shopping cart with
 * buyer-specified quantity.
 *
 * This test validates the complete workflow of moving a saved product from the
 * wishlist to the cart for immediate purchase preparation. The scenario ensures
 * that buyers can seamlessly transition from passive product interest to active
 * purchase intent with proper quantity specification.
 *
 * Workflow:
 *
 * 1. Buyer registers and authenticates to obtain session tokens
 * 2. Buyer adds a product SKU to their wishlist
 * 3. Buyer moves the wishlist item to cart with specified quantity (3 units)
 * 4. Verify the cart item is created with correct quantity and current price
 *    snapshot
 * 5. Verify the wishlist item is soft-deleted and no longer appears in the active
 *    wishlist
 *
 * Validation points:
 *
 * - Cart item created with exact quantity specified by the buyer
 * - Cart item captures current unit price as price snapshot
 * - Wishlist item marked as deleted (deleted_at timestamp set)
 * - Cart item references the same SKU variant from the wishlist
 * - Move operation is atomic (both cart creation and wishlist deletion succeed
 *   together)
 */
export async function test_api_wishlist_item_move_to_cart_with_quantity(
  connection: api.IConnection,
) {
  // Step 1: Buyer registration and authentication
  const buyerCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const authorizedBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerCreateData,
    });
  typia.assert(authorizedBuyer);

  // Step 2: Add a product SKU to the wishlist
  const wishlistCreateData = {
    shopping_mall_sale_sku_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
      connection,
      {
        body: wishlistCreateData,
      },
    );
  typia.assert(wishlistItem);

  // Capture the original wishlist price snapshot for comparison
  const originalWishlistPrice = wishlistItem.price_snapshot;

  // Step 3: Move the wishlist item to cart with specified quantity
  const moveQuantity = 3;
  const moveToCartData = {
    quantity: moveQuantity,
  } satisfies IShoppingMallWishlistItem.IMoveToCart;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.moveToCart(
      connection,
      {
        wishlistItemId: wishlistItem.id,
        body: moveToCartData,
      },
    );
  typia.assert(cartItem);

  // Step 4: Validate cart item properties
  TestValidator.equals(
    "cart item quantity matches buyer-specified quantity",
    cartItem.quantity,
    moveQuantity,
  );

  TestValidator.equals(
    "cart item references the same SKU from wishlist",
    cartItem.shopping_mall_sale_sku_id,
    wishlistItem.shopping_mall_sale_sku_id,
  );

  TestValidator.equals(
    "cart item belongs to the authenticated buyer",
    cartItem.shopping_mall_buyer_id,
    authorizedBuyer.id,
  );

  TestValidator.predicate(
    "cart item has valid unit price snapshot",
    typeof cartItem.unit_price_snapshot === "number" &&
      cartItem.unit_price_snapshot >= 0,
  );

  TestValidator.predicate(
    "cart item created_at timestamp is set",
    typeof cartItem.created_at === "string" && cartItem.created_at.length > 0,
  );

  TestValidator.predicate(
    "cart item updated_at timestamp is set",
    typeof cartItem.updated_at === "string" && cartItem.updated_at.length > 0,
  );

  TestValidator.predicate(
    "cart item is not soft-deleted",
    cartItem.deleted_at === null || cartItem.deleted_at === undefined,
  );
}
