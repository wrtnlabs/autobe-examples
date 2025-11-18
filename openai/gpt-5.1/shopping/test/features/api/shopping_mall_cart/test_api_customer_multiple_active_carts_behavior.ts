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
 * Validate behavior when an authenticated customer creates multiple carts.
 *
 * Business goal
 *
 * - Clarify whether the shopping mall backend allows a customer to maintain
 *   multiple active carts concurrently or implicitly reuses a single active
 *   cart when POST /shoppingMall/customer/carts is called repeatedly.
 *
 * Scenario
 *
 * 1. Register a new customer using POST /auth/customer/join, which also
 *    establishes an authenticated session and installs the access token into
 *    the connection headers.
 * 2. As that authenticated customer, create a first cart via POST
 *    /shoppingMall/customer/carts with an `IShoppingMallCart.ICreate` payload
 *    that explicitly sets:
 *
 *    - `actor_type` to a value representing a customer actor, e.g. "customer".
 *    - `status` to "active" to represent an in-progress cart.
 *    - `currency_code` to a fixed ISO code such as "USD".
 * 3. Create a second cart using the _same_ request body values while remaining
 *    authenticated as the same customer.
 * 4. Compare the resulting cart headers to:
 *
 *    - Confirm both responses conform to `IShoppingMallCart`.
 *    - Assert both carts use the same `actor_type`, `status`, and `currency_code` as
 *         provided in the request.
 *    - If `owner_customer` is present on both payloads, assert they have the same
 *         `owner_customer.id` and that this id matches the authenticated
 *         customer's `id` from `IShoppingMallCustomer.IAuthorized`.
 *    - Examine cart IDs:
 *
 *         - If `cart1.id !== cart2.id`, then the system clearly allows multiple active
 *                   carts for a single customer; assert this relation and treat
 *                   it as a valid behavior.
 *         - If `cart1.id === cart2.id`, then the system appears to reuse the same active
 *                   cart when given identical creation input; assert this
 *                   equality and still treat the test as successful,
 *                   documenting the reuse semantics.
 *
 * The test does not enforce one business policy over the other; instead, it
 * documents the behavior chosen by the backend while ensuring that data
 * consistency and ownership invariants hold in either case.
 */
export async function test_api_customer_multiple_active_carts_behavior(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer.
  const joinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Prepare a deterministic cart creation payload.
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  // 3. Create the first cart for this customer.
  const cart1: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert<IShoppingMallCart>(cart1);

  // 4. Create a second cart with the same payload.
  const cart2: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert<IShoppingMallCart>(cart2);

  // 5. Basic invariants: actor_type, status, and currency_code must match the request
  TestValidator.equals(
    "first cart actor_type should match request",
    cart1.actor_type,
    cartCreateBody.actor_type,
  );
  TestValidator.equals(
    "second cart actor_type should match request",
    cart2.actor_type,
    cartCreateBody.actor_type,
  );

  TestValidator.equals(
    "first cart status should match request",
    cart1.status,
    cartCreateBody.status,
  );
  TestValidator.equals(
    "second cart status should match request",
    cart2.status,
    cartCreateBody.status,
  );

  TestValidator.equals(
    "first cart currency_code should match request",
    cart1.currency_code,
    cartCreateBody.currency_code,
  );
  TestValidator.equals(
    "second cart currency_code should match request",
    cart2.currency_code,
    cartCreateBody.currency_code,
  );

  // 6. Ownership consistency when owner_customer projections are present.
  if (cart1.owner_customer && cart2.owner_customer) {
    typia.assert<IShoppingMallCartOwnerCustomerSummary>(cart1.owner_customer);
    typia.assert<IShoppingMallCartOwnerCustomerSummary>(cart2.owner_customer);

    TestValidator.equals(
      "owner_customer.id should be identical across carts",
      cart1.owner_customer.id,
      cart2.owner_customer.id,
    );

    TestValidator.equals(
      "owner_customer.id should match authenticated customer id (cart1)",
      cart1.owner_customer.id,
      customer.id,
    );
    TestValidator.equals(
      "owner_customer.id should match authenticated customer id (cart2)",
      cart2.owner_customer.id,
      customer.id,
    );
  }

  // 7. Document whether multiple distinct carts are created or a single cart is reused.
  if (cart1.id === cart2.id) {
    TestValidator.predicate(
      "when cart ids are equal, backend reuses a single cart for repeated create calls",
      true,
    );
  } else {
    TestValidator.predicate(
      "when cart ids differ, backend allows multiple active carts per customer",
      true,
    );
  }
}
