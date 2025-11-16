import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_customer_shopping_mall_coin_deletion_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "StrongPass123!",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://shoppingmall.example.com/join",
        referrer: "https://shoppingmall.example.com/landing",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a shopping mall coin for the customer
  const newCoinBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    amount: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    status: "active" as const,
    shopping_mall_channel_id: null,
    shopping_mall_customer_id: null,
  } satisfies IShoppingMallCoin.ICreate;

  // Since shopping_mall_channel_id and shopping_mall_customer_id are removed fields (not accepted in creation), we omit them in the body
  const {
    shopping_mall_channel_id,
    shopping_mall_customer_id,
    ...coinCreateBody
  } = newCoinBody;

  const createdCoin: IShoppingMallCoin =
    await api.functional.shoppingMall.customer.shoppingMallCoins.create(
      connection,
      {
        body: coinCreateBody,
      },
    );
  typia.assert(createdCoin);

  // 3. Delete the created shopping mall coin by ID
  await api.functional.shoppingMall.customer.shoppingMallCoins.erase(
    connection,
    {
      shoppingMallCoinId: createdCoin.id,
    },
  );

  // 4. Verify the coin no longer exists by trying to delete again (should error)
  await TestValidator.error(
    "Deleting a non-existent coin should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallCoins.erase(
        connection,
        {
          shoppingMallCoinId: createdCoin.id,
        },
      );
    },
  );
}
