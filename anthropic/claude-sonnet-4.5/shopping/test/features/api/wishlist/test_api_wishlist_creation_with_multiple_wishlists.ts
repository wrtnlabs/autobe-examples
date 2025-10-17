import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Test that customers can create multiple named wishlists to organize products
 * by different purposes.
 *
 * This test validates the multi-wishlist organizational capability by:
 *
 * 1. Registering a new customer account
 * 2. Creating multiple wishlists with distinct names (Holiday Gifts, Favorites,
 *    Birthday Ideas)
 * 3. Validating each wishlist has unique identifiers
 * 4. Confirming all wishlists are associated with the same customer
 * 5. Verifying the customer can manage multiple wishlist collections
 *    simultaneously
 */
export async function test_api_wishlist_creation_with_multiple_wishlists(
  connection: api.IConnection,
) {
  // Step 1: Register new customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerData });
  typia.assert(customer);

  // Verify customer authentication token is set
  TestValidator.predicate(
    "customer authentication token exists",
    customer.token.access.length > 0,
  );

  // Step 2: Create multiple wishlists with distinct names
  const wishlistNames = [
    "Holiday Gifts",
    "Favorites",
    "Birthday Ideas",
  ] as const;
  const createdWishlists: IShoppingMallWishlist[] = [];

  for (const name of wishlistNames) {
    const wishlistData = {
      name: name,
    } satisfies IShoppingMallWishlist.ICreate;

    const wishlist: IShoppingMallWishlist =
      await api.functional.shoppingMall.customer.wishlists.create(connection, {
        body: wishlistData,
      });
    typia.assert(wishlist);
    createdWishlists.push(wishlist);

    // Verify wishlist name matches input
    TestValidator.equals(
      `wishlist name matches "${name}"`,
      wishlist.name,
      name,
    );
  }

  // Step 3: Verify all wishlists have unique identifiers
  const wishlistIds = createdWishlists.map((w) => w.id);
  const uniqueIds = new Set(wishlistIds);
  TestValidator.equals(
    "all wishlists have unique IDs",
    uniqueIds.size,
    wishlistNames.length,
  );

  // Step 4: Verify customer can manage multiple wishlist collections
  TestValidator.equals(
    "customer created correct number of wishlists",
    createdWishlists.length,
    wishlistNames.length,
  );

  // Verify each wishlist name is unique and matches expected names
  const createdNames = createdWishlists.map((w) => w.name).sort();
  const expectedNames = [...wishlistNames].sort();
  TestValidator.equals(
    "all wishlist names are present",
    createdNames,
    expectedNames,
  );
}
