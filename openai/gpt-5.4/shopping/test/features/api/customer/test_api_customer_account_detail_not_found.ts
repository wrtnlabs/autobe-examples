import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_customer_account_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const nonexistentCustomerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "requesting a nonexistent customer account returns not found",
    404,
    async () => {
      await api.functional.shoppingMall.customers.at(customerConnection, {
        customerId: nonexistentCustomerId,
      });
    },
  );
}
