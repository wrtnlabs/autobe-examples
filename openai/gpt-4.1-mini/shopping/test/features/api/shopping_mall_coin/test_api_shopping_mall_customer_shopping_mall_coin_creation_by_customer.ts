import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_customer_shopping_mall_coin_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer account via join to authenticate
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    ip: null,
    href: `https://shopping-mall.example.com/signup`,
    referrer: `https://shopping-mall.example.com/home`,
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: createBody });
  typia.assert(authorizedCustomer);

  // 2. Create the customer profile in the shopping mall system
  const customerCreateBody = {
    email: createBody.email,
    password: createBody.password,
    full_name: createBody.full_name,
    ip: createBody.ip,
    href: createBody.href,
    referrer: createBody.referrer,
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // Validate customer id matches authorized id
  TestValidator.equals(
    "customer id should match authorized customer id",
    customer.id,
    authorizedCustomer.id,
  );

  // 3. Create the shopping mall coin as the authenticated customer
  const coinCreateBody = {
    code: `COIN${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
    name: RandomGenerator.name(),
    amount: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    status: "active",
  } satisfies IShoppingMallCoin.ICreate;

  const coin: IShoppingMallCoin =
    await api.functional.shoppingMall.customer.shoppingMallCoins.create(
      connection,
      { body: coinCreateBody },
    );
  typia.assert(coin);

  // Validate the returned coin fields
  TestValidator.equals(
    "coin code should match",
    coin.code,
    coinCreateBody.code,
  );
  TestValidator.equals(
    "coin name should match",
    coin.name,
    coinCreateBody.name,
  );
  TestValidator.predicate(
    "coin amount should be non-negative",
    coin.amount >= 0,
  );
  TestValidator.equals("coin status should be active", coin.status, "active");

  // Validate coin belongs to the authenticated customer
  TestValidator.equals(
    "coin shopping_mall_customer_id should match customer id",
    coin.shopping_mall_customer_id,
    customer.id,
  );
}
