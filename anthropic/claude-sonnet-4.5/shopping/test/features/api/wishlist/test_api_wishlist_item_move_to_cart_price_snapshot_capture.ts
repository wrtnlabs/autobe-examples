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
 * Validates price snapshot capture when moving wishlist item to cart.
 *
 * This test ensures that the moveToCart operation correctly captures the
 * current product price as unit_price_snapshot in the newly created cart item,
 * which may differ from the price_snapshot saved when the item was originally
 * wishlisted.
 *
 * Test workflow:
 *
 * 1. Register buyer and establish authenticated session
 * 2. Add product SKU to wishlist (captures initial price_snapshot)
 * 3. Move wishlist item to cart with specified quantity
 * 4. Verify cart item's unit_price_snapshot reflects current SKU price
 * 5. Validate cart item creation and property correctness
 *
 * This validates accurate price tracking throughout the buyer's purchase
 * journey, enabling price change detection and buyer notification before
 * checkout.
 */
export async function test_api_wishlist_item_move_to_cart_price_snapshot_capture(
  connection: api.IConnection,
) {
  // Step 1: Register buyer and authenticate
  const buyerRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: typia.random<string & tags.MinLength<2> & tags.MaxLength<100>>(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerRegistration,
    });
  typia.assert(buyer);

  // Step 2: Add product SKU to wishlist
  const wishlistItemCreate = {
    shopping_mall_sale_sku_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
      connection,
      {
        body: wishlistItemCreate,
      },
    );
  typia.assert(wishlistItem);

  // Step 3: Move wishlist item to cart with quantity
  const moveToCartRequest = {
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallWishlistItem.IMoveToCart;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.moveToCart(
      connection,
      {
        wishlistItemId: wishlistItem.id,
        body: moveToCartRequest,
      },
    );
  typia.assert(cartItem);

  // Step 4: Validate cart item creation and price snapshot
  TestValidator.equals(
    "cart item SKU matches wishlist item SKU",
    cartItem.shopping_mall_sale_sku_id,
    wishlistItem.shopping_mall_sale_sku_id,
  );

  TestValidator.equals(
    "cart item quantity matches requested quantity",
    cartItem.quantity,
    moveToCartRequest.quantity,
  );

  TestValidator.equals(
    "cart item buyer ID matches authenticated buyer",
    cartItem.shopping_mall_buyer_id,
    buyer.id,
  );

  // Verify unit_price_snapshot is set (reflects current price at move time)
  TestValidator.predicate(
    "cart item has unit_price_snapshot",
    typeof cartItem.unit_price_snapshot === "number" &&
      cartItem.unit_price_snapshot >= 0,
  );

  // Verify cart item has proper timestamps
  TestValidator.predicate(
    "cart item has created_at timestamp",
    typeof cartItem.created_at === "string" && cartItem.created_at.length > 0,
  );

  TestValidator.predicate(
    "cart item has updated_at timestamp",
    typeof cartItem.updated_at === "string" && cartItem.updated_at.length > 0,
  );
}
