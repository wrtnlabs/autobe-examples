import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test category browsing with pagination to verify limit parameter and page navigation work correctly.
 * This ensures the endpoint properly handles paginated requests with configurable page size and returns correct pagination metadata including total records and page count.
 */
export async function test_api_category_admin_browsing_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for category browsing
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@admin.test.com",
      password: "123456",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Test pagination with default values (page=1, limit=20)
  const defaultResponse =
    await api.functional.shoppingMall.admin.categories.index(adminConnection, {
      body: {
        limit: 20,
        page: 1,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(defaultResponse);
  // Verify default pagination structure
  TestValidator.equals(
    "default page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "has records count",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    defaultResponse.pagination.pages >= 0,
  );
  // Test with custom limit
  const customLimitResponse =
    await api.functional.shoppingMall.admin.categories.index(adminConnection, {
      body: {
        limit: 10,
        page: 1,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(customLimitResponse);
  // Verify custom limit is applied
  TestValidator.equals(
    "custom limit is 10",
    customLimitResponse.pagination.limit,
    10,
  );
  // Test with limit exceeding maximum (100) - should be capped at 100
  const maxLimitResponse =
    await api.functional.shoppingMall.admin.categories.index(adminConnection, {
      body: {
        limit: 150,
        page: 1,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(maxLimitResponse);
  // Verify limit is capped at maximum
  TestValidator.equals(
    "limit capped at 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  // Test pagination navigation
  const firstPage = await api.functional.shoppingMall.admin.categories.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(firstPage);
  // Verify first page data
  TestValidator.equals(
    "first page number is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page limit is 5", firstPage.pagination.limit, 5);
  TestValidator.predicate("first page has data", firstPage.data.length > 0);
  // Test second page
  const secondPage = await api.functional.shoppingMall.admin.categories.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(secondPage);
  // Verify second page navigation
  TestValidator.equals(
    "second page number is 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit is 5",
    secondPage.pagination.limit,
    5,
  );
  // Test that page navigation metadata is consistent
  if (firstPage.pagination.records > 0) {
    TestValidator.predicate(
      "has valid total records",
      firstPage.pagination.records === secondPage.pagination.records,
    );
  }
  // Test page navigation with search filter
  const searchResponse =
    await api.functional.shoppingMall.admin.categories.index(adminConnection, {
      body: {
        search: "test",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(searchResponse);
  // Verify search response structure
  TestValidator.equals(
    "search page is 1",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "search limit is 10",
    searchResponse.pagination.limit,
    10,
  );
}
