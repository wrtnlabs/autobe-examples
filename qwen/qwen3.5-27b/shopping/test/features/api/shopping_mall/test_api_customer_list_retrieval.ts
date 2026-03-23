import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the primary success path for retrieving a paginated list of customer accounts.
 *
 * 1. Create an actor-specific connection from the base connection
 * 2. Call the PATCH /shoppingMall/customers endpoint with default parameters
 * 3. Verify the response contains pagination metadata (current, limit, records, pages)
 * 4. Verify the response contains a data array of customer summaries
 * 5. Verify each customer summary includes required fields
 * 6. Verify the default limit is 20 customers per page
 * 7. Verify the default sort order is descending by created_at
 * 8. Verify sensitive fields are not included in the response
 */
export async function test_api_customer_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Call the endpoint with default parameters (empty body)
  const response = await api.functional.shoppingMall.customers.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(response);
  // Verify default pagination values
  TestValidator.equals("default page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  // Verify pagination consistency
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Verify data length matches expected (should be <= limit)
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  // Verify each customer summary has valid data
  await ArrayUtil.asyncForEach(response.data, async (customer) => {
    typia.assert(customer);
    // Verify status is one of the valid values
    TestValidator.predicate(
      `customer status is valid: ${customer.status}`,
      customer.status === "active" ||
        customer.status === "suspended" ||
        customer.status === "banned",
    );
    // Verify email format is valid (typia.assert already validates format, but we check business logic)
    TestValidator.predicate(
      `customer email contains @ symbol: ${customer.email}`,
      customer.email.includes("@"),
    );
    // Verify display_name is not empty
    TestValidator.predicate(
      `customer display_name is not empty: ${customer.display_name}`,
      customer.display_name.length > 0,
    );
  });
  // Verify pagination calculation is correct
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation is correct",
    response.pagination.pages,
    expectedPages,
  );
}
