import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate deletion of a default wishlist for a customer.
 *
 * Business flow implemented (feasible subset of the original scenario):
 *
 * 1. Register a new customer (join) and obtain an authenticated context.
 * 2. Create a first wishlist for that customer marked as default (is_default =
 *    true, status = "active").
 * 3. Create a second wishlist for the same customer with is_default = false and
 *    status = "active".
 * 4. Verify via returned DTOs that:
 *
 *    - Both wishlists belong to the same customer as the authenticated actor.
 *    - The first wishlist is flagged as default and the second is not.
 * 5. Delete the default wishlist using DELETE
 *    /shoppingMall/customer/wishlists/{wishlistId}.
 * 6. Ensure deletion completes successfully (no error is thrown).
 *
 * Due to the current SDK only exposing create and erase operations for
 * wishlists (no list or get endpoints), this test cannot assert post-deletion
 * default reassignment or visibility semantics. Instead, it focuses on the
 * pre-deletion invariants and on confirming that deleting a default wishlist is
 * allowed and succeeds without error.
 */
export async function test_api_wishlist_delete_default_wishlist_behavior(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join) and establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Create the first wishlist as default
  const defaultWishlistBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const defaultWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: defaultWishlistBody,
    });
  typia.assert<IShoppingMallWishlist>(defaultWishlist);

  // Basic ownership & flag assertions for the default wishlist
  TestValidator.equals(
    "default wishlist belongs to the joined customer",
    defaultWishlist.customer.id,
    customer.id,
  );
  TestValidator.predicate(
    "first wishlist is marked as default",
    defaultWishlist.is_default === true,
  );
  TestValidator.equals(
    "default wishlist status is active",
    defaultWishlist.status,
    "active",
  );

  // 3. Create the second wishlist as non-default
  const secondaryWishlistBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_default: false,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const secondaryWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: secondaryWishlistBody,
    });
  typia.assert<IShoppingMallWishlist>(secondaryWishlist);

  // Ownership & flag assertions for the secondary wishlist
  TestValidator.equals(
    "secondary wishlist belongs to the joined customer",
    secondaryWishlist.customer.id,
    customer.id,
  );
  TestValidator.predicate(
    "second wishlist is not marked as default",
    secondaryWishlist.is_default === false,
  );
  TestValidator.equals(
    "secondary wishlist status is active",
    secondaryWishlist.status,
    "active",
  );

  // 4. Delete the default wishlist
  await api.functional.shoppingMall.customer.wishlists.erase(connection, {
    wishlistId: defaultWishlist.id,
  });

  // 5. Simple predicate to indicate flow reached post-deletion without error
  TestValidator.predicate(
    "default wishlist deletion completed without throwing",
    true,
  );
}
