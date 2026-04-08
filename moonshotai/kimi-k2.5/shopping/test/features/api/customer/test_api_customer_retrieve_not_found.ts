import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_customer_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not exist in the database
  const nonExistentCustomerId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent customer and expect 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent customer",
    404,
    async () => {
      await api.functional.ecommerceMall.customers.at(connection, {
        customerId: nonExistentCustomerId,
      });
    },
  );
}
