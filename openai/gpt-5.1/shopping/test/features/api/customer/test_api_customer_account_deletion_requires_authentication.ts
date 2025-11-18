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
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";

export async function test_api_customer_account_deletion_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register a customer via join to obtain a valid customerId and auth token
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  const customerId = joined.id;

  // 2. Build an unauthenticated connection (no Authorization header)
  //    This cloned connection has independent headers and never carries auth.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Attempt DELETE without Authorization header: must fail
  await TestValidator.error("unauthenticated erase must fail", async () => {
    await api.functional.shoppingMall.customer.customers.erase(
      unauthenticatedConnection,
      {
        customerId,
      },
    );
  });

  // 4. Log back in with valid credentials to prove account still exists
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const loggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  TestValidator.equals(
    "customer id must remain the same after failed unauthenticated deletion",
    loggedIn.id,
    customerId,
  );

  TestValidator.predicate(
    "customer must not be soft-deleted after failed unauthenticated deletion",
    loggedIn.deleted_at === null || loggedIn.deleted_at === undefined,
  );

  // 5. Use an authenticated customer-scoped operation to prove account is functional
  const cartCreateBody = {
    actor_type: "customer",
    status: undefined,
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  TestValidator.equals(
    "created cart must be a customer cart",
    cart.actor_type,
    "customer",
  );
}
