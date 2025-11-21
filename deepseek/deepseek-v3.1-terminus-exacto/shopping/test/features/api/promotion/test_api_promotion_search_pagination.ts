import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";

/**
 * Validate pagination functionality for promotion search operations.
 *
 * This test ensures that administrators can efficiently navigate through large
 * promotion datasets using pagination controls. It tests various pagination
 * scenarios including default behavior, specific page requests, different limit
 * values, boundary conditions, and pagination metadata accuracy.
 */
export async function test_api_promotion_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: "{}",
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test default pagination (no parameters)
  const defaultPage = await api.functional.shoppingMall.admin.promotions.index(
    connection,
    {
      body: {} satisfies IShoppingMallPromotion.IRequest,
    },
  );
  typia.assert(defaultPage);

  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination object should exist",
    defaultPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(defaultPage.data),
  );

  // Step 3: Test specific page requests
  const page1 = await api.functional.shoppingMall.admin.promotions.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallPromotion.IRequest,
    },
  );
  typia.assert(page1);

  TestValidator.equals(
    "page 1 should have current page 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 should have limit 10",
    page1.pagination.limit,
    10,
  );

  // Step 4: Test different limit values
  const smallLimit = await api.functional.shoppingMall.admin.promotions.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallPromotion.IRequest,
    },
  );
  typia.assert(smallLimit);

  TestValidator.equals(
    "small limit should be 5",
    smallLimit.pagination.limit,
    5,
  );

  const largeLimit = await api.functional.shoppingMall.admin.promotions.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IShoppingMallPromotion.IRequest,
    },
  );
  typia.assert(largeLimit);

  TestValidator.equals(
    "large limit should be 50",
    largeLimit.pagination.limit,
    50,
  );

  // Step 5: Test pagination metadata consistency
  TestValidator.predicate(
    "total records should be non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    defaultPage.pagination.pages >= 0,
  );

  // Validate pages calculation: pages = ceil(records / limit)
  if (defaultPage.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      defaultPage.pagination.records / defaultPage.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation should be correct",
      defaultPage.pagination.pages,
      expectedPages,
    );
  }

  // Step 6: Test boundary conditions
  if (defaultPage.pagination.pages > 1) {
    const lastPage = await api.functional.shoppingMall.admin.promotions.index(
      connection,
      {
        body: {
          page: defaultPage.pagination.pages,
          limit: defaultPage.pagination.limit,
        } satisfies IShoppingMallPromotion.IRequest,
      },
    );
    typia.assert(lastPage);

    TestValidator.equals(
      "last page should match total pages",
      lastPage.pagination.current,
      defaultPage.pagination.pages,
    );
  }

  // Step 7: Test invalid page number (should handle gracefully)
  const invalidPage = await api.functional.shoppingMall.admin.promotions.index(
    connection,
    {
      body: {
        page: 999999, // Very high page number
        limit: 10,
      } satisfies IShoppingMallPromotion.IRequest,
    },
  );
  typia.assert(invalidPage);

  // The API should handle out-of-bounds pages gracefully
  TestValidator.predicate(
    "invalid page request should return valid response",
    invalidPage.pagination !== undefined,
  );

  // Step 8: Test with sorting parameters to ensure pagination consistency
  const sortedPage = await api.functional.shoppingMall.admin.promotions.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies IShoppingMallPromotion.IRequest,
    },
  );
  typia.assert(sortedPage);

  TestValidator.equals(
    "sorted page should have correct pagination",
    sortedPage.pagination.current,
    1,
  );
}
