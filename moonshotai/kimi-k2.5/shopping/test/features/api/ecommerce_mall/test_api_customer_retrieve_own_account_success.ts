import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_customer_retrieve_own_account_success(
  connection: api.IConnection,
): Promise<void> {
  // Apply connection isolation pattern - create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID for customerId path parameter
  const customerId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve customer account information
  const customer = await api.functional.ecommerceMall.customers.at(
    customerConnection,
    { customerId },
  );
  // Validate response structure matches IEcommerceMallCustomer DTO exactly
  typia.assert(customer);
}
