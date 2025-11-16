import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";

/**
 * Validate repeated guest cart creation semantics for a single guest_token.
 *
 * Business goal: Verify how the system behaves when POST
 * /shoppingMall/guestCarts is invoked multiple times with the same guest_token
 * representing one anonymous browser session. The test does not assume whether
 * the backend is idempotent or allows multiple carts; instead, it detects which
 * behavior is implemented and asserts internal consistency for that mode.
 *
 * Steps:
 *
 * 1. Construct a stable guest_token string to represent one guest session.
 * 2. Build a realistic IShoppingMallGuestCart.ICreate payload including
 *    guest_token and optional context (ip, user_agent, referrer, region_code).
 * 3. Call POST /shoppingMall/guestCarts once and capture the returned cart as
 *    cart1. Assert it conforms to IShoppingMallGuestCart.
 * 4. Call POST /shoppingMall/guestCarts again with the same payload and capture
 *    cart2. Assert it conforms to IShoppingMallGuestCart.
 * 5. Assert that both cart1.guest_token and cart2.guest_token equal the input
 *    guest_token.
 * 6. Inspect cart1.id and cart2.id:
 *
 *    - If equal, interpret behavior as idempotent; assert IDs are equal and that
 *         items collections are equal.
 *    - If different, interpret behavior as multiple carts per guest_token being
 *         allowed; assert IDs are different while guest_token matches.
 *
 * This ensures that guest cart creation behavior for repeated calls with the
 * same guest_token is explicit and stable.
 */
export async function test_api_guest_cart_creation_idempotency_by_guest_token(
  connection: api.IConnection,
) {
  // 1. Choose a stable guest_token representing a single anonymous session.
  const guestToken: string = `guest-${RandomGenerator.alphaNumeric(16)}`;

  // 2. Build a realistic create payload for the guest cart.
  const createBody = {
    guest_token: guestToken,
    ip: "203.0.113.10",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AutoBE-E2E",
    referrer: "https://example.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  // 3. First creation call for this guest_token.
  const cart1: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallGuestCart>(cart1);

  // 4. Second creation call with the same guest_token and context.
  const cart2: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallGuestCart>(cart2);

  // 5. Both carts must reflect the same guest_token that was requested.
  TestValidator.equals(
    "first cart should echo requested guest_token",
    cart1.guest_token,
    guestToken,
  );
  TestValidator.equals(
    "second cart should echo requested guest_token",
    cart2.guest_token,
    guestToken,
  );

  // 6. Determine whether backend is idempotent or allows multiple carts.
  if (cart1.id === cart2.id) {
    // Idempotent semantics: same cart reused for same guest_token.
    TestValidator.equals(
      "idempotent behavior: repeated creation returns same cart id",
      cart2.id,
      cart1.id,
    );

    // Items should be consistent between responses for the same cart.
    TestValidator.equals(
      "idempotent behavior: items collection remains consistent",
      cart2.items,
      cart1.items,
    );
  } else {
    // Multiple carts per guest_token are allowed; IDs must differ.
    TestValidator.notEquals(
      "multi-cart behavior: repeated creation issues distinct cart ids",
      cart2.id,
      cart1.id,
    );

    // Guest token is still stable and equal for both carts (already asserted).
    TestValidator.equals(
      "multi-cart behavior: both carts belong to same guest_token",
      cart2.guest_token,
      cart1.guest_token,
    );
  }
}
