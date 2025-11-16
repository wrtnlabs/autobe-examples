import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_customer_shopping_mall_coin_update(
  connection: api.IConnection,
) {
  // 1. Customer joins and authenticates
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Create shopping mall coin
  const createBody = {
    code: "COIN_CODE_001",
    name: "Test Coin",
    amount: 100,
    status: "active",
  } satisfies IShoppingMallCoin.ICreate;
  const createdCoin: IShoppingMallCoin =
    await api.functional.shoppingMall.customer.shoppingMallCoins.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCoin);

  // 3. Update the shopping mall coin
  const updateBody = {
    amount: 150,
    status: "inactive",
  } satisfies IShoppingMallCoin.IUpdate;
  const updatedCoin: IShoppingMallCoin =
    await api.functional.shoppingMall.customer.shoppingMallCoins.update(
      connection,
      {
        shoppingMallCoinId: createdCoin.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCoin);

  // 4. Validation
  TestValidator.equals(
    "updated coin ID remains the same",
    updatedCoin.id,
    createdCoin.id,
  );
  TestValidator.equals(
    "updated coin amount",
    updatedCoin.amount,
    updateBody.amount,
  );
  TestValidator.equals(
    "updated coin status",
    updatedCoin.status,
    updateBody.status,
  );
  TestValidator.equals(
    "updated coin code remains the same",
    updatedCoin.code,
    createdCoin.code,
  );
  TestValidator.equals(
    "updated coin name remains the same",
    updatedCoin.name,
    createdCoin.name,
  );
}
