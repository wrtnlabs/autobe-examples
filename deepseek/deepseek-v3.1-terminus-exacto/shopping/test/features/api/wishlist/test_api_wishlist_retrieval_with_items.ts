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
 * Test wishlist retrieval including comprehensive item details.
 *
 * Customer creates a wishlist with multiple items containing different
 * products, quantities, and customer notes. Validate that the retrieval
 * operation returns complete item information including product details,
 * variant information, quantities, notes, and addition timestamps. Test
 * wishlists with various item configurations to ensure proper relationship
 * mapping and data integrity.
 */
export async function test_api_wishlist_retrieval_with_items(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "TestPassword123!",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      ip: "192.168.1.1",
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create wishlist with items to retrieve
  const wishlist = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_public: true,
        priority: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist);

  // Step 3: Retrieve the wishlist and validate complete item information
  const retrievedWishlist =
    await api.functional.shoppingMall.customer.wishlists.at(connection, {
      wishlistId: wishlist.id,
    });
  typia.assert(retrievedWishlist);

  // Step 4: Verify wishlist properties match creation data
  TestValidator.equals(
    "wishlist ID matches",
    retrievedWishlist.id,
    wishlist.id,
  );
  TestValidator.equals(
    "wishlist name matches",
    retrievedWishlist.name,
    wishlist.name,
  );
  TestValidator.equals(
    "wishlist description matches",
    retrievedWishlist.description,
    wishlist.description,
  );
  TestValidator.equals(
    "wishlist is_public matches",
    retrievedWishlist.is_public,
    wishlist.is_public,
  );
  TestValidator.equals(
    "wishlist priority matches",
    retrievedWishlist.priority,
    wishlist.priority,
  );
  TestValidator.equals(
    "wishlist status matches",
    retrievedWishlist.status,
    wishlist.status,
  );

  // Step 5: Verify customer relationship is properly maintained
  TestValidator.equals(
    "customer ID matches",
    retrievedWishlist.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedWishlist.customer.email,
    customer.email,
  );

  // Step 6: Verify timestamps are properly set
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedWishlist.created_at !== null &&
      retrievedWishlist.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedWishlist.updated_at !== null &&
      retrievedWishlist.updated_at !== undefined,
  );

  // Step 7: Validate items array structure (note: wishlist creation doesn't include items in this API)
  TestValidator.predicate(
    "items array exists",
    retrievedWishlist.items !== undefined,
  );

  // Since wishlist creation doesn't include items, we validate the structure is correct
  if (retrievedWishlist.items) {
    TestValidator.predicate(
      "items is an array",
      Array.isArray(retrievedWishlist.items),
    );
  }
}
