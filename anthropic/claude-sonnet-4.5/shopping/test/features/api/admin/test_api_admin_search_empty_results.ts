import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin search behavior when no records match the filter criteria.
 *
 * This test validates that the admin search API correctly handles scenarios
 * where filter criteria intentionally match no existing records. It ensures the
 * system returns proper empty result structures with correct pagination
 * metadata rather than errors.
 *
 * Test process:
 *
 * 1. Create baseline admin accounts with known characteristics
 * 2. Authenticate as admin to access search functionality
 * 3. Execute searches with filters designed to match zero records
 * 4. Validate empty result responses have correct structure (0 records, 0 pages,
 *    empty array)
 * 5. Verify graceful handling of no-results scenarios
 */
export async function test_api_admin_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create first baseline admin account
  const admin1 = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "moderator",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin1);

  // Step 2: Create second baseline admin account with different characteristics
  const admin2 = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "support",
      email_verified: false,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin2);

  // Step 3: Create third baseline admin account
  const admin3 = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "moderator",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin3);

  // Step 4: Search with non-existent email domain
  const nonExistentDomainResult =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        email: "test@nonexistentdomain999888777.com",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(nonExistentDomainResult);

  // Validate empty result structure for non-existent email
  TestValidator.equals(
    "empty email search - data array",
    nonExistentDomainResult.data,
    [],
  );
  TestValidator.equals(
    "empty email search - records count",
    nonExistentDomainResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty email search - pages count",
    nonExistentDomainResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty email search - current page",
    nonExistentDomainResult.pagination.current,
    1,
  );

  // Step 5: Search with admin_level that doesn't exist in test data (super_admin)
  const nonExistentLevelResult =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        admin_level: "super_admin",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(nonExistentLevelResult);

  // Validate empty result structure for non-existent admin level
  TestValidator.equals(
    "empty admin_level search - data array",
    nonExistentLevelResult.data,
    [],
  );
  TestValidator.equals(
    "empty admin_level search - records count",
    nonExistentLevelResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty admin_level search - pages count",
    nonExistentLevelResult.pagination.pages,
    0,
  );

  // Step 6: Search with date range before any accounts were created
  const beforeCreationResult =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        created_after: new Date("2000-01-01T00:00:00Z").toISOString(),
        created_before: new Date("2000-12-31T23:59:59Z").toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(beforeCreationResult);

  // Validate empty result structure for old date range
  TestValidator.equals(
    "empty date range search - data array",
    beforeCreationResult.data,
    [],
  );
  TestValidator.equals(
    "empty date range search - records count",
    beforeCreationResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty date range search - pages count",
    beforeCreationResult.pagination.pages,
    0,
  );

  // Step 7: Search with gibberish text that won't match anything
  const gibberishSearchResult =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        search: "xyzqwertasdfzxcv99999nonexistent",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(gibberishSearchResult);

  // Validate empty result structure for gibberish search
  TestValidator.equals(
    "empty gibberish search - data array",
    gibberishSearchResult.data,
    [],
  );
  TestValidator.equals(
    "empty gibberish search - records count",
    gibberishSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty gibberish search - pages count",
    gibberishSearchResult.pagination.pages,
    0,
  );

  // Step 8: Verify pagination metadata consistency across all empty results
  TestValidator.predicate(
    "all empty results have consistent zero records",
    nonExistentDomainResult.pagination.records === 0 &&
      nonExistentLevelResult.pagination.records === 0 &&
      beforeCreationResult.pagination.records === 0 &&
      gibberishSearchResult.pagination.records === 0,
  );

  TestValidator.predicate(
    "all empty results have consistent zero pages",
    nonExistentDomainResult.pagination.pages === 0 &&
      nonExistentLevelResult.pagination.pages === 0 &&
      beforeCreationResult.pagination.pages === 0 &&
      gibberishSearchResult.pagination.pages === 0,
  );

  TestValidator.predicate(
    "all empty results have empty data arrays",
    nonExistentDomainResult.data.length === 0 &&
      nonExistentLevelResult.data.length === 0 &&
      beforeCreationResult.data.length === 0 &&
      gibberishSearchResult.data.length === 0,
  );
}
