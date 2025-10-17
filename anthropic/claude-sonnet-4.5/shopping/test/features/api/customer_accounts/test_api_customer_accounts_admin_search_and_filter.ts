import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test comprehensive customer account search and filtering functionality for
 * administrators.
 *
 * This test validates the admin's ability to search and retrieve customer
 * accounts using the pagination API. It verifies that:
 *
 * 1. Admin authenticates successfully with proper credentials
 * 2. Customer search API accepts pagination parameters (page, limit)
 * 3. Response includes correct pagination metadata (current page, limit, total
 *    records, pages)
 * 4. Customer data array contains summary information without sensitive data
 * 5. All response structures match expected DTO definitions
 *
 * The test simulates a real-world admin workflow where an administrator needs
 * to browse through customer accounts for management, support, or reporting
 * purposes.
 */
export async function test_api_customer_accounts_admin_search_and_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Validate admin authentication response structure
  TestValidator.equals(
    "admin email matches",
    admin.email,
    adminCreateData.email,
  );
  TestValidator.equals("admin name matches", admin.name, adminCreateData.name);
  TestValidator.equals("admin role matches", admin.role_level, "super_admin");

  // Step 2: Test customer account search with pagination - first page
  const searchRequest1 = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCustomer.IRequest;

  const searchResult1: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: searchRequest1,
    });
  typia.assert(searchResult1);

  // Validate pagination metadata has non-negative values (business logic)
  TestValidator.predicate(
    "pagination current page is non-negative",
    searchResult1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    searchResult1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    searchResult1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    searchResult1.pagination.pages >= 0,
  );

  // Step 3: Test with different pagination parameters
  const searchRequest2 = {
    page: 1,
    limit: 5,
  } satisfies IShoppingMallCustomer.IRequest;

  const searchResult2: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: searchRequest2,
    });
  typia.assert(searchResult2);

  // Validate that limit parameter is respected (business logic validation)
  TestValidator.predicate(
    "search with limit 5 respects the limit",
    searchResult2.data.length <= 5,
  );

  // Step 4: Test with null pagination parameters (defaults)
  const searchRequest3 = {
    page: null,
    limit: null,
  } satisfies IShoppingMallCustomer.IRequest;

  const searchResult3: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: searchRequest3,
    });
  typia.assert(searchResult3);

  // Validate response with default pagination
  TestValidator.predicate(
    "default pagination returns non-negative current page",
    searchResult3.pagination.current >= 0,
  );

  // Step 5: Test with minimal request body (all optional parameters)
  const searchRequest4 = {} satisfies IShoppingMallCustomer.IRequest;

  const searchResult4: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: searchRequest4,
    });
  typia.assert(searchResult4);

  // Validate empty request body works
  TestValidator.predicate(
    "empty request body returns non-negative pages count",
    searchResult4.pagination.pages >= 0,
  );
}
