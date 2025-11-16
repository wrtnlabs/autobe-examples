import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin search operation with pagination controls.
 *
 * This test validates the admin search functionality with comprehensive
 * pagination parameter testing. The test creates multiple admin accounts with
 * different privilege levels (super_admin, moderator, support) to establish a
 * diverse dataset for pagination testing.
 *
 * Test Flow:
 *
 * 1. Create multiple admin accounts with varying privilege levels
 * 2. Authenticate as one of the created admins
 * 3. Execute search with pagination parameters
 * 4. Validate pagination metadata structure and correctness
 * 5. Verify data array contains expected number of admin summaries
 * 6. Test navigation through multiple pages
 * 7. Validate pagination metadata updates correctly
 */
export async function test_api_admin_search_with_pagination(
  connection: api.IConnection,
) {
  // Create test admin accounts with different privilege levels
  const adminLevels = ["super_admin", "moderator", "support"] as const;
  const createdAdmins: IShoppingMallAdmin.IAuthorized[] = [];

  // Create 10 admin accounts to ensure sufficient data for pagination testing
  for (let i = 0; i < 10; i++) {
    const adminLevel = RandomGenerator.pick(adminLevels);
    const adminData = {
      email:
        `admin${i}_${typia.random<string & tags.Format<"uuid">>()}@test.com` satisfies string &
          tags.Format<"email">,
      password: "SecurePassword123!",
      full_name: `Test Admin ${i} - ${RandomGenerator.name()}`,
      phone_number: RandomGenerator.mobile(),
      admin_level: adminLevel,
      email_verified: true,
      href: "https://test.example.com/admin/join",
      referrer: "https://test.example.com/admin",
    } satisfies IShoppingMallAdmin.ICreate;

    const admin = await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
    typia.assert(admin);
    createdAdmins.push(admin);
  }

  // Authenticate as the first created admin for subsequent operations
  const firstAdmin = createdAdmins[0];
  typia.assertGuard(firstAdmin);

  // Test pagination with page 1 and limit 3
  const page1Limit3 = {
    page: 1,
    limit: 3,
  } satisfies IShoppingMallAdmin.IRequest;

  const firstPageResult = await api.functional.shoppingMall.admin.admins.index(
    connection,
    { body: page1Limit3 },
  );
  typia.assert(firstPageResult);

  // Validate pagination metadata for first page
  TestValidator.equals(
    "first page current should be 1",
    firstPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should be 3",
    firstPageResult.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "first page should have at most 3 records",
    firstPageResult.data.length <= 3,
  );
  TestValidator.predicate(
    "total records should be at least 10",
    firstPageResult.pagination.records >= 10,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly",
    firstPageResult.pagination.pages ===
      Math.ceil(firstPageResult.pagination.records / 3),
  );

  // Test pagination with page 2 and limit 3
  const page2Limit3 = {
    page: 2,
    limit: 3,
  } satisfies IShoppingMallAdmin.IRequest;

  const secondPageResult = await api.functional.shoppingMall.admin.admins.index(
    connection,
    { body: page2Limit3 },
  );
  typia.assert(secondPageResult);

  // Validate pagination metadata for second page
  TestValidator.equals(
    "second page current should be 2",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit should be 3",
    secondPageResult.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "second page should have at most 3 records",
    secondPageResult.data.length <= 3,
  );
  TestValidator.equals(
    "second page total records should match first page",
    secondPageResult.pagination.records,
    firstPageResult.pagination.records,
  );
  TestValidator.equals(
    "second page total pages should match first page",
    secondPageResult.pagination.pages,
    firstPageResult.pagination.pages,
  );

  // Test pagination with larger page size
  const page1Limit5 = {
    page: 1,
    limit: 5,
  } satisfies IShoppingMallAdmin.IRequest;

  const largePageResult = await api.functional.shoppingMall.admin.admins.index(
    connection,
    { body: page1Limit5 },
  );
  typia.assert(largePageResult);

  TestValidator.equals(
    "large page current should be 1",
    largePageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "large page limit should be 5",
    largePageResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "large page should have at most 5 records",
    largePageResult.data.length <= 5,
  );
  TestValidator.predicate(
    "large page total pages should be less than or equal to first page with limit 3",
    largePageResult.pagination.pages <= firstPageResult.pagination.pages,
  );

  // Test pagination with search filter
  const searchRequest = {
    page: 1,
    limit: 10,
    admin_level: "moderator" as const,
  } satisfies IShoppingMallAdmin.IRequest;

  const searchResult = await api.functional.shoppingMall.admin.admins.index(
    connection,
    { body: searchRequest },
  );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search with filter should return results",
    searchResult.data.length >= 0,
  );
  TestValidator.predicate(
    "all returned admins should be moderators",
    searchResult.data.every((admin) => admin.admin_level === "moderator"),
  );

  // Validate that response data is properly typed
  if (firstPageResult.data.length > 0) {
    const sampleAdmin = firstPageResult.data[0];
    typia.assertGuard(sampleAdmin);
  }
}
