import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingGuestCartItem";

/**
 * Validate public retrieval of guest shopping cart by UUID.
 *
 * This test verifies that any unauthenticated user can fetch a guest cart by
 * its unique UUID if it exists, without exposing any user account or personal
 * data. It ensures that only the allowed public metadata (id, session_key,
 * timestamps, items) are included as per DTO definition, and relies on
 * typia.assert() for strict shape/type validation. Queries for expired or
 * invalid carts are expected to yield errors (e.g., not-found), as per the
 * endpoint's contract.
 *
 * 1. Generate a random guest cart UUID (simulate cart existence)
 * 2. Fetch the guest cart by its ID via public endpoint (unauthed)
 * 3. Validate that the response shape matches the DTO definition for allowed
 *    fields only
 * 4. Attempt retrieval using a random non-existent/expired guest cart UUID and
 *    confirm an error is thrown (no null/successful response)
 */
export async function test_api_guest_cart_at_public_access(
  connection: api.IConnection,
) {
  // 1. Generate a random guest cart ID (UUID)
  const guestCartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Fetch the guest cart by its UUID as a public user
  const cart: IShoppingGuestCartItem =
    await api.functional.shopping.guestCarts.at(connection, {
      guestCartId,
    });
  typia.assert(cart);
  TestValidator.equals(
    "cart id must match requested UUID",
    cart.id,
    guestCartId,
  );
  // (No further per-field checks required; typia.assert validates shape per DTO.)

  // 3. Attempt retrieval with random non-existent/expired ID; expect error
  const fakeCartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "non-existent or expired guest cart should result in error",
    async () => {
      await api.functional.shopping.guestCarts.at(connection, {
        guestCartId: fakeCartId,
      });
    },
  );
}
