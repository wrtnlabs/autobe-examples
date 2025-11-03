import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlist";
import type { IShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlistItem";

/**
 * Test updating an existing wishlist as the authenticated customer who is the
 * owner.
 *
 * Steps:
 *
 * 1. Register a new customer and become owner of a wishlist.
 * 2. Attempt to update the wishlist's updated_at timestamp via the customer
 *    account (using a mock UUID, as actual creation is not available).
 * 3. Validate the audit result: updated_at and ownership.
 */
export async function test_api_wishlist_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new customer (to become owner)
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    href: "https://example.org/register",
    referrer: "https://example.org/landing",
    ip: undefined,
  } satisfies IShoppingCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerBody,
  });
  typia.assert(customer);

  // 2. Mock a wishlistId (since no actual create API exists)
  const wishlistId = typia.random<string & tags.Format<"uuid">>();
  const newUpdatedAt = new Date().toISOString();

  // 3. Update the wishlist's updated_at as owner
  const updateBody = {
    updated_at: newUpdatedAt,
  } satisfies IShoppingWishlist.IUpdate;
  const updatedWishlist =
    await api.functional.shopping.customer.wishlists.update(connection, {
      wishlistId,
      body: updateBody,
    });
  typia.assert(updatedWishlist);
  TestValidator.equals(
    "wishlist owner id matches",
    updatedWishlist.shopping_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "wishlist updated_at matches input",
    updatedWishlist.updated_at,
    newUpdatedAt,
  );
}
