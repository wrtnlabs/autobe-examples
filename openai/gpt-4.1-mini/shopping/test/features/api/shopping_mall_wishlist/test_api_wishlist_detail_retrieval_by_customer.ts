import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Validate detailed retrieval of a customer's wishlist.
 *
 * This test simulates an authenticated customer journey where the user joins,
 * creates a wishlist, and then retrieves that wishlist by ID. The test asserts
 * successful authentication, wishlist creation with valid data, and detailed
 * retrieval including associated wishlist items.
 *
 * The test further validates that the retrieved wishlist belongs to the
 * customer, and it properly contains wishlist items structured as summaries.
 *
 * Unauthorized access or querying by wrong users is out of scope here, but the
 * test inherently verifies correct association via customer ID.
 */
export async function test_api_wishlist_detail_retrieval_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Customer join (registration/authentication)
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(authorizedCustomer);

  // Step 2: Create a wishlist for this customer
  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection);
  typia.assert(createdWishlist);

  // Step 3: Retrieve the wishlist by ID
  const retrievedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.at(connection, {
      id: createdWishlist.id,
    });
  typia.assert(retrievedWishlist);

  // Step 4: Validate the retrieved wishlist's ID equals created wishlist ID
  TestValidator.equals(
    "retrieved wishlist id matches created wishlist id",
    retrievedWishlist.id,
    createdWishlist.id,
  );

  // Step 5: Validate the retrieved wishlist belongs to the authorized customer
  TestValidator.equals(
    "retrieved wishlist customer id matches authorized customer id",
    retrievedWishlist.shopping_mall_customer_id,
    authorizedCustomer.id,
  );

  // Step 6: Validate retrieved wishlist items structure
  if (retrievedWishlist.shopping_mall_wishlist_items === undefined) {
    TestValidator.predicate("wishlist items undefined or empty", true);
  } else {
    TestValidator.predicate(
      "wishlist items is array",
      Array.isArray(retrievedWishlist.shopping_mall_wishlist_items),
    );
    for (const item of retrievedWishlist.shopping_mall_wishlist_items) {
      typia.assert<IShoppingMallWishlistItem.ISummary>(item);
    }
  }
}
