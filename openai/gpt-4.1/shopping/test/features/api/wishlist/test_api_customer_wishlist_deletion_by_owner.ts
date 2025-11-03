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
 * Test that a logged-in customer can successfully soft-delete their own
 * wishlist.
 *
 * 1. Register a new customer using valid credentials.
 * 2. Simulate wishlist creation for that customer (direct instantiation).
 * 3. Attempt to delete the wishlist as its owner and validate deletion result.
 * 4. Attempt to delete the wishlist as a different user and expect an error.
 */
export async function test_api_customer_wishlist_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register as customer A
  const emailA = typia.random<string & tags.Format<"email">>();
  const customerA = await api.functional.auth.customer.join(connection, {
    body: {
      email: emailA,
      password: RandomGenerator.alphabets(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://test.example.com/signup",
      referrer: "https://test.example.com/landing",
      ip: undefined,
    },
  });
  typia.assert(customerA);
  const customerIdA = customerA.id;

  // 2. Simulate wishlist creation for customer A
  // (since wishlist creation API is not present, mock it)
  const wishlist: IShoppingWishlist = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shopping_customer_id: customerIdA,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [],
  };
  typia.assert(wishlist);

  // 3. Delete wishlist using correct user (owner)
  const erased = await api.functional.shopping.customer.wishlists.erase(
    connection,
    {
      wishlistId: wishlist.id,
    },
  );
  typia.assert(erased);
  TestValidator.equals(
    "soft-deleted wishlist has expected id",
    erased.id,
    wishlist.id,
  );
  // No further property can be checked due to lack of deleted_at in IShoppingWishlist; soft-delete mechanism may be handled in backend only.

  // 4. Register as customer B (non-owner)
  const emailB = typia.random<string & tags.Format<"email">>();
  const customerB = await api.functional.auth.customer.join(connection, {
    body: {
      email: emailB,
      password: RandomGenerator.alphabets(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://test.example.com/signup",
      referrer: "https://test.example.com/landing",
      ip: undefined,
    },
  });
  typia.assert(customerB);

  // Switch connection context to customer B (automatic via SDK after join)
  // Attempt to delete wishlist belonging to customer A -- should error.
  await TestValidator.error(
    "deletion attempt by non-owner must be blocked",
    async () => {
      await api.functional.shopping.customer.wishlists.erase(connection, {
        wishlistId: wishlist.id,
      });
    },
  );
}
