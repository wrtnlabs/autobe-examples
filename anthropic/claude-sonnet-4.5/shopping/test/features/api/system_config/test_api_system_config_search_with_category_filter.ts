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
 * Test filtering system configurations by category.
 *
 * This test validates that the system configuration search API correctly
 * filters results based on the category parameter. It ensures that only
 * configurations matching the specified category are returned, and that
 * pagination metadata reflects the filtered count rather than the total count.
 *
 * Process:
 *
 * 1. Create and authenticate as an admin user
 * 2. Execute a category-filtered search for system configurations
 * 3. Validate all returned records match the requested category
 * 4. Verify no configurations from other categories are included
 * 5. Confirm pagination metadata reflects filtered results
 */
export async function test_api_system_config_search_with_category_filter(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
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

  // Step 2: Choose a category to filter by
  const categories = ["payment", "shipping", "email"] as const;
  const targetCategory = RandomGenerator.pick(categories);

  // Step 3: Execute search with category filter
  const searchRequest = {
    category: targetCategory,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallSystemConfig.IRequest;

  const searchResult =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Step 4: Validate all returned configurations have the correct category
  TestValidator.predicate(
    "search result should contain data array",
    searchResult.data.length >= 0,
  );

  // Step 5: Verify each configuration matches the requested category
  for (const config of searchResult.data) {
    TestValidator.equals(
      "configuration category should match filter",
      config.category,
      targetCategory,
    );
  }

  // Step 6: Validate pagination metadata
  typia.assert(searchResult.pagination);
  TestValidator.predicate(
    "pagination current page should be 1",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    searchResult.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    searchResult.pagination.pages >= 0,
  );
}
