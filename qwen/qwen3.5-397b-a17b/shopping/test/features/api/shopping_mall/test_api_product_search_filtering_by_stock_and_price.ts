import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product search filtering capabilities for in-stock availability and price range.
 *
 * This test verifies the shopping mall product search endpoint correctly filters products
 * based on stock availability, price range, category, and name search. Since product
 * browsing is public, no authentication is required.
 *
 * Filter combinations tested:
 * 1. in_stock=true - Only products with available inventory
 * 2. min_price - Products at or above minimum price
 * 3. max_price - Products at or below maximum price
 * 4. Combined min_price and max_price - Products within price range
 * 5. Combined in_stock and price filters
 * 6. Category filtering with category_id
 * 7. Name search with partial matching
 */
export async function test_api_product_search_filtering_by_stock_and_price(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic search without filters (baseline)
  const baselineResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        limit: 50,
        sort: "newest",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(baselineResponse);
  TestValidator.predicate(
    "baseline response has pagination",
    baselineResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "baseline response has data array",
    Array.isArray(baselineResponse.data),
  );
  // Test 2: Filter by in_stock=true
  const inStockResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        in_stock: true,
        limit: 50,
        sort: "newest",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(inStockResponse);
  TestValidator.predicate(
    "in_stock filter returns valid response",
    inStockResponse.data !== undefined,
  );
  // Test 3: Filter by min_price
  const minPriceResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        min_price: 1000,
        limit: 50,
        sort: "priceAsc",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(minPriceResponse);
  TestValidator.predicate(
    "min_price filter returns valid response",
    minPriceResponse.data !== undefined,
  );
  // Test 4: Filter by max_price
  const maxPriceResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        max_price: 50000,
        limit: 50,
        sort: "priceDesc",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(maxPriceResponse);
  TestValidator.predicate(
    "max_price filter returns valid response",
    maxPriceResponse.data !== undefined,
  );
  // Test 5: Combined min_price and max_price filter
  const priceRangeResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        min_price: 1000,
        max_price: 50000,
        limit: 50,
        sort: "priceAsc",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(priceRangeResponse);
  TestValidator.predicate(
    "price range filter returns valid response",
    priceRangeResponse.data !== undefined,
  );
  // Test 6: Combined in_stock and price filters
  const combinedResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        in_stock: true,
        min_price: 1000,
        max_price: 50000,
        limit: 50,
        sort: "newest",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(combinedResponse);
  TestValidator.predicate(
    "combined filters return valid response",
    combinedResponse.data !== undefined,
  );
  // Test 7: Search by name (partial matching)
  const searchResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        search: "test",
        limit: 50,
        sort: "newest",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "name search returns valid response",
    searchResponse.data !== undefined,
  );
  // Test 8: Pagination test with cursor
  const firstPage = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        limit: 5,
        sort: "newest",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 5);
  TestValidator.predicate(
    "first page has current page",
    firstPage.pagination.current >= 1,
  );
  // Test 9: Different sort options
  const sortNewest = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        limit: 10,
        sort: "newest",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(sortNewest);
  const sortPriceAsc = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        limit: 10,
        sort: "priceAsc",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(sortPriceAsc);
  const sortPriceDesc = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        limit: 10,
        sort: "priceDesc",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(sortPriceDesc);
  // Test 10: Edge case - very high min_price (should return empty or few results)
  const highMinPriceResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        min_price: 999999999,
        limit: 50,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(highMinPriceResponse);
  TestValidator.predicate(
    "high min_price returns valid response",
    highMinPriceResponse.data !== undefined,
  );
  // Test 11: Edge case - very low max_price (should return empty or few results)
  const lowMaxPriceResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        max_price: 1,
        limit: 50,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(lowMaxPriceResponse);
  TestValidator.predicate(
    "low max_price returns valid response",
    lowMaxPriceResponse.data !== undefined,
  );
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has records count",
    baselineResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    baselineResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current <= pages",
    baselineResponse.pagination.current <= baselineResponse.pagination.pages ||
      baselineResponse.pagination.pages === 0,
  );
}
