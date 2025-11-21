import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test wishlist creation with minimal required fields only, validating that
 * optional fields like description can be omitted and default values are
 * properly applied.
 */
export async function test_api_wishlist_creation_with_minimal_data(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: undefined,
      ip: undefined,
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create wishlist with minimal required fields only
  const wishlistName = RandomGenerator.paragraph({ sentences: 3 });
  const wishlistPriority = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();

  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {
        name: wishlistName,
        description: undefined, // Omitting optional field
        is_public: false,
        priority: wishlistPriority,
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist);

  // Step 3: Validate business logic - wishlist created with correct minimal data
  TestValidator.equals(
    "wishlist name should match input",
    wishlist.name,
    wishlistName,
  );
  TestValidator.equals(
    "wishlist description should be undefined when omitted",
    wishlist.description,
    undefined,
  );
  TestValidator.equals(
    "wishlist is_public should match input",
    wishlist.is_public,
    false,
  );
  TestValidator.equals(
    "wishlist priority should match input",
    wishlist.priority,
    wishlistPriority,
  );
  TestValidator.equals(
    "wishlist status should match input",
    wishlist.status,
    "active",
  );
  TestValidator.equals(
    "wishlist customer ID should match authenticated customer",
    wishlist.customer.id,
    customer.id,
  );
}
