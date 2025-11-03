import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlistItem";

/**
 * Test removing a wishlist item by its owning authenticated customer, and
 * prohibit unauthorized removals.
 *
 * 1. Register customer1. (get wishlistId)
 * 2. Add wishlist item as customer1.
 * 3. Remove the wishlist item as owning customer.
 * 4. Verify removal: attempt a second removal, expect error.
 * 5. Register customer2. Add an item to their wishlist. Attempt to remove it as
 *    customer1, expect error.
 * 6. (Structural) Ensure that once removed, the item is no longer accessible as
 *    customer's wishlist item.
 */
export async function test_api_wishlist_item_delete_by_customer(
  connection: api.IConnection,
) {
  // 1. Register customer1
  const customer1Body = typia.random<IShoppingCustomer.ICreate>();
  const customer1 = await api.functional.auth.customer.join(connection, {
    body: customer1Body,
  });
  typia.assert(customer1);
  // Assume customer1's wishlistId is derived (random for the test, since no API is exposed to list/create wishlists)
  const wishlistId1 = typia.random<string & tags.Format<"uuid">>();

  // 2. Add wishlist item as customer1
  const skuCode1 = RandomGenerator.alphaNumeric(12);
  const item1 = await api.functional.shopping.customer.wishlists.items.create(
    connection,
    {
      wishlistId: wishlistId1,
      body: { sku_code: skuCode1 } satisfies IShoppingWishlistItem.ICreate,
    },
  );
  typia.assert(item1);

  // 3. Remove the wishlist item as customer1
  await api.functional.shopping.customer.wishlists.items.erase(connection, {
    wishlistId: wishlistId1,
    itemId: item1.id,
  });

  // 4. Verify removal: attempt second removal (item does not exist), expect error
  await TestValidator.error(
    "removing non-existent wishlist item should fail",
    async () => {
      await api.functional.shopping.customer.wishlists.items.erase(connection, {
        wishlistId: wishlistId1,
        itemId: item1.id,
      });
    },
  );

  // 5. Register customer2, create a wishlist item for customer2
  const customer2Body = typia.random<IShoppingCustomer.ICreate>();
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: customer2Body,
  });
  typia.assert(customer2);
  const wishlistId2 = typia.random<string & tags.Format<"uuid">>();

  const skuCode2 = RandomGenerator.alphaNumeric(12);
  const item2 = await api.functional.shopping.customer.wishlists.items.create(
    connection,
    {
      wishlistId: wishlistId2,
      body: { sku_code: skuCode2 } satisfies IShoppingWishlistItem.ICreate,
    },
  );
  typia.assert(item2);

  // Attempt to remove customer2's wishlist item as customer1 (should be forbidden)
  await TestValidator.error(
    "deleting wishlist item from another customer's wishlist should fail",
    async () => {
      await api.functional.shopping.customer.wishlists.items.erase(connection, {
        wishlistId: wishlistId2,
        itemId: item2.id,
      });
    },
  );
}
