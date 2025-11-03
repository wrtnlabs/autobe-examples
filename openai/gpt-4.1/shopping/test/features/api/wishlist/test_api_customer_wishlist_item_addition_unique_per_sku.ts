import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlistItem";

/**
 * Validates SKU addition to a customer's wishlist and enforces item uniqueness
 * per SKU.
 *
 * 1. Register a new customer and obtain authentication.
 * 2. Simulate existence of a wishlist (by generating UUID as wishlistId).
 * 3. Generate a realistic SKU code (using random alphaNumeric).
 * 4. Add the SKU item to the wishlist.
 * 5. Validate the created wishlist item (id, sku fields, added_at).
 * 6. Attempt to add the same SKU code to the same wishlist again; expect
 *    uniqueness error.
 * 7. Attempt to add a clearly fake SKU code; expect SKU not found error.
 * 8. Wishlist ownership is enforced by path param/context (cannot test cross-user
 *    from here).
 */
export async function test_api_customer_wishlist_item_addition_unique_per_sku(
  connection: api.IConnection,
) {
  // 1. Register customer
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://test-origin.com/my/join",
    referrer: "https://test-origin.com/page-from-referrer",
  } satisfies IShoppingCustomer.ICreate;
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerBody });
  typia.assert(customer);

  // 2. Simulate wishlist UUID for customer (typically 1:1 relation in most platforms)
  const wishlistId = typia.random<string & tags.Format<"uuid">>();

  // 3. Pick a realistic SKU code (simulate existing catalog)
  const sku_code = RandomGenerator.alphaNumeric(8); // 8-char, not guaranteed unique but realistic

  // 4. Add SKU item to wishlist
  const addReq = { sku_code } satisfies IShoppingWishlistItem.ICreate;
  const item: IShoppingWishlistItem =
    await api.functional.shopping.customer.wishlists.items.create(connection, {
      wishlistId,
      body: addReq,
    });
  typia.assert(item);
  TestValidator.equals(
    "created wishlist item has correct sku_code",
    item.sku.sku_code,
    sku_code,
  );
  TestValidator.predicate(
    "wishlist item id exists",
    typeof item.id === "string" && item.id.length > 0,
  );
  TestValidator.predicate(
    "added_at is present",
    typeof item.added_at === "string" && item.added_at.length > 0,
  );

  // 5. Attempt to add the same SKU code again; must fail due to uniqueness constraint
  await TestValidator.error(
    "cannot add duplicate sku_code to wishlist",
    async () => {
      await api.functional.shopping.customer.wishlists.items.create(
        connection,
        {
          wishlistId,
          body: { sku_code } satisfies IShoppingWishlistItem.ICreate,
        },
      );
    },
  );

  // 6. Attempt to add a totally invalid (likely nonexistent) SKU code
  const nonSkuCode = RandomGenerator.alphaNumeric(16); // unlikely to exist
  await TestValidator.error("cannot add nonexistent SKU code", async () => {
    await api.functional.shopping.customer.wishlists.items.create(connection, {
      wishlistId,
      body: { sku_code: nonSkuCode } satisfies IShoppingWishlistItem.ICreate,
    });
  });
}
