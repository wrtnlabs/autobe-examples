import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_coin_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer user registration
  const customerCreateBody = {
    email: `${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "123456",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Create a shopping mall coin entity associated with the customer
  const coinCreateBody = {
    code: "COIN2025", // realistic unique coin code
    name: "Special Test Coin",
    amount: 1500,
    status: "active",
  } satisfies IShoppingMallCoin.ICreate;

  const createdCoin: IShoppingMallCoin =
    await api.functional.shoppingMall.customer.shoppingMallCoins.create(
      connection,
      {
        body: coinCreateBody,
      },
    );
  typia.assert(createdCoin);

  // 3. Retrieve the shopping mall coin by its ID
  const retrievedCoin: IShoppingMallCoin =
    await api.functional.shoppingMall.customer.shoppingMallCoins.at(
      connection,
      {
        shoppingMallCoinId: createdCoin.id,
      },
    );
  typia.assert(retrievedCoin);

  // 4. Validate the retrieved coin matches the created one
  TestValidator.equals(
    "retrieved coin matches created coin",
    retrievedCoin,
    createdCoin,
  );
}
