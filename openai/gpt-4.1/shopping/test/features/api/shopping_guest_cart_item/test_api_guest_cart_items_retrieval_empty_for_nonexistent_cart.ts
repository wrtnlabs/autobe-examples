import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingGuestCartItem";

/**
 * Validate that retrieving items for a non-existent guest cart returns an empty
 * list.
 *
 * This test ensures the API responds gracefully and correctly (with a valid,
 * empty items array) when a guest user provides an unknown or expired
 * guestCartId. The response must NOT be an error and must NOT leak any internal
 * details.
 *
 * Steps:
 *
 * 1. Generate a random UUID as the non-existent guestCartId.
 * 2. Call the guest cart items index endpoint with the UUID.
 * 3. Confirm that the response is valid (by type assertion), and contains items:
 *    [].
 */
export async function test_api_guest_cart_items_retrieval_empty_for_nonexistent_cart(
  connection: api.IConnection,
) {
  // 1. Generate a random non-existent guestCartId
  const guestCartId = typia.random<string & tags.Format<"uuid">>();

  // 2. Retrieve items for this fake/non-existent cart
  const output: IShoppingGuestCartItem.ISummary =
    await api.functional.shopping.guestCarts.items.index(connection, {
      guestCartId,
    });
  typia.assert(output);

  // 3. Validate empty items array
  TestValidator.equals(
    "items array is empty for non-existent guest cart",
    output.items.length,
    0,
  );

  // 4. (Implicit) Check no error thrown and nothing else is exposed
}
