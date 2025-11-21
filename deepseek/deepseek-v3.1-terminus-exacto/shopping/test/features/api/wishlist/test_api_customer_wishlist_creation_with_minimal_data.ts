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
 * Test wishlist creation with minimal required fields only.
 *
 * Validates that customers can create wishlists using only mandatory fields
 * (name, is_public, priority, status) without providing optional description.
 * Ensures the system handles minimal input correctly and applies appropriate
 * default values while creating functional wishlists.
 */
export async function test_api_customer_wishlist_creation_with_minimal_data(
  connection: api.IConnection,
) {
  // Step 1: Customer authentication - create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: undefined,
      ip: undefined,
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create wishlist with minimal required fields only
  const wishlistName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const wishlistData = {
    name: wishlistName,
    is_public: false,
    priority: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >(),
    status: "active",
    // Intentionally omit description field to test minimal input
  } satisfies IShoppingMallWishlist.ICreate;

  const createdWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistData,
    });
  typia.assert(createdWishlist);

  // Step 3: Validate wishlist creation with minimal data
  TestValidator.equals(
    "wishlist name matches input",
    createdWishlist.name,
    wishlistName,
  );
  TestValidator.equals(
    "wishlist is_public matches input",
    createdWishlist.is_public,
    false,
  );
  TestValidator.equals(
    "wishlist priority matches input",
    createdWishlist.priority,
    wishlistData.priority,
  );
  TestValidator.equals(
    "wishlist status matches input",
    createdWishlist.status,
    "active",
  );

  // Validate that description field is properly handled as undefined
  TestValidator.predicate(
    "description field is undefined when not provided",
    createdWishlist.description === undefined,
  );

  // Validate system-generated fields
  TestValidator.predicate(
    "wishlist has customer relationship",
    createdWishlist.customer !== undefined,
  );
  TestValidator.equals(
    "wishlist customer ID matches authenticated customer",
    createdWishlist.customer.id,
    customer.id,
  );

  // Validate timestamp fields
  TestValidator.predicate(
    "wishlist has creation timestamp",
    createdWishlist.created_at !== undefined &&
      createdWishlist.created_at.length > 0,
  );
  TestValidator.predicate(
    "wishlist has update timestamp",
    createdWishlist.updated_at !== undefined &&
      createdWishlist.updated_at.length > 0,
  );

  // Validate items array is properly initialized
  TestValidator.predicate(
    "wishlist items array exists",
    createdWishlist.items !== undefined,
  );
  TestValidator.equals(
    "new wishlist has empty items array",
    createdWishlist.items?.length ?? 0,
    0,
  );
}
