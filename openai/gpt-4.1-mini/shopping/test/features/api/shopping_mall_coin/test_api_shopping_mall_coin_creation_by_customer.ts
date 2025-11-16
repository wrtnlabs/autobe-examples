import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_coin_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration to obtain authorization token for customer actor
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "strong_password_1234",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://example.com/landing",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a new shopping mall coin with valid data
  const coinCreateBody = {
    code: "COIN01",
    name: "Primary Shopping Coin",
    amount: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    status: "active" as const,
    shopping_mall_channel_id: null,
    shopping_mall_customer_id: null,
  } satisfies IShoppingMallCoin.ICreate;

  const createdCoin: IShoppingMallCoin =
    await api.functional.shoppingMall.customer.shoppingMallCoins.create(
      connection,
      {
        body: coinCreateBody,
      },
    );
  typia.assert(createdCoin);

  // 3. Validate result fields
  TestValidator.equals(
    "created coin code matches input",
    createdCoin.code,
    coinCreateBody.code,
  );
  TestValidator.equals(
    "created coin name matches input",
    createdCoin.name,
    coinCreateBody.name,
  );
  TestValidator.equals(
    "created coin amount matches input",
    createdCoin.amount,
    coinCreateBody.amount,
  );
  TestValidator.equals(
    "created coin status is active",
    createdCoin.status,
    "active",
  );

  // 4. Validate system-injected UUIDs and timestamps
  TestValidator.predicate(
    "coin id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdCoin.id,
    ),
  );
  TestValidator.predicate(
    "shopping mall channel id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdCoin.shopping_mall_channel_id,
    ),
  );
  TestValidator.predicate(
    "shopping mall customer id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdCoin.shopping_mall_customer_id,
    ),
  );

  TestValidator.predicate(
    "created_at is ISO 8601 datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z$/.test(
      createdCoin.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z$/.test(
      createdCoin.updated_at,
    ),
  );
  TestValidator.equals("deleted_at is null", createdCoin.deleted_at, null);
}
