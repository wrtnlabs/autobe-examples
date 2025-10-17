import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Test complete wishlist creation workflow for authenticated customers.
 *
 * This test validates the end-to-end process of customer registration and
 * wishlist creation in the shopping mall platform. The test follows a realistic
 * user journey:
 *
 * 1. Register a new customer account with valid credentials
 * 2. Verify authentication tokens are properly issued
 * 3. Create a named wishlist using the authenticated customer context
 * 4. Validate the wishlist is successfully created with proper metadata
 * 5. Confirm wishlist ID and name are correctly returned
 *
 * The test ensures that the wishlist creation functionality works correctly for
 * authenticated customers, enabling them to organize products for future
 * purchase consideration.
 */
export async function test_api_wishlist_creation_by_authenticated_customer(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerData,
    });

  typia.assert(authorizedCustomer);

  // Step 2: Verify customer registration results
  TestValidator.equals(
    "customer email matches input",
    authorizedCustomer.email,
    customerData.email,
  );

  // Step 3: Create a wishlist with a descriptive name
  const wishlistNames = [
    "Holiday Gifts",
    "Favorites",
    "Birthday Ideas",
    "Wishlist",
    "Shopping List",
  ] as const;
  const wishlistData = {
    name: RandomGenerator.pick(wishlistNames),
  } satisfies IShoppingMallWishlist.ICreate;

  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistData,
    });

  typia.assert(createdWishlist);

  // Step 4: Validate wishlist creation results
  TestValidator.equals(
    "wishlist name matches input",
    createdWishlist.name,
    wishlistData.name,
  );
}
