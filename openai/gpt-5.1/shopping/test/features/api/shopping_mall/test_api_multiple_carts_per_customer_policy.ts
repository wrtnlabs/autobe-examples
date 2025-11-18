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

export async function test_api_multiple_carts_per_customer_policy(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain authorized session (token handled by SDK)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(customer);

  // 2. Create the first cart for this authenticated customer
  const firstCartBody = {
    actor_type: "customer",
    status: undefined,
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart1: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: firstCartBody,
    });
  typia.assert(cart1);

  // 3. Create the second cart for the same customer
  const secondCartBody = {
    actor_type: "customer",
    status: undefined,
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart2: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: secondCartBody,
    });
  typia.assert(cart2);

  // 4. Business rule validations
  TestValidator.equals(
    "first cart actor_type must be customer",
    cart1.actor_type,
    "customer",
  );
  TestValidator.equals(
    "second cart actor_type must be customer",
    cart2.actor_type,
    "customer",
  );

  TestValidator.equals(
    "first cart currency_code must match requested",
    cart1.currency_code,
    "USD",
  );
  TestValidator.equals(
    "second cart currency_code must match requested",
    cart2.currency_code,
    "USD",
  );

  TestValidator.notEquals(
    "two carts created for same customer must have different ids",
    cart1.id,
    cart2.id,
  );

  TestValidator.predicate(
    "first cart status should be a non-empty string",
    ((): boolean => cart1.status.length > 0)(),
  );
  TestValidator.predicate(
    "second cart status should be a non-empty string",
    ((): boolean => cart2.status.length > 0)(),
  );
}
