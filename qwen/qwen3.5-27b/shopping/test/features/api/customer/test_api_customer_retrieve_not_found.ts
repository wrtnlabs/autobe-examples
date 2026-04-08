import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a non-existent customer by ID.
 *
 * Validates that the customer retrieval endpoint properly handles requests for customers that do not exist in the system. The test generates a valid UUID format and attempts to retrieve a customer record, expecting the system to return an appropriate 404 Not Found error.
 *
 * This test ensures that the API correctly identifies non-existent customer IDs and responds with the proper HTTP status code rather than returning invalid data or throwing unexpected errors.
 *
 * 1. Generate a valid UUID format that doesn't exist in the database
 * 2. Call GET /shoppingMall/customers/{customerId} with the non-existent UUID
 * 3. Verify the system throws an HTTP 404 error
 */
export async function test_api_customer_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID that doesn't exist
  const nonExistentCustomerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve non-existent customer and verify 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent customer",
    404,
    async () =>
      await api.functional.shoppingMall.customers.at(connection, {
        customerId: nonExistentCustomerId,
      }),
  );
}
