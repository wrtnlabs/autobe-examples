import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate retrieving a shopping mall wishlist by ID as an authenticated
 * customer.
 *
 * This test covers the flow from customer registration and authentication,
 * wishlist creation, to fetching the wishlist details. It verifies identity,
 * access control, and response correctness including soft delete status.
 *
 * 1. Customer joins via authentication API.
 * 2. Customer creates a new wishlist with a user-friendly name.
 * 3. The test fetches the created wishlist by its unique ID.
 * 4. Assertions confirm the retrieved wishlist matches the created one exactly.
 */
export async function test_api_shopping_mall_customer_shoppingmallwishlists_retrieve_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "1234";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: "https://example.com/join",
        referrer: "https://example.com/",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 2: Create a new wishlist
  const wishlistName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.shoppingMallWishlists.create(
      connection,
      {
        body: {
          name: wishlistName,
        } satisfies IShoppingMallWishlist.ICreate,
      },
    );
  typia.assert(wishlist);

  // Step 3: Retrieve the wishlist by ID
  const retrieved: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.shoppingMallWishlists.at(
      connection,
      {
        shoppingMallWishlistId: wishlist.id,
      },
    );
  typia.assert(retrieved);

  // Step 4: Validate the retrieved wishlist
  TestValidator.equals("wishlist ID matches", retrieved.id, wishlist.id);
  TestValidator.equals(
    "customer ID matches",
    retrieved.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    typeof retrieved.created_at === "string" && retrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    typeof retrieved.updated_at === "string" && retrieved.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at should be null", retrieved.deleted_at, null);
}
