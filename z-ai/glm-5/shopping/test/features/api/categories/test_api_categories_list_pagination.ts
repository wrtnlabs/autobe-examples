import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test category list pagination functionality.
 * Validates that the PATCH /shoppingMall/categories endpoint returns
 * properly paginated results with correct metadata.
 */
export async function test_api_categories_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Default request (minimal body)
  const defaultResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {} satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(defaultResult);
  // Verify pagination metadata values
  const pagination = defaultResult.pagination;
  TestValidator.predicate("current page >= 1", pagination.current >= 1);
  TestValidator.predicate("limit > 0", pagination.limit > 0);
  TestValidator.predicate("records >= 0", pagination.records >= 0);
  TestValidator.predicate("pages >= 0", pagination.pages >= 0);
  // Verify pagination calculation
  const expectedPages = Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals("pages calculation", pagination.pages, expectedPages);
  // Verify data count is within expected range
  TestValidator.predicate(
    "data count within limit",
    defaultResult.data.length <= pagination.limit,
  );
  TestValidator.predicate(
    "data count matches records",
    defaultResult.data.length <= pagination.records,
  );
  // Test 2: Pagination with specific limit
  const limitResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        limit: 5,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(limitResult);
  TestValidator.equals("limit respected", limitResult.pagination.limit, 5);
  TestValidator.predicate("data count <= limit", limitResult.data.length <= 5);
  // Test 3: Pagination with specific page (if multiple pages exist)
  if (defaultResult.pagination.pages > 1) {
    const page2Result = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(page2Result);
    TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
    TestValidator.equals(
      "total records unchanged",
      page2Result.pagination.records,
      defaultResult.pagination.records,
    );
  }
  // Test 4: Empty result for high page number
  const highPageResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 9999,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(highPageResult);
  TestValidator.equals("high page has no data", highPageResult.data.length, 0);
  TestValidator.equals(
    "high page records still correct",
    highPageResult.pagination.records,
    defaultResult.pagination.records,
  );
}
