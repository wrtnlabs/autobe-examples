import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestCartItem";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Validate behavior of guest cart item listing when the guest cart does not
 * exist.
 *
 * ## Business purpose
 *
 * This test verifies that the guest-cart item listing endpoint for shopping
 * mall behaves correctly when a client provides a guestCartId that does not
 * correspond to any existing guest cart. In a real backend, such a request
 * should fail with an HTTP error (typically 404 Not Found, or possibly 400 for
 * an invalid identifier format) and must not expose internal implementation
 * details. In simulation mode, the SDK returns random but valid data instead of
 * real HTTP errors, so the test must also confirm that the simulated success
 * response conforms to the expected DTO shape.
 *
 * ## Test strategy
 *
 * 1. Use a random UUID-like string as a "well-formed but likely non-existent"
 *    guestCartId for calls that are intended to fail against a real backend.
 * 2. Use a clearly malformed identifier (e.g., a very short token) to exercise the
 *    path where the backend may treat the ID as invalid format.
 * 3. Branch on `connection.simulate`:
 *
 *    - When `connection.simulate === true` (Nestia simulator):
 *
 *         - Calling the endpoint always returns a randomly generated
 *                   `IPageIShoppingMallGuestCartItem.ISummary`.
 *         - Assert the type shape of the response using `typia.assert`.
 *         - Optionally perform lightweight logical checks on pagination values.
 *    - When `connection.simulate !== true` (real backend):
 *
 *         - For a well-formed, random UUID-like guestCartId, expect an `HttpError` with a
 *                   client-error status such as 404 or 400, using
 *                   `TestValidator.httpError`.
 *         - For a clearly malformed guestCartId, likewise expect an `HttpError` with a
 *                   client-error status such as 400 or 404.
 * 4. Do not attempt to validate error response body structures or error messages,
 *    because no shared error DTO is provided and we must avoid assuming
 *    platform-specific schemas or message formats.
 * 5. Do not create any guest carts or cart items in this test; it focuses solely
 *    on the negative-path behavior for non-existent carts and the DTO
 *    correctness on simulated success.
 */
export async function test_api_guest_cart_items_listing_for_nonexistent_cart(
  connection: api.IConnection,
) {
  // Branch behavior depending on whether the SDK is running in simulate mode.
  if (connection.simulate === true) {
    // In simulate mode, the endpoint returns a random
    // IPageIShoppingMallGuestCartItem.ISummary instead of throwing HttpError.
    const response: IPageIShoppingMallGuestCartItem.ISummary =
      await api.functional.shoppingMall.guestCarts.items.index(connection, {
        guestCartId: typia.random<string & tags.Format<"uuid">>(),
      });

    // Validate that the simulator-generated response strictly conforms to the
    // expected DTO shape.
    typia.assert<IPageIShoppingMallGuestCartItem.ISummary>(response);

    // Optional lightweight business sanity checks on pagination metadata.
    const pagination: IPage.IPagination = response.pagination;
    TestValidator.predicate(
      "pagination current page index must be non-negative",
      pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit must be non-negative",
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records must be non-negative",
      pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages must be non-negative",
      pagination.pages >= 0,
    );

    // If there are records, ensure the data array is non-empty; if there are no
    // records, the data array can be empty.
    if (pagination.records > 0) {
      TestValidator.predicate(
        "when records > 0, data array should not be empty",
        response.data.length > 0,
      );
    }

    return;
  }

  // For a real backend (non-simulate mode), we expect HTTP errors.

  // 1. Well-formed but likely non-existent UUID-like guestCartId.
  const nonExistentCartId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.httpError(
    "non-existent guest cart should return client error (e.g., 404 or 400)",
    [400, 404],
    async () => {
      return await api.functional.shoppingMall.guestCarts.items.index(
        connection,
        {
          guestCartId: nonExistentCartId,
        },
      );
    },
  );

  // 2. Clearly malformed guestCartId to exercise validation for bad formats.
  const malformedCartId = "invalid-cart-id";

  await TestValidator.httpError(
    "malformed guest cart id should return client error (e.g., 400 or 404)",
    [400, 404],
    async () => {
      return await api.functional.shoppingMall.guestCarts.items.index(
        connection,
        {
          guestCartId: malformedCartId,
        },
      );
    },
  );
}
