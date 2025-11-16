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
 * Test advanced search scenarios combining multiple filter criteria
 * simultaneously.
 *
 * This test validates the complex querying capabilities administrators need for
 * precise configuration management. It creates an admin user, authenticates
 * them, and executes a search operation that combines category filtering,
 * status filtering, text search, pagination, and sorting all in a single
 * request.
 *
 * The test verifies that:
 *
 * 1. Admin authentication works correctly
 * 2. Multiple filters can be applied simultaneously
 * 3. All filter criteria are respected in the results
 * 4. Pagination metadata accurately reflects the filtered result set
 * 5. Results are properly constrained by pagination limits
 *
 * This demonstrates real-world admin workflow for finding specific
 * configurations within a large system using precise multi-criteria queries.
 */
export async function test_api_system_config_search_with_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Execute complex search with combined filters
  // Search for active configurations in 'payment' category containing 'gateway' in the key,
  // sorted by updated_at descending, with pagination (page 1, limit 10)
  const searchRequest = {
    page: 1,
    limit: 10,
    search: "gateway",
    category: "payment",
    status: "active",
    sort_by: "updated_at",
    order: "desc",
  } satisfies IShoppingMallSystemConfig.IRequest;

  const searchResult =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Step 3: Validate pagination metadata
  TestValidator.equals(
    "current page matches request",
    searchResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "page limit matches request",
    searchResult.pagination.limit,
    10,
  );

  TestValidator.predicate(
    "pagination has valid total records count",
    searchResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination has valid total pages count",
    searchResult.pagination.pages >= 0,
  );

  // Step 4: Validate that all results match the combined filter criteria
  for (const config of searchResult.data) {
    // Validate category filter
    TestValidator.equals(
      "configuration belongs to payment category",
      config.category,
      "payment",
    );

    // Validate status filter
    TestValidator.equals(
      "configuration has active status",
      config.status,
      "active",
    );

    // Validate text search filter
    TestValidator.predicate(
      "config key contains search term gateway",
      config.config_key.toLowerCase().includes("gateway"),
    );
  }

  // Step 5: Validate result count doesn't exceed limit
  TestValidator.predicate(
    "result count does not exceed requested limit",
    searchResult.data.length <= 10,
  );
}
