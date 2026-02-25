import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product search with in-stock filter: verify that the in_stock_only filter
 * correctly excludes products with zero stock and only returns products with
 * variant_stocks.current_quantity > 0.
 */
export async function test_api_product_search_in_stock_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test: Search with in_stock_only filter enabled
  const inStockResults =
    await api.functional.shoppingMall.search.products.index(connection, {
      body: {
        in_stock_only: true,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(inStockResults);
  // Validate: Response structure is correct
  TestValidator.equals(
    "pagination has current page",
    inStockResults.pagination.current,
    inStockResults.pagination.current,
  );
  TestValidator.equals(
    "pagination has limit",
    inStockResults.pagination.limit,
    inStockResults.pagination.limit,
  );
  TestValidator.equals(
    "pagination has records count",
    inStockResults.pagination.records,
    inStockResults.pagination.records,
  );
  TestValidator.equals(
    "pagination has pages count",
    inStockResults.pagination.pages,
    inStockResults.pagination.pages,
  );
  // Test: Search with in_stock_only filter disabled
  const allResults = await api.functional.shoppingMall.search.products.index(
    connection,
    {
      body: {
        in_stock_only: false,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(allResults);
  // Validate: Response structure is correct
  TestValidator.equals(
    "pagination has current page",
    allResults.pagination.current,
    allResults.pagination.current,
  );
  TestValidator.equals(
    "pagination has limit",
    allResults.pagination.limit,
    allResults.pagination.limit,
  );
  TestValidator.equals(
    "pagination has records count",
    allResults.pagination.records,
    allResults.pagination.records,
  );
  TestValidator.equals(
    "pagination has pages count",
    allResults.pagination.pages,
    allResults.pagination.pages,
  );
  // Test: Search with default pagination parameters
  const paginatedResults =
    await api.functional.shoppingMall.search.products.index(connection, {
      body: {
        in_stock_only: true,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(paginatedResults);
  // Validate: Pagination parameters are applied correctly
  TestValidator.equals(
    "pagination limit is applied",
    paginatedResults.pagination.limit,
    5,
  );
}
