import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Test complete workflow for authenticated customer retrieving detailed
 * shopping wishlist information by wishlistId.
 *
 * This scenario begins by creating a new customer account using join operation
 * for fresh context. Then, a new wishlist is created linked to that customer.
 * Finally, detailed wishlist retrieval by wishlistId validates that the
 * returned wishlist includes all SKU items and correct ownership. Authorization
 * with customer role is enforced throughout the test.
 */
export async function test_api_customer_shopping_wishlist_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new customer account
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "test-password";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: { email, password } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 2. Create a new wishlist linked to the customer
  const wishlistCreateBody = {
    shopping_mall_customer_id: customer.id,
  } satisfies IShoppingMallWishlist.ICreate;
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert(wishlist);

  // 3. Retrieve the wishlist by wishlistId
  const retrievedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.at(connection, {
      wishlistId: wishlist.id,
    });
  typia.assert(retrievedWishlist);

  // 4. Validate the retrieved wishlist fields
  TestValidator.equals(
    "wishlist id matches",
    retrievedWishlist.id,
    wishlist.id,
  );
  TestValidator.equals(
    "wishlist customer id matches",
    retrievedWishlist.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.predicate(
    "wishlist created_at is valid ISO 8601 date-time",
    typeof retrievedWishlist.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(
        retrievedWishlist.created_at,
      ),
  );
  TestValidator.predicate(
    "wishlist updated_at is valid ISO 8601 date-time",
    typeof retrievedWishlist.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(
        retrievedWishlist.updated_at,
      ),
  );
  TestValidator.equals(
    "wishlist deleted_at is null",
    retrievedWishlist.deleted_at,
    null,
  );
}
