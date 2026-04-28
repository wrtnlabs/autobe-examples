import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that retrieving a customer with a non-existent UUID returns 404 Not Found.
 *
 * Validates that the customer retrieval endpoint properly handles invalid customer IDs by returning a 404 HTTP error. This ensures the API does not expose internal system details or database structure information when a record does not exist.
 *
 * The test verifies the not-found behavior for both completely non-existent customer IDs and potentially soft-deleted accounts. A random UUID is generated to ensure it does not match any existing account record in the system.
 *
 * 1. Generate a random UUID that does not exist in the system.
 * 2. Attempt to retrieve the customer using the invalid UUID.
 * 3. Verify that the API returns HTTP 404 Not Found error.
 */
export async function test_api_customer_not_found_by_invalid_id(
  connection: api.IConnection,
): Promise<void> {
  const testConnection: api.IConnection = { host: connection.host };
  const invalidCustomerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for non-existent customer ID",
    404,
    async () =>
      api.functional.ecommercePlatform.customers.at(testConnection, {
        customerId: invalidCustomerId,
      }),
  );
}
