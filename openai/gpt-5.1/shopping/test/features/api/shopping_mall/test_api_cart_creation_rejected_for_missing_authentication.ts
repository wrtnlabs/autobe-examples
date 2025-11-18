import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

/**
 * Verify that customer cart creation is rejected when no authentication token
 * is present, while succeeding for a properly authenticated customer.
 *
 * Business intent:
 *
 * - POST /shoppingMall/customer/carts is a customer-actor endpoint and must not
 *   be callable without a valid customer Authorization token.
 * - When invoked with a valid IShoppingMallCart.ICreate payload on an
 *   unauthenticated connection, the backend must reject the request with an
 *   authorization error.
 * - The same payload should succeed once the connection has been authenticated
 *   via /auth/customer/join.
 *
 * Scenario steps:
 *
 * 1. Derive an unauthenticated connection by cloning the incoming connection and
 *    overriding `headers` with an empty object.
 * 2. Build a valid IShoppingMallCart.ICreate DTO instance for a customer-owned
 *    cart.
 * 3. Call api.functional.shoppingMall.customer.carts.create with the
 *    unauthenticated connection and validate that it fails using
 *    TestValidator.error.
 * 4. Generate a realistic IShoppingMallCustomerJoin.IRequest payload and call
 *    api.functional.auth.customer.join on the original connection, allowing the
 *    SDK to attach a customer Authorization token to connection.headers.
 * 5. Assert the authorized customer payload with typia.assert to guarantee type
 *    safety.
 * 6. Build another IShoppingMallCart.ICreate payload and call carts.create again,
 *    this time using the authenticated connection; assert that it succeeds and
 *    that the returned IShoppingMallCart has the expected actor_type and
 *    non-null id.
 */
export async function test_api_cart_creation_rejected_for_missing_authentication(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection by resetting headers to an empty object.
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 2. Construct a valid cart creation payload for a customer-owned cart.
  const unauthCartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  // 3. Attempt cart creation on the unauthenticated connection and assert that it fails.
  await TestValidator.error(
    "unauthenticated cart creation must fail",
    async () => {
      await api.functional.shoppingMall.customer.carts.create(
        unauthConnection,
        {
          body: unauthCartCreateBody,
        },
      );
    },
  );

  // 4. Join as a new customer using the original connection to obtain a valid token.
  const joinRequestBody = typia.random<IShoppingMallCustomerJoin.IRequest>();
  const authorizedCustomer = await api.functional.auth.customer.join(
    connection,
    {
      body: joinRequestBody,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorizedCustomer);

  // 5. Construct another valid cart creation payload for the authenticated customer.
  const authCartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  // 6. Attempt cart creation with the authenticated customer connection.
  const createdCart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: authCartCreateBody,
    },
  );
  typia.assert<IShoppingMallCart>(createdCart);

  // Basic business assertions to ensure the cart reflects the requested actor type.
  TestValidator.equals(
    "created cart actor_type should be customer",
    createdCart.actor_type,
    authCartCreateBody.actor_type,
  );

  // Ensure the cart has a non-empty UUID id string.
  TestValidator.predicate(
    "created cart id should be a non-empty string",
    typeof createdCart.id === "string" && createdCart.id.length > 0,
  );
}
