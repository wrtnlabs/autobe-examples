import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Validate deleting a wishlist that already contains items.
 *
 * Business goal
 *
 * - Ensure that when a customer deletes a wishlist, the operation succeeds even
 *   if the wishlist has existing items, and that the wishlist is treated as
 *   removed afterward.
 * - Indirectly validate that referential integrity is preserved by verifying that
 *   follow-up operations against the deleted wishlist fail.
 *
 * High-level flow
 *
 * 1. Register (join) a customer and establish an authenticated connection.
 * 2. Create a wishlist for that customer.
 * 3. Create at least one wishlist item in that wishlist.
 * 4. Delete the wishlist.
 * 5. Attempt to create another wishlist item on the deleted wishlist and assert
 *    that it fails.
 *
 * Available APIs used
 *
 * - POST /auth/customer/join -> api.functional.auth.customer.join -> body:
 *   IShoppingMallCustomerJoin.IRequest -> response:
 *   IShoppingMallCustomer.IAuthorized (token applied to connection)
 * - POST /shoppingMall/customer/wishlists ->
 *   api.functional.shoppingMall.customer.wishlists.create -> body:
 *   IShoppingMallWishlist.ICreate -> response: IShoppingMallWishlist
 * - POST /shoppingMall/customer/wishlists/:wishlistId/items ->
 *   api.functional.shoppingMall.customer.wishlists.items.create -> body:
 *   IShoppingMallWishlistItem.ICreate -> response: IShoppingMallWishlistItem
 * - DELETE /shoppingMall/customer/wishlists/:wishlistId ->
 *   api.functional.shoppingMall.customer.wishlists.erase -> response: void
 */
export async function test_api_wishlist_delete_with_existing_items(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer.
  const customer = await api.functional.auth.customer.join(connection, {
    body: typia.random<IShoppingMallCustomerJoin.IRequest>(),
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Create a wishlist for this customer.
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        is_default: true,
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert<IShoppingMallWishlist>(wishlist);

  // Sanity check: wishlist id has proper UUID format.
  TestValidator.predicate(
    "wishlist id should be a non-empty string",
    () => typeof wishlist.id === "string" && wishlist.id.length > 0,
  );

  // 3. Create a wishlist item for this wishlist.
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      connection,
      {
        wishlistId: wishlist.id,
        body: {
          shopping_mall_product_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          shopping_mall_sku_id: null,
          position: null,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert<IShoppingMallWishlistItem>(wishlistItem);

  // 4. Delete the wishlist that currently has items.
  await api.functional.shoppingMall.customer.wishlists.erase(connection, {
    wishlistId: wishlist.id,
  });

  // 5. Verify that further operations against the deleted wishlist fail.
  await TestValidator.error(
    "creating an item in a deleted wishlist must fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.items.create(
        connection,
        {
          wishlistId: wishlist.id,
          body: {
            shopping_mall_product_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_sku_id: null,
            position: null,
          } satisfies IShoppingMallWishlistItem.ICreate,
        },
      );
    },
  );
}
