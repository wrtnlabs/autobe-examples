import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallMvShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMvShoppingMallInventoryStatus";
import type { IShoppingMallMvShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMvShoppingMallInventoryStatus";

export async function test_api_mv_shopping_mall_inventory_status_pagination_and_filtering(
  connection: api.IConnection,
) {
  // Test 1: Fetch first page with default pagination, no filters
  const defaultRequest1 = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallMvShoppingMallInventoryStatus.IRequest;
  const response1 =
    await api.functional.shoppingMall.mvShoppingMallInventoryStatus.index(
      connection,
      { body: defaultRequest1 },
    );
  typia.assert(response1);
  TestValidator.predicate(
    "pagination current page should be 1",
    response1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    response1.pagination.limit === 10,
  );

  // Test 2: Fetch page with category filter (simulate random UUID)
  const exampleCategoryId = typia.random<string & tags.Format<"uuid">>();
  const categoryFilteredRequest = {
    filterCategoryId: exampleCategoryId,
    page: 1,
    limit: 5,
    sortBy: "category_id",
    sortOrder: "asc",
  } satisfies IShoppingMallMvShoppingMallInventoryStatus.IRequest;
  const response2 =
    await api.functional.shoppingMall.mvShoppingMallInventoryStatus.index(
      connection,
      { body: categoryFilteredRequest },
    );
  typia.assert(response2);
  TestValidator.predicate(
    "pagination current page should be 1",
    response2.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 5",
    response2.pagination.limit === 5,
  );
  TestValidator.predicate(
    "data items category_id should match filtered category",
    response2.data.every((it) => it.category_id === exampleCategoryId),
  );

  // Test 3: Fetch page filtered by low stock only flag
  const lowStockRequest = {
    filterLowStockOnly: true,
    page: 2,
    limit: 3,
    sortBy: "low_stock_sku_count",
    sortOrder: "desc",
  } satisfies IShoppingMallMvShoppingMallInventoryStatus.IRequest;
  const response3 =
    await api.functional.shoppingMall.mvShoppingMallInventoryStatus.index(
      connection,
      { body: lowStockRequest },
    );
  typia.assert(response3);
  TestValidator.predicate(
    "pagination current page should be 2",
    response3.pagination.current === 2,
  );
  TestValidator.predicate(
    "pagination limit should be 3",
    response3.pagination.limit === 3,
  );
  TestValidator.predicate(
    "every data item low_stock_sku_count > 0",
    response3.data.every((it) => it.low_stock_sku_count > 0),
  );

  // Additional validation: check pagination metadata consistency
  for (const response of [response1, response2, response3]) {
    const { current, limit, pages, records } = response.pagination;
    TestValidator.predicate(
      "pages should equal ceiling(records / limit)",
      pages === Math.ceil(records / limit),
    );
  }
}
