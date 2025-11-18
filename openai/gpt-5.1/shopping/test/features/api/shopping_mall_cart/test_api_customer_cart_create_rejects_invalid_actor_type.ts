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
 * Validate that customer cart creation enforces actor_type consistency.
 *
 * Business rules under test:
 *
 * - A customer-authenticated cart creation endpoint should only accept
 *   context-appropriate actor_type values and reject clearly invalid or
 *   unsupported values.
 * - The server should not create a cart header when actor_type is invalid or
 *   mismatched with the authenticated customer context.
 *
 * Scenario:
 *
 * 1. Register a new customer via /auth/customer/join, which also attaches a
 *    customer token to the connection.
 * 2. Attempt to create carts via /shoppingMall/customer/carts with:
 *
 *    - Actor_type set to an obviously invalid value like "admin".
 *    - Actor_type set to another unsupported literal like "foobar".
 *    - Actor_type set to a logically inconsistent but type-correct value like
 *         "guestuser" even though the caller is an authenticated customer.
 * 3. For each of the above invalid cases, verify that the API call fails using
 *    TestValidator.error and that no IShoppingMallCart instance is observed.
 * 4. Finally, perform a control call using a valid actor_type value "customer" and
 *    a reasonable currency_code to ensure the API succeeds and returns a
 *    properly shaped IShoppingMallCart object that passes typia.assert.
 */
export async function test_api_customer_cart_create_rejects_invalid_actor_type(
  connection: api.IConnection,
) {
  // 1. Register a customer and establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(customer);

  // 2. Helper to attempt cart creation with arbitrary actor_type
  const baseCurrency = "USD";

  const tryCreateCart = async (
    actorType: string,
  ): Promise<IShoppingMallCart> => {
    const body = {
      actor_type: actorType,
      currency_code: baseCurrency,
    } satisfies IShoppingMallCart.ICreate;

    const cart: IShoppingMallCart =
      await api.functional.shoppingMall.customer.carts.create(connection, {
        body,
      });
    return cart;
  };

  // 3. Invalid actor_type: unsupported literal values
  await TestValidator.error(
    "cart create rejects actor_type 'admin'",
    async () => {
      await tryCreateCart("admin");
    },
  );

  await TestValidator.error(
    "cart create rejects actor_type 'foobar'",
    async () => {
      await tryCreateCart("foobar");
    },
  );

  // 4. Logically inconsistent: guestuser while authenticated as customer
  await TestValidator.error(
    "cart create rejects actor_type 'guestuser' in customer endpoint",
    async () => {
      await tryCreateCart("guestuser");
    },
  );

  // 5. Control case: valid actor_type for customer context
  const validCart = await tryCreateCart("customer");
  typia.assert(validCart);

  TestValidator.equals(
    "created cart uses requested currency_code",
    validCart.currency_code,
    baseCurrency,
  );

  TestValidator.equals(
    "created cart actor_type matches 'customer'",
    validCart.actor_type,
    "customer",
  );
}
