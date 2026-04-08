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
 * Test the primary customer listing workflow where the endpoint retrieves all registered customer accounts on the platform.
 *
 * Validates the complete customer listing operation including response structure, pagination metadata, and customer summary fields. Ensures that the endpoint returns properly formatted customer data with correct pagination information when called without filter parameters.
 *
 * Special attention is given to verifying that the response contains the expected pagination structure (current page, limit, total records, total pages) and that each customer summary includes all required fields (id, email, display_name, banned, created_at) with correct types and formats.
 *
 * 1. Call PATCH /shoppingMall/customers without any filter parameters
 * 2. Verify response contains IPageIShoppingMallCustomer.ISummary structure
 * 3. Verify pagination object has correct default values (current=1, limit=20)
 * 4. Verify each customer summary has required fields with correct types
 * 5. Verify pagination metadata is consistent (pages = ceiling(records/limit))
 */
export async function test_api_customer_listing_all_accounts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Call customer listing API without filter parameters
  const output = await api.functional.shoppingMall.customers.index(connection, {
    body: {} satisfies IShoppingMallCustomer.IRequest,
  });
  typia.assert(output);
  // 2. Verify response structure has data array and pagination object
  TestValidator.predicate("has data array", Array.isArray(output.data));
  TestValidator.predicate(
    "has pagination object",
    output.pagination !== undefined,
  );
  // 3. Verify default pagination values
  TestValidator.equals("default current page", output.pagination.current, 1);
  TestValidator.equals("default limit", output.pagination.limit, 20);
  // 4. Verify pagination consistency
  const expectedPages =
    output.pagination.limit === 0
      ? 0
      : output.pagination.records === 0
        ? 0
        : Math.ceil(output.pagination.records / output.pagination.limit);
  TestValidator.equals(
    "pages calculation",
    output.pagination.pages,
    expectedPages,
  );
  // 5. Verify each customer summary has required fields (business logic validation)
  for (let i = 0; i < output.data.length; i++) {
    const customer = output.data[i];
    // Verify customer has all required fields present
    TestValidator.predicate(
      `customer[${i}].id exists`,
      customer.id !== undefined && customer.id !== null,
    );
    TestValidator.predicate(
      `customer[${i}].email exists`,
      customer.email !== undefined && customer.email !== null,
    );
    TestValidator.predicate(
      `customer[${i}].display_name exists`,
      customer.display_name !== undefined && customer.display_name !== null,
    );
    TestValidator.predicate(
      `customer[${i}].banned exists`,
      customer.banned !== undefined && customer.banned !== null,
    );
    TestValidator.predicate(
      `customer[${i}].created_at exists`,
      customer.created_at !== undefined && customer.created_at !== null,
    );
  }
  // 6. Verify data array length matches pagination on first page
  const expectedDataLength =
    output.pagination.limit === 0
      ? 0
      : Math.min(output.pagination.limit, output.pagination.records);
  TestValidator.equals(
    "data array length",
    output.data.length,
    expectedDataLength,
  );
}
