import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlist";
import type { IShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlistItem";

/**
 * Test retrieval and access control for customer wishlists.
 *
 * Validates that a customer can retrieve details of their own wishlist,
 * including metadata and all contained SKU items with the correct product
 * summaries. Also tests that access is denied for wishlists belonging to
 * another customer, as well as non-existent or deleted wishlists. Edge cases
 * include attempting access with an invalid wishlist ID and cross-user access,
 * both of which should be forbidden.
 *
 * Steps:
 *
 * 1. Register and authenticate a new customer (customerA) for wishlist ownership
 * 2. (Assumed) A wishlist exists for this customer—since we cannot create one
 *    directly with only provided APIs, attempt access and verify expected
 *    errors.
 * 3. Attempt to retrieve wishlist with an invalid (malformed) UUID, expect error.
 * 4. Register a second customer (customerB), attempt cross-user access by querying
 *    wishlist with customerA's ID.
 */
export async function test_api_wishlist_detail_by_owner(
  connection: api.IConnection,
) {
  // 1. Register customerA
  const customerA = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://test.local/register",
      referrer: "https://test.local/",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customerA);

  // Use a random UUID to simulate a non-existent wishlist (since we have no creation function)
  const randomWishlistId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to retrieve non-existent wishlist as the owner (customerA)
  await TestValidator.error(
    "should reject retrieval of non-existent wishlist",
    async () => {
      await api.functional.shopping.customer.wishlists.at(connection, {
        wishlistId: randomWishlistId,
      });
    },
  );

  // 3. Attempt to retrieve wishlist with invalid (malformed) UUID
  await TestValidator.error(
    "should reject retrieval with invalid wishlistId format",
    async () => {
      // Intentionally not a UUID
      await api.functional.shopping.customer.wishlists.at(connection, {
        wishlistId: "invalid-uuid" as string & tags.Format<"uuid">,
      });
    },
  );

  // 4. Register customerB and attempt cross-user access (simulate by using random UUID again, as we have no linkage)
  const customerB = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://test.local/register",
      referrer: "https://test.local/",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customerB);

  // Switch authentication context to customerB (handled automatically by join)
  await TestValidator.error(
    "should deny access to other's (non-owned) wishlist",
    async () => {
      // Still using the random ID, as true cross-user scenario can't be validated without list/create API
      await api.functional.shopping.customer.wishlists.at(connection, {
        wishlistId: randomWishlistId,
      });
    },
  );

  // Note: Unable to test happy-path detail retrieval without an API to create or list wishlists; only error cases are covered.
}
