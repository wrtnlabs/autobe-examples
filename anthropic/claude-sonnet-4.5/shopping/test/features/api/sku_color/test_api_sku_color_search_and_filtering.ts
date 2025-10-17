import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuColor";
import type { IShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuColor";

/**
 * Test SKU color variant search and filtering functionality.
 *
 * This test validates the color variant search API which retrieves paginated
 * lists of SKU colors from the shopping_mall_sku_colors table. The test covers
 * basic pagination, search functionality with partial name matching, and
 * validates the complete response structure including pagination metadata and
 * color data.
 *
 * Test Flow:
 *
 * 1. Test default pagination without filters
 * 2. Test pagination with specific page and limit parameters
 * 3. Test search functionality with color name filtering
 * 4. Validate response structure and data types
 * 5. Test pagination metadata accuracy
 */
export async function test_api_sku_color_search_and_filtering(
  connection: api.IConnection,
) {
  // Test 1: Default pagination without filters
  const defaultResult = await api.functional.shoppingMall.skuColors.index(
    connection,
    {
      body: {} satisfies IShoppingMallSkuColor.IRequest,
    },
  );
  typia.assert(defaultResult);

  TestValidator.predicate(
    "default result has data array",
    Array.isArray(defaultResult.data),
  );
  TestValidator.predicate(
    "pagination current page is valid",
    defaultResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    defaultResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    defaultResult.pagination.pages >= 0,
  );

  // Test 2: Pagination with specific page and limit
  const page = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;

  const paginatedResult = await api.functional.shoppingMall.skuColors.index(
    connection,
    {
      body: {
        page: page,
        limit: limit,
      } satisfies IShoppingMallSkuColor.IRequest,
    },
  );
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "data array length respects limit",
    paginatedResult.data.length <= limit,
  );

  // Test 3: Search functionality with color name
  const searchKeyword = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 7,
  });

  const searchResult = await api.functional.shoppingMall.skuColors.index(
    connection,
    {
      body: {
        search: searchKeyword,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSkuColor.IRequest,
    },
  );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search result has valid structure",
    Array.isArray(searchResult.data),
  );

  // Test 4: Validate individual color data structure if results exist
  if (defaultResult.data.length > 0) {
    const firstColor = defaultResult.data[0];
    typia.assert(firstColor);
  }

  // Test 5: Test pagination with page 1 and small limit
  const smallLimitResult = await api.functional.shoppingMall.skuColors.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallSkuColor.IRequest,
    },
  );
  typia.assert(smallLimitResult);

  TestValidator.predicate(
    "small limit result respects max items",
    smallLimitResult.data.length <= 5,
  );
  TestValidator.equals(
    "pagination current page matches request",
    smallLimitResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    smallLimitResult.pagination.limit,
    5,
  );

  // Test 6: Verify pagination math
  if (smallLimitResult.pagination.records > 0) {
    const expectedPages = Math.ceil(
      smallLimitResult.pagination.records / smallLimitResult.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation is correct",
      smallLimitResult.pagination.pages,
      expectedPages,
    );
  }
}
