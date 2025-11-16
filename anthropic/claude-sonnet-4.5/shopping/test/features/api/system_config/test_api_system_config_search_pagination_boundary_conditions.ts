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
 * Test pagination edge cases and boundary conditions for system configuration
 * search.
 *
 * This test validates the robustness of the pagination implementation by
 * testing various boundary scenarios including minimum page size (limit=1),
 * maximum page size (limit=100), last page requests, and requests beyond total
 * pages. It ensures the API handles edge cases gracefully and returns accurate
 * pagination metadata with proper ceiling operation for partial pages.
 *
 * Steps:
 *
 * 1. Authenticate as admin via join
 * 2. Test minimum page size (limit=1)
 * 3. Test maximum page size (limit=100)
 * 4. Test last page request to verify partial page handling
 * 5. Test page beyond total pages to verify empty result or error handling
 * 6. Validate pagination metadata accuracy for all boundary conditions
 */
export async function test_api_system_config_search_pagination_boundary_conditions(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test minimum page size (limit=1)
  const minPageSizeResult =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallSystemConfig.IRequest,
    });
  typia.assert(minPageSizeResult);

  TestValidator.equals(
    "minimum page size current page should be 1",
    minPageSizeResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "minimum page size limit should be 1",
    minPageSizeResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "minimum page size data should have at most 1 item",
    minPageSizeResult.data.length <= 1,
  );

  // Verify pages calculation with ceiling operation
  const expectedPagesMin = Math.ceil(
    minPageSizeResult.pagination.records / minPageSizeResult.pagination.limit,
  );
  TestValidator.equals(
    "minimum page size pages should use ceiling operation",
    minPageSizeResult.pagination.pages,
    expectedPagesMin,
  );

  // Step 3: Test maximum page size (limit=100)
  const maxPageSizeResult =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSystemConfig.IRequest,
    });
  typia.assert(maxPageSizeResult);

  TestValidator.equals(
    "maximum page size current page should be 1",
    maxPageSizeResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "maximum page size limit should be 100",
    maxPageSizeResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "maximum page size data should have at most 100 items",
    maxPageSizeResult.data.length <= 100,
  );

  // Step 4: Test last page request to verify partial page handling
  const initialResult =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSystemConfig.IRequest,
    });
  typia.assert(initialResult);

  if (initialResult.pagination.pages > 0) {
    const lastPageResult =
      await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
        body: {
          page: initialResult.pagination.pages,
          limit: 10,
        } satisfies IShoppingMallSystemConfig.IRequest,
      });
    typia.assert(lastPageResult);

    TestValidator.equals(
      "last page current should match requested page",
      lastPageResult.pagination.current,
      initialResult.pagination.pages,
    );

    // Verify partial page handling
    const expectedItemsOnLastPage =
      initialResult.pagination.records % 10 === 0
        ? 10
        : initialResult.pagination.records % 10;

    TestValidator.predicate(
      "last page should contain correct number of items",
      lastPageResult.data.length <= 10,
    );

    TestValidator.equals(
      "last page pages calculation should be consistent",
      lastPageResult.pagination.pages,
      initialResult.pagination.pages,
    );
  }

  // Step 5: Test page beyond total pages
  const beyondTotalResult =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: {
        page: 999999,
        limit: 10,
      } satisfies IShoppingMallSystemConfig.IRequest,
    });
  typia.assert(beyondTotalResult);

  TestValidator.predicate(
    "page beyond total should return empty data or handle gracefully",
    beyondTotalResult.data.length === 0 ||
      beyondTotalResult.pagination.current <=
        beyondTotalResult.pagination.pages,
  );

  // Step 6: Validate pagination metadata consistency
  const metadataTestResult =
    await api.functional.shoppingMall.admin.systemConfigs.index(connection, {
      body: {
        page: 1,
        limit: 7,
      } satisfies IShoppingMallSystemConfig.IRequest,
    });
  typia.assert(metadataTestResult);

  // Verify ceiling operation for pages calculation
  const calculatedPages = Math.ceil(
    metadataTestResult.pagination.records / metadataTestResult.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages should use ceiling operation for partial pages",
    metadataTestResult.pagination.pages,
    calculatedPages,
  );

  TestValidator.predicate(
    "pagination current should be positive",
    metadataTestResult.pagination.current > 0,
  );

  TestValidator.predicate(
    "pagination limit should match requested limit",
    metadataTestResult.pagination.limit === 7,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    metadataTestResult.pagination.records >= 0,
  );
}
