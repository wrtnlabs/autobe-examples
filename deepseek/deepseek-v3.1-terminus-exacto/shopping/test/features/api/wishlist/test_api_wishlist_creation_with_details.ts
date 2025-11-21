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
 * Comprehensive wishlist creation test with detailed field validation.
 *
 * This test validates that customers can create wishlists with all optional
 * fields including descriptions, priority settings, and custom status values.
 * It ensures proper data storage, customer association, and system-managed
 * field population.
 *
 * Test workflow:
 *
 * 1. Create customer account for authentication
 * 2. Create detailed wishlist with maximum field values
 * 3. Validate response contains all provided data
 * 4. Verify customer association and system timestamps
 * 5. Test boundary values for priority and field lengths
 */
export async function test_api_wishlist_creation_with_details(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(2),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      ip: "192.168.1.1",
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create detailed wishlist with all optional fields
  const wishlistName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const wishlistDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 8,
    wordMin: 4,
    wordMax: 8,
  });
  const wishlistPriority = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();

  const createdWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: wishlistName,
        description: wishlistDescription,
        is_public: true,
        priority: wishlistPriority,
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(createdWishlist);

  // Step 3: Validate response contains all provided data
  TestValidator.equals(
    "wishlist name matches input",
    createdWishlist.name,
    wishlistName,
  );
  TestValidator.equals(
    "wishlist description matches input",
    createdWishlist.description,
    wishlistDescription,
  );
  TestValidator.equals(
    "wishlist priority matches input",
    createdWishlist.priority,
    wishlistPriority,
  );
  TestValidator.equals(
    "wishlist is public as specified",
    createdWishlist.is_public,
    true,
  );
  TestValidator.equals(
    "wishlist status is active",
    createdWishlist.status,
    "active",
  );

  // Step 4: Verify customer association
  TestValidator.equals(
    "wishlist customer ID matches authenticated customer",
    createdWishlist.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "wishlist customer email matches",
    createdWishlist.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "wishlist customer first name matches",
    createdWishlist.customer.first_name,
    customer.first_name,
  );
  TestValidator.equals(
    "wishlist customer last name matches",
    createdWishlist.customer.last_name,
    customer.last_name,
  );

  // Step 5: Test boundary values for priority
  const minPriorityWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: "Minimum Priority Wishlist",
        description: "Test wishlist with minimum priority",
        is_public: false,
        priority: 1,
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(minPriorityWishlist);
  TestValidator.equals(
    "minimum priority is accepted",
    minPriorityWishlist.priority,
    1,
  );

  const maxPriorityWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: "Maximum Priority Wishlist",
        description: "Test wishlist with maximum priority",
        is_public: true,
        priority: 10,
        status: "archived",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(maxPriorityWishlist);
  TestValidator.equals(
    "maximum priority is accepted",
    maxPriorityWishlist.priority,
    10,
  );

  // Step 6: Test wishlist with minimal required fields
  const minimalWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: "Minimal Wishlist",
        is_public: false,
        priority: 5,
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(minimalWishlist);
  TestValidator.equals(
    "minimal wishlist has no description",
    minimalWishlist.description,
    undefined,
  );
  TestValidator.equals(
    "minimal wishlist is private",
    minimalWishlist.is_public,
    false,
  );

  // Step 7: Test field length boundaries
  const longNameWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: RandomGenerator.alphabets(255), // Maximum allowed name length
        description: RandomGenerator.content({
          paragraphs: 10,
          sentenceMin: 20,
          sentenceMax: 30,
        }), // Long description
        is_public: false,
        priority: 5,
        status: "shared",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(longNameWishlist);
  TestValidator.predicate(
    "long name wishlist created successfully",
    longNameWishlist.name.length > 0,
  );

  // Step 8: Test different status values
  const sharedWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: "Shared Wishlist",
        description: "Test shared status",
        is_public: true,
        priority: 3,
        status: "shared",
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(sharedWishlist);
  TestValidator.equals(
    "shared status is accepted",
    sharedWishlist.status,
    "shared",
  );
}
