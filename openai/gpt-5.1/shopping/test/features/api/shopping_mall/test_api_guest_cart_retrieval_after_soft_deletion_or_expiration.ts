import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";

/**
 * Validate guest cart retrieval behavior after deletion.
 *
 * Business goal: Ensure that once a guest cart has been deleted via the public
 * erase endpoint, it can no longer be retrieved by its identifier using the
 * public retrieval endpoint, and that clients can rely on this lifecycle
 * behavior when implementing cleanup and recovery flows.
 *
 * Scenario:
 *
 * 1. Create a new guest cart for an anonymous visitor using POST
 *    /shoppingMall/guestCarts.
 * 2. Retrieve the created cart via GET /shoppingMall/guestCarts/{guestCartId} and
 *    validate structural invariants (type correctness, matching id, no
 *    deleted_at for a fresh cart, and items array present).
 * 3. Delete the guest cart using DELETE /shoppingMall/guestCarts/{guestCartId}.
 * 4. Attempt to retrieve the same cart again via GET
 *    /shoppingMall/guestCarts/{guestCartId} and assert that an error is thrown
 *    (the cart is no longer retrievable).
 * 5. Create another cart with the same guest_token and verify that the new cart is
 *    independent and retrievable, confirming that the old id remains invalid
 *    while the guest_token can be reused.
 */
export async function test_api_guest_cart_retrieval_after_soft_deletion_or_expiration(
  connection: api.IConnection,
) {
  // 1. Create a new guest cart for an anonymous visitor.
  const guestToken: string = `guest-${RandomGenerator.alphaNumeric(16)}`;

  const createBody = {
    guest_token: guestToken,
    ip: "203.0.113.10",
    user_agent: "Mozilla/5.0 (E2E Test Guest Cart)",
    referrer: "https://example.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const createdCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: createBody,
    });
  typia.assert(createdCart);

  // Basic invariants on freshly created cart.
  TestValidator.equals(
    "created cart guest_token should match input",
    createdCart.guest_token,
    guestToken,
  );
  TestValidator.equals(
    "fresh cart should not be soft-deleted (deleted_at undefined)",
    createdCart.deleted_at,
    undefined,
  );
  TestValidator.equals(
    "fresh cart should start with empty items array",
    createdCart.items.length,
    0,
  );

  // 2. Retrieve the created cart via GET and validate it matches.
  const reloadedCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.at(connection, {
      guestCartId: createdCart.id,
    });
  typia.assert(reloadedCart);

  TestValidator.equals(
    "reloaded cart id should equal created cart id",
    reloadedCart.id,
    createdCart.id,
  );
  TestValidator.equals(
    "reloaded cart guest_token should equal created cart guest_token",
    reloadedCart.guest_token,
    createdCart.guest_token,
  );

  // 3. Delete the guest cart.
  await api.functional.shoppingMall.guestCarts.erase(connection, {
    guestCartId: createdCart.id,
  });

  // 4. Attempt to retrieve the deleted cart and expect an error.
  await TestValidator.error(
    "retrieving a deleted guest cart by id should fail",
    async () => {
      await api.functional.shoppingMall.guestCarts.at(connection, {
        guestCartId: createdCart.id,
      });
    },
  );

  // 5. Create a new cart with the same guest_token and ensure it is retrievable,
  // confirming the old id remains invalid while guest_token can be reused.
  const recreateBody = {
    guest_token: guestToken,
    ip: "203.0.113.20",
    user_agent: "Mozilla/5.0 (E2E Test Guest Cart Recreate)",
    referrer: "https://example.com/another-landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const recreatedCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: recreateBody,
    });
  typia.assert(recreatedCart);

  TestValidator.notEquals(
    "recreated cart id should differ from deleted cart id",
    recreatedCart.id,
    createdCart.id,
  );

  const reloadedRecreatedCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.at(connection, {
      guestCartId: recreatedCart.id,
    });
  typia.assert(reloadedRecreatedCart);

  TestValidator.equals(
    "reloaded recreated cart id should equal recreated cart id",
    reloadedRecreatedCart.id,
    recreatedCart.id,
  );
}
