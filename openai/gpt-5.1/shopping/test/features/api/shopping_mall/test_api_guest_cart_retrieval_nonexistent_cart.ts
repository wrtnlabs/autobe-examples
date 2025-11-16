import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";

/**
 * Validate behavior when retrieving a non-existent guest cart.
 *
 * Business goal:
 *
 * - Ensure the public guest cart retrieval endpoint gracefully handles requests
 *   for carts that do not exist (for example, stale links, expired carts, or
 *   random IDs) by returning a standardized not-found style error instead of a
 *   successful payload or leaking internal details.
 *
 * Test flow:
 *
 * 1. Generate a syntactically valid random UUID value to be used as guestCartId.
 *    This UUID is extremely unlikely to correspond to any real guest cart in
 *    the test database.
 * 2. As an anonymous client (using the provided connection without any
 *    authentication), call GET /shoppingMall/guestCarts/{guestCartId} through
 *    api.functional.shoppingMall.guestCarts.at.
 * 3. Expect the call to fail with an HttpError representing a not-found style
 *    response (status 404). Use TestValidator.httpError to assert that:
 *
 *    - An HttpError is thrown, and
 *    - The status code equals 404.
 * 4. Do not assert on the exact error message payload to avoid coupling to
 *    internal texts; simply rely on the HTTP status-level contract.
 */
export async function test_api_guest_cart_retrieval_nonexistent_cart(
  connection: api.IConnection,
) {
  // 1. Generate a random, well-formed UUID for a guest cart that should not exist.
  const nonexistentGuestCartId = typia.random<string & tags.Format<"uuid">>();

  // 2-3. Attempt to retrieve this cart and assert we get a not-found HttpError (404).
  await TestValidator.httpError(
    "retrieving a non-existent guest cart should yield 404",
    404,
    async () => {
      await api.functional.shoppingMall.guestCarts.at(connection, {
        guestCartId: nonexistentGuestCartId,
      });
    },
  );
}
