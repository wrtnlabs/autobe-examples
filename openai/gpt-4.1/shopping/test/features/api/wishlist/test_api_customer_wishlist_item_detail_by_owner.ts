import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlistItem";

/**
 * Verify that a customer can retrieve detailed information of their own
 * wishlist item.
 *
 * This test covers the following business steps:
 *
 * 1. Register a new customer and establish authenticated session
 * 2. Create a wishlist structure for the customer (by business rule, likely
 *    auto-created on registration)
 * 3. Add a SKU item to the wishlist
 * 4. Retrieve the detail of the wishlist item with the API (only allowed for
 *    owner)
 * 5. Validate the returned item links to the correct SKU, contains expected
 *    metadata, and that business rules enforce ownership – including negative
 *    test for forbidden access by a different customer
 */
export async function test_api_customer_wishlist_item_detail_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://test-case.example.com/onboarding",
    referrer: "https://test-case.example.com/landing",
    ip: undefined,
  } satisfies IShoppingCustomer.ICreate;
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerInput,
    });
  typia.assert(customer);

  // 2. The wishlist must already exist for the customer (implicit per business rule, typically auto-generated on join)
  // Assume customer.id == wishlistId for direct mapping
  const wishlistId = customer.id;

  // 3. Add an item to the wishlist
  // Generate a random SKU code (in real tests this should exist, but here only structure is validated)
  const sku_code = RandomGenerator.alphaNumeric(16);
  const itemInput = { sku_code } satisfies IShoppingWishlistItem.ICreate;
  const item: IShoppingWishlistItem =
    await api.functional.shopping.customer.wishlists.items.create(connection, {
      wishlistId,
      body: itemInput,
    });
  typia.assert(item);
  TestValidator.equals("correct SKU code", item.sku.sku_code, sku_code);
  TestValidator.predicate(
    "wishlist item id is defined",
    typeof item.id === "string" && item.id.length > 0,
  );
  TestValidator.predicate(
    "wishlist item added_at is valid ISO string",
    typeof item.added_at === "string" &&
      !Number.isNaN(Date.parse(item.added_at)),
  );

  // 4. Retrieve that item as the owner
  const retrieved: IShoppingWishlistItem =
    await api.functional.shopping.customer.wishlists.items.at(connection, {
      wishlistId,
      itemId: item.id,
    });
  typia.assert(retrieved);
  TestValidator.equals("wishlist item id matches", retrieved.id, item.id);
  TestValidator.equals("SKU code matches", retrieved.sku.sku_code, sku_code);

  // 5. Negative test: attempt access with another customer
  const altCustomerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://test-case.example.com/onboarding-alt",
    referrer: "https://test-case.example.com/landing",
    ip: undefined,
  } satisfies IShoppingCustomer.ICreate;
  const anotherCustomer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: altCustomerInput,
    });
  typia.assert(anotherCustomer);
  // Attempt access to the first customer's wishlist item (should fail)
  await TestValidator.error("forbidden access for non-owner", async () => {
    await api.functional.shopping.customer.wishlists.items.at(connection, {
      wishlistId,
      itemId: item.id,
    });
  });
}
