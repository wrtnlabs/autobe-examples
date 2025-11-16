import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemConfig";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test system configuration search behavior when no configurations match the
 * filter criteria.
 *
 * This test validates proper handling of empty result scenarios in the system
 * configuration search API. It authenticates as an admin user and executes
 * multiple search operations with filter combinations guaranteed to return no
 * results, such as searching for a non-existent category, a search term that
 * matches no configurations, or status filters that exclude all records.
 *
 * The test ensures that the API:
 *
 * 1. Returns a properly structured paginated response even with zero results
 * 2. Provides correct pagination metadata (0 records, 0 pages, current page 1)
 * 3. Returns an empty data array without errors
 * 4. Handles no-match scenarios gracefully without throwing exceptions
 *
 * This validates the robustness of the search API when dealing with queries
 * that have no matching data, ensuring a consistent response structure
 * regardless of result set size.
 */
export async function test_api_system_config_search_empty_result_handling(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Search with non-existent category guaranteed to return no results
  const nonExistentCategorySearch = {
    page: 1,
    limit: 20,
    category: `non_existent_category_${typia.random<string & tags.Format<"uuid">>()}`,
  } satisfies IShoppingMallSystemConfig.IRequest;

  const emptyResultByCategory =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: nonExistentCategorySearch,
    });
  typia.assert(emptyResultByCategory);

  // Validate empty result structure
  TestValidator.equals(
    "empty data array for non-existent category",
    emptyResultByCategory.data,
    [],
  );
  TestValidator.equals(
    "zero records for non-existent category",
    emptyResultByCategory.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-existent category",
    emptyResultByCategory.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1",
    emptyResultByCategory.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit preserved",
    emptyResultByCategory.pagination.limit,
    20,
  );

  // Step 3: Search with search term that matches no configurations
  const nonMatchingSearchTerm = {
    page: 1,
    limit: 10,
    search: `impossible_search_term_${typia.random<string & tags.Format<"uuid">>()}`,
  } satisfies IShoppingMallSystemConfig.IRequest;

  const emptyResultBySearch =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: nonMatchingSearchTerm,
    });
  typia.assert(emptyResultBySearch);

  // Validate search result structure
  TestValidator.equals(
    "empty data array for non-matching search",
    emptyResultBySearch.data,
    [],
  );
  TestValidator.equals(
    "zero records for non-matching search",
    emptyResultBySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-matching search",
    emptyResultBySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1 for search",
    emptyResultBySearch.pagination.current,
    1,
  );

  // Step 4: Search with combined filters that exclude all records
  const combinedFiltersNoMatch = {
    page: 1,
    limit: 50,
    category: `fake_category_${RandomGenerator.alphaNumeric(10)}`,
    search: `no_match_${RandomGenerator.alphaNumeric(8)}`,
    status: "inactive" as const,
  } satisfies IShoppingMallSystemConfig.IRequest;

  const emptyResultByCombined =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: combinedFiltersNoMatch,
    });
  typia.assert(emptyResultByCombined);

  // Validate combined filter result structure
  TestValidator.equals(
    "empty data array for combined filters",
    emptyResultByCombined.data,
    [],
  );
  TestValidator.equals(
    "zero records for combined filters",
    emptyResultByCombined.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for combined filters",
    emptyResultByCombined.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1 for combined",
    emptyResultByCombined.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 50",
    emptyResultByCombined.pagination.limit,
    50,
  );

  // Step 5: Verify pagination metadata consistency across all empty results
  TestValidator.predicate(
    "all empty results have consistent structure",
    emptyResultByCategory.data.length === 0 &&
      emptyResultBySearch.data.length === 0 &&
      emptyResultByCombined.data.length === 0,
  );
}
