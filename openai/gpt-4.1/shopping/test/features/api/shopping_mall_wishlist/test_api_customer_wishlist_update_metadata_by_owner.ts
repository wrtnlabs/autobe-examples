import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validates customer ownership and metadata update restrictions for wishlists.
 *
 * Business context: Only the wishlist's owner (authenticated customer) should
 * be able to modify permissible fields (such as updated_at) of their wishlist,
 * while immutable fields like customer, id, and created_at must not change.
 * Attempting updates as a non-owner or to non-permissible fields should either
 * fail or have no effect.
 *
 * Steps:
 *
 * 1. Register a new customer (via /auth/customer/join).
 * 2. Create a wishlist for this customer (POST /shoppingMall/customer/wishlists).
 * 3. Generate a new ISO date-time string and perform an update on just the
 *    updated_at field (PUT /shoppingMall/customer/wishlists/{wishlistId}).
 * 4. Assert that only updated_at has changed, id/created_at/customer remain
 *    unchanged.
 * 5. Attempt update as a second customer (should fail).
 */
export async function test_api_customer_wishlist_update_metadata_by_owner(
  connection: api.IConnection,
) {
  // 1. Register as Customer #1
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const joinCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(joinCustomer);

  // 2. Create initial wishlist
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {} satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist);

  // 3. Update wishlist's updated_at
  const newUpdatedAt = new Date(Date.now() + 60 * 1000).toISOString(); // +1 minute from now
  const updatedWishlist =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: wishlist.id,
      body: {
        updated_at: newUpdatedAt,
      } satisfies IShoppingMallWishlist.IUpdate,
    });
  typia.assert(updatedWishlist);

  // 4. Assert only updated_at changed, identity/ownership/created_at are immutable
  TestValidator.equals(
    "wishlist id remains the same after update",
    updatedWishlist.id,
    wishlist.id,
  );
  TestValidator.equals(
    "customer reference remains unchanged",
    updatedWishlist.customer,
    wishlist.customer,
  );
  TestValidator.equals(
    "created_at is not affected by update",
    updatedWishlist.created_at,
    wishlist.created_at,
  );
  TestValidator.equals(
    "updated_at field changes after update",
    updatedWishlist.updated_at,
    newUpdatedAt,
  );

  // 5. Register as Customer #2 (non-owner)
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherPassword = RandomGenerator.alphaNumeric(12);
  const joinOther = await api.functional.auth.customer.join(connection, {
    body: {
      email: otherEmail,
      password: otherPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(joinOther);

  // 6. Try updating Customer #1's wishlist as Customer #2 (should fail)
  await TestValidator.error(
    "non-owner cannot update other's wishlist",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.update(connection, {
        wishlistId: wishlist.id,
        body: {
          updated_at: new Date().toISOString(),
        } satisfies IShoppingMallWishlist.IUpdate,
      });
    },
  );
}
