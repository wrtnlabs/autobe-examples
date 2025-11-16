import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";

/**
 * Validate that deleting an empty guest cart works correctly and makes the cart
 * unusable.
 *
 * Business goals:
 *
 * - Ensure that a guest cart without any IShoppingMallGuestCartItem line items
 *   can be deleted successfully via DELETE
 *   /shoppingMall/guestCarts/{guestCartId}.
 * - Verify that the backend does not require the presence of child items for
 *   deletion.
 * - Confirm that once deleted, subsequent operations treating the cart as
 *   existing will fail, approximating a "no longer exists" state even without a
 *   GET endpoint.
 *
 * Test steps:
 *
 * 1. Create a new guest cart using POST /shoppingMall/guestCarts with a minimal
 *    but realistic IShoppingMallGuestCart.ICreate payload.
 * 2. Assert that the created cart has an empty items array, proving that it is
 *    currently empty.
 * 3. Call DELETE /shoppingMall/guestCarts/{guestCartId} using
 *    api.functional.shoppingMall.guestCarts.erase.
 * 4. Verify the delete call completes without error.
 * 5. Attempt to delete the same cart again and expect an error, which indicates
 *    the cart is considered removed after the first deletion.
 */
export async function test_api_guest_cart_delete_with_no_items(
  connection: api.IConnection,
) {
  // 1. Create a new guest cart (with no items yet)
  const createBody = {
    guest_token: RandomGenerator.alphaNumeric(32),
    // ip is just a free-form string in the DTO, so we can simulate a realistic IPv4 string.
    ip: "203.0.113." + Math.floor(Math.random() * 255).toString(),
    // user_agent is also just a string; use a short paragraph to mimic a UA.
    user_agent: RandomGenerator.paragraph({ sentences: 3 }),
    // referrer must be a URI format string; use typia.random with appropriate tag.
    referrer: typia.random<string & tags.Format<"uri">>(),
    // region_code is optional; use a simple region code.
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const created: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 2. Ensure the newly created cart is empty (no guest cart items yet)
  TestValidator.equals(
    "newly created guest cart must have no items",
    created.items.length,
    0,
  );

  // 3. Delete the guest cart
  await api.functional.shoppingMall.guestCarts.erase(connection, {
    guestCartId: created.id,
  });

  // 4. Second deletion attempt should fail, indicating the cart is treated as removed
  await TestValidator.error(
    "second delete on the same guest cart id should fail",
    async () => {
      await api.functional.shoppingMall.guestCarts.erase(connection, {
        guestCartId: created.id,
      });
    },
  );
}
