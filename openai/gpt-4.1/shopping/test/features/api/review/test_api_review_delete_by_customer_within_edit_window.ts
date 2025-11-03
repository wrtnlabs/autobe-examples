import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";

/**
 * Tests that an authenticated customer can delete their own review within the
 * allowed edit/removal window.
 *
 * - Registers a new customer account (auth/customer/join)
 * - Simulates an owned review with a random UUID
 * - Authenticates as the created customer
 * - Calls erase (DELETE /shopping/customer/reviews/{reviewId}) and expects no
 *   error (void return)
 * - No further validation possible due to lack of subsequent review read/search
 *   endpoints
 */
export async function test_api_review_delete_by_customer_within_edit_window(
  connection: api.IConnection,
) {
  // Register and authenticate as a new customer
  const customerAuth: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: "https://shoppingmall.example.com/", // Test context URL
        referrer: "https://shoppingmall.example.com/landing", // Test referrer
      } satisfies IShoppingCustomer.ICreate,
    });
  typia.assert(customerAuth);

  // Simulate a review owned by this customer (actual creation not possible in current API scope)
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Attempt to delete the review as the customer
  await api.functional.shopping.customer.reviews.erase(connection, {
    reviewId,
  });
  // Success: API call completed with no error (void return)
}
