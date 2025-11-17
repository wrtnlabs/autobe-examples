import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Test updating an existing wishlist owned by a customer.
 *
 * This test validates the customer wishlist creation and ownership. Since the
 * update API for wishlists is not provided, this test confirms creation
 * behavior and data consistency.
 *
 * Test steps:
 *
 * 1. Customer signs up
 * 2. Customer creates a wishlist
 * 3. Confirm the wishlist belongs to the customer
 */
export async function test_api_wishlist_update_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Customer sign-up
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";
  const href = "https://shoppingmall.example.com/signup";
  const referrer = "https://shoppingmall.example.com";
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerAuth);

  // Step 2: Create a new wishlist
  const wishlistName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 8,
  });
  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.shoppingMallWishlists.create(
      connection,
      {
        body: {
          name: wishlistName,
        } satisfies IShoppingMallWishlist.ICreate,
      },
    );
  typia.assert(createdWishlist);

  TestValidator.equals(
    "wishlist customer id matches auth id",
    createdWishlist.shopping_mall_customer_id,
    customerAuth.id,
  );
}
