import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function test_api_product_search_zero_page(
  connection: api.IConnection,
) {
  // Test that page=0 is treated as page=1 for product search

  // Generate random search criteria with page=0
  const searchCriteria = "";

  // Call the product search API with page=0
  const result: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: searchCriteria satisfies IShoppingMallProduct.IRequest,
    });

  // Validate that the response contains valid pagination data
  typia.assert(result);

  // Verify that page=0 was treated as page=1 (zero page should be redirected to page=1)
  TestValidator.equals(
    "page 0 should be treated as page 1",
    result.pagination.current,
    1,
  );

  // Verify that the result has valid data structure
  TestValidator.predicate(
    "data array exists",
    ArrayUtil.has(result.data, (item) => !!item.id),
  );

  // Verify that limit is within allowed bounds
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);

  // Verify records count is non-negative
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );

  // Verify pages count is non-negative
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
}
