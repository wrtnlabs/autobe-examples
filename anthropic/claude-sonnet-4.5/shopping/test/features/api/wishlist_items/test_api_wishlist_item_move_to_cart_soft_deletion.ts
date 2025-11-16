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
 * Test moving a wishlist item to cart and verify cart item creation.
 *
 * This test validates the moveToCart operation for wishlist items. While the
 * operation performs soft deletion on the wishlist item (setting deleted_at
 * timestamp), the available API operations do not provide a way to retrieve the
 * wishlist item afterward to verify the soft deletion directly.
 *
 * Therefore, this test focuses on verifying the successful completion of the
 * moveToCart operation by validating that:
 *
 * - A cart item is created with the correct product SKU reference
 * - The cart item has the specified quantity
 * - The cart item belongs to the authenticated buyer
 *
 * The soft deletion mechanism is assumed to be working correctly based on the
 * successful cart item creation, as the API documentation indicates that
 * wishlist items are soft-deleted during the move operation.
 *
 * Workflow:
 *
 * 1. Buyer registers and authenticates
 * 2. Buyer adds a product SKU to their wishlist
 * 3. Buyer moves the wishlist item to cart with specified quantity
 * 4. Verify cart item is created successfully with correct data
 */
export async function test_api_wishlist_item_move_to_cart_soft_deletion(
  connection: api.IConnection,
) {
  // Step 1: Buyer registers and authenticates
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: typia.random<string & tags.MinLength<2> & tags.MaxLength<100>>(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, { body: buyerData });
  typia.assert(buyer);

  // Step 2: Add a product SKU to the wishlist
  const wishlistItemData = {
    shopping_mall_sale_sku_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
      connection,
      { body: wishlistItemData },
    );
  typia.assert(wishlistItem);

  // Step 3: Move the wishlist item to cart with specified quantity
  const moveToCartQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();

  const moveToCartData = {
    quantity: moveToCartQuantity,
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

  // Step 4: Verify cart item is created successfully
  TestValidator.equals(
    "cart item should reference the same SKU as wishlist item",
    cartItem.shopping_mall_sale_sku_id,
    wishlistItem.shopping_mall_sale_sku_id,
  );

  TestValidator.equals(
    "cart item should have the specified quantity",
    cartItem.quantity,
    moveToCartQuantity,
  );

  TestValidator.equals(
    "cart item should belong to the authenticated buyer",
    cartItem.shopping_mall_buyer_id,
    buyer.id,
  );

  TestValidator.predicate(
    "cart item should have a valid ID indicating successful creation",
    cartItem.id !== null && cartItem.id !== undefined && cartItem.id.length > 0,
  );
}
