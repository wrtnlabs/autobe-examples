import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_profile_not_found(
  connection: api.IConnection,
) {
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.actors.customers.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);
  await TestValidator.error(
    "non-existent customer should return 404",
    async () => {
      await api.functional.shoppingMall.actors.customers.at(connection, {
        customerId: "00000000-0000-0000-0000-000000000000",
      });
    },
  );
}
