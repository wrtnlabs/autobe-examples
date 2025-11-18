import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

export async function test_api_guest_cart_creation_idempotency_by_client_side(
  connection: api.IConnection,
) {
  // 1. Create a guest user identity and establish Authorization header
  const guestJoinBody = {
    external_reference: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallGuestUser.IJoin;

  const guest = await api.functional.auth.guestUser.join(connection, {
    body: guestJoinBody,
  });
  typia.assert(guest);

  // 2. Create the first cart for this guest user
  const cartCreateBody = {
    actor_type: "guestuser",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const firstCart = await api.functional.shoppingMall.guestUser.carts.create(
    connection,
    {
      body: cartCreateBody,
    },
  );
  typia.assert(firstCart);

  TestValidator.equals(
    "first cart actor_type should be guestuser",
    firstCart.actor_type,
    "guestuser",
  );
  TestValidator.equals(
    "first cart currency_code should be USD",
    firstCart.currency_code,
    "USD",
  );

  // 3. Create the second cart with the same payload
  const secondCart = await api.functional.shoppingMall.guestUser.carts.create(
    connection,
    {
      body: cartCreateBody,
    },
  );
  typia.assert(secondCart);

  // 4. Validate behavior between first and second carts
  TestValidator.equals(
    "second cart actor_type should be guestuser",
    secondCart.actor_type,
    "guestuser",
  );
  TestValidator.equals(
    "second cart currency_code should be USD",
    secondCart.currency_code,
    "USD",
  );

  TestValidator.notEquals(
    "two carts should have different ids when multiple carts per guest are allowed",
    firstCart.id,
    secondCart.id,
  );

  // Validate that timestamps are consistent ISO strings and the second cart is
  // not created before the first one (lexicographical comparison is valid for ISO strings)
  TestValidator.predicate(
    "first cart created_at must be a non-empty string",
    firstCart.created_at.length > 0,
  );
  TestValidator.predicate(
    "second cart created_at must be a non-empty string",
    secondCart.created_at.length > 0,
  );

  TestValidator.predicate(
    "second cart created_at should be >= first cart created_at (ISO lexicographical order)",
    secondCart.created_at >= firstCart.created_at,
  );
}
