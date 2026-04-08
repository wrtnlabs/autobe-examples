import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_customer_retrieve_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for customer retrieval
  const retrieveConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID for customer retrieval
  const testCustomerId = typia.random<string>();
  // Retrieve the customer record by ID
  // This validates that soft-deleted customers remain accessible
  const customer = await api.functional.ecommerceMall.customers.at(
    retrieveConnection,
    { customerId: testCustomerId },
  );
  // Validate the response conforms to IEcommerceMallCustomer structure
  typia.assert(customer);
  // Verify the retrieved record has the expected ID
  TestValidator.equals(
    "customer ID matches request",
    customer.id,
    testCustomerId,
  );
}
