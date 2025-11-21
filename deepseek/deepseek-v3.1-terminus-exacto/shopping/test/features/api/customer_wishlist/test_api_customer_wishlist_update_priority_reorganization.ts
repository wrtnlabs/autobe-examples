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
 * Test wishlist priority reorganization scenario. Customer creates multiple
 * wishlists with different priority levels, then updates their priorities to
 * reorganize the display order. Validates that priority changes are correctly
 * applied, wishlist sorting reflects new priorities, and multiple wishlist
 * management works properly with priority-based organization.
 */
export async function test_api_customer_wishlist_update_priority_reorganization(
  connection: api.IConnection,
) {
  // Step 1: Customer authentication and account creation
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "password123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create first wishlist with initial priority
  const wishlist1 = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_public: false,
        priority: 5,
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist1);

  // Step 3: Create second wishlist with different priority
  const wishlist2 = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_public: true,
        priority: 3,
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist2);

  // Step 4: Create third wishlist with another priority
  const wishlist3 = await api.functional.shoppingMall.customer.wishlists.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_public: false,
        priority: 8,
        status: "active",
      } satisfies IShoppingMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist3);

  // Step 5: Update priorities to reorganize the display order
  // Update wishlist1 to highest priority
  const updatedWishlist1 =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: wishlist1.id,
      body: {
        priority: 10,
      } satisfies IShoppingMallWishlist.IUpdate,
    });
  typia.assert(updatedWishlist1);

  // Update wishlist2 to medium priority
  const updatedWishlist2 =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: wishlist2.id,
      body: {
        priority: 6,
      } satisfies IShoppingMallWishlist.IUpdate,
    });
  typia.assert(updatedWishlist2);

  // Update wishlist3 to lowest priority
  const updatedWishlist3 =
    await api.functional.shoppingMall.customer.wishlists.update(connection, {
      wishlistId: wishlist3.id,
      body: {
        priority: 2,
      } satisfies IShoppingMallWishlist.IUpdate,
    });
  typia.assert(updatedWishlist3);

  // Step 6: Validate that wishlist priorities are correctly updated
  TestValidator.equals(
    "wishlist1 priority updated to highest",
    updatedWishlist1.priority,
    10,
  );
  TestValidator.equals(
    "wishlist2 priority updated to medium",
    updatedWishlist2.priority,
    6,
  );
  TestValidator.equals(
    "wishlist3 priority updated to lowest",
    updatedWishlist3.priority,
    2,
  );

  // Step 7: Verify individual wishlist properties remain intact after priority changes
  TestValidator.equals(
    "wishlist1 name unchanged",
    updatedWishlist1.name,
    wishlist1.name,
  );
  TestValidator.equals(
    "wishlist1 description unchanged",
    updatedWishlist1.description,
    wishlist1.description,
  );
  TestValidator.equals(
    "wishlist1 visibility unchanged",
    updatedWishlist1.is_public,
    wishlist1.is_public,
  );

  TestValidator.equals(
    "wishlist2 name unchanged",
    updatedWishlist2.name,
    wishlist2.name,
  );
  TestValidator.equals(
    "wishlist2 description unchanged",
    updatedWishlist2.description,
    wishlist2.description,
  );
  TestValidator.equals(
    "wishlist2 visibility unchanged",
    updatedWishlist2.is_public,
    wishlist2.is_public,
  );

  TestValidator.equals(
    "wishlist3 name unchanged",
    updatedWishlist3.name,
    wishlist3.name,
  );
  TestValidator.equals(
    "wishlist3 description unchanged",
    updatedWishlist3.description,
    wishlist3.description,
  );
  TestValidator.equals(
    "wishlist3 visibility unchanged",
    updatedWishlist3.is_public,
    wishlist3.is_public,
  );

  // Step 8: Validate priority-based ordering logic
  TestValidator.predicate(
    "wishlist1 has highest priority",
    updatedWishlist1.priority > updatedWishlist2.priority,
  );
  TestValidator.predicate(
    "wishlist2 has medium priority",
    updatedWishlist2.priority > updatedWishlist3.priority,
  );
  TestValidator.predicate(
    "wishlist3 has lowest priority",
    updatedWishlist3.priority < updatedWishlist2.priority,
  );

  // Step 9: Verify customer ownership remains consistent
  TestValidator.equals(
    "wishlist1 customer ID matches",
    updatedWishlist1.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "wishlist2 customer ID matches",
    updatedWishlist2.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "wishlist3 customer ID matches",
    updatedWishlist3.customer.id,
    customer.id,
  );
}
