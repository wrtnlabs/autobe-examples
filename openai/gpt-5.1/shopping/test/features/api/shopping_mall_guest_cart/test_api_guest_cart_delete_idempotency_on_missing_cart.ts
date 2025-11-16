import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";

/**
 * Validate idempotent DELETE behavior for guest carts when the target cart is
 * missing.
 *
 * Business goal: Ensure that clients can safely call DELETE
 * /shoppingMall/guestCarts/{guestCartId} even when the cart has already been
 * removed or never existed, and that the platform exposes a clear, stable
 * contract for missing-resource behavior.
 *
 * Scenario:
 *
 * 1. Create a guest cart via POST /shoppingMall/guestCarts, using a realistic
 *    IShoppingMallGuestCart.ICreate payload (guest_token, ip, user_agent,
 *    referrer, region_code).
 * 2. Immediately delete that cart once using
 *    api.functional.shoppingMall.guestCarts.erase and assert that no error
 *    occurs.
 * 3. Attempt to delete the same guestCartId again and assert that the backend
 *    responds with a 404-style HttpError, documenting that the implementation
 *    treats missing carts as not-found rather than silent success.
 * 4. Additionally, attempt to delete a completely random, never-created UUID and
 *    assert the same 404 HttpError behavior, to validate consistent handling
 *    for both previously-deleted and never-existing carts.
 *
 * Validations:
 *
 * - The first DELETE call completes successfully without throwing.
 * - The second DELETE for the same id results in an HttpError with status 404.
 * - A DELETE for a random, never-existing guestCartId also results in an
 *   HttpError with status 404.
 *
 * Notes:
 *
 * - Request body data for cart creation must be constructed using `satisfies
 *   IShoppingMallGuestCart.ICreate` with no `as any`.
 * - Random data must be generated with typia.random or RandomGenerator.
 * - All API calls must be awaited, and TestValidator.httpError must be used (with
 *   explicit 404) to assert error behavior.
 */
export async function test_api_guest_cart_delete_idempotency_on_missing_cart(
  connection: api.IConnection,
) {
  // 1. Create a guest cart with realistic random metadata
  const createBody = {
    guest_token: RandomGenerator.alphaNumeric(32),
    ip: "192.168.0.1",
    user_agent: "Mozilla/5.0 (E2E Test Guest Cart)",
    referrer: "https://example.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const createdCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: createBody,
    });
  typia.assert(createdCart);

  // 2. First delete should succeed without error
  await api.functional.shoppingMall.guestCarts.erase(connection, {
    guestCartId: createdCart.id,
  });

  // 3. Second delete of the same id should yield 404 HttpError
  await TestValidator.httpError(
    "second delete on same guestCartId should yield 404",
    404,
    async () => {
      await api.functional.shoppingMall.guestCarts.erase(connection, {
        guestCartId: createdCart.id,
      });
    },
  );

  // 4. Delete a random, never-existing UUID should also yield 404
  const randomMissingId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.httpError(
    "delete with never-existing guestCartId should yield 404",
    404,
    async () => {
      await api.functional.shoppingMall.guestCarts.erase(connection, {
        guestCartId: randomMissingId,
      });
    },
  );
}
