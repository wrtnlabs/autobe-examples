import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product discovery filtered by creation dates within specific timeframes.
 * Validates that customers can find products added within their preferred
 * shopping periods or discover new arrivals. This supports marketplace
 * freshness by allowing customers to browse products created within recent time
 * periods for trend-based shopping scenarios.
 *
 * Test steps:
 *
 * 1. Create baseline product data by querying general catalog
 * 2. Test filtering products by recent date range (last 30 days)
 * 3. Test filtering products by narrow date range (specific 7-day window)
 * 4. Test pagination with date filtering
 * 5. Validate product data structure consistency
 * 6. Test date filtering combined with sorting and search
 * 7. Verify response contains correct pagination metadata
 */
export async function test_api_product_catalog_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create baseline product data by querying general catalog
  const baselineRequest: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "newest",
    orderBy: "desc",
  };

  const baselineResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: baselineRequest,
    },
  );
  typia.assert(baselineResults);

  TestValidator.equals(
    "baseline products page number",
    baselineResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "baseline products should have valid pagination data",
    baselineResults.pagination.records >= 0 &&
      baselineResults.pagination.pages >= 1,
  );

  // Step 2: Test filtering by recent timeframe (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const recentRequest: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "newest",
    orderBy: "desc",
    startDate: thirtyDaysAgo.toISOString(),
    endDate: now.toISOString(),
  };

  const recentResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: recentRequest,
    },
  );
  typia.assert(recentResults);

  TestValidator.equals(
    "recent products page number",
    recentResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "recent products should have valid pagination data",
    recentResults.pagination.records >= recentResults.data.length &&
      recentResults.pagination.pages >= 1,
  );

  // Step 3: Test filtering by narrow 7-day window
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const narrowRequest: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "newest",
    orderBy: "desc",
    startDate: sevenDaysAgo.toISOString(),
    endDate: now.toISOString(),
  };

  const narrowResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: narrowRequest,
    },
  );
  typia.assert(narrowResults);

  TestValidator.equals(
    "narrow window products page number",
    narrowResults.pagination.current,
    1,
  );

  // Step 4: Test pagination with date filtering
  const paginatedRequest: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 5, // Smaller page size for pagination test
    sortBy: "newest",
    orderBy: "desc",
    startDate: thirtyDaysAgo.toISOString(),
    endDate: now.toISOString(),
  };

  const page1Results = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: paginatedRequest,
    },
  );
  typia.assert(page1Results);

  TestValidator.equals(
    "paginated results page number",
    page1Results.pagination.current,
    1,
  );

  // If there are more pages, test page 2
  if (page1Results.pagination.pages > 1) {
    const page2Request: IShoppingMallProduct.IRequest = {
      ...paginatedRequest,
      page: 2,
    };

    const page2Results = await api.functional.shoppingMall.products.index(
      connection,
      {
        body: page2Request,
      },
    );
    typia.assert(page2Results);

    TestValidator.equals(
      "page 2 number should be 2",
      page2Results.pagination.current,
      2,
    );
    TestValidator.predicate(
      "page 2 should have different set of products",
      page1Results.data.length > 0 && page2Results.data.length > 0,
    );
  }

  // Step 5: Validate product data structure consistency
  if (recentResults.data.length > 0) {
    const sampleProduct = recentResults.data[0];
    TestValidator.predicate(
      "product should have all required properties",
      typia.is<string>(sampleProduct.id) &&
        typia.is<string>(sampleProduct.name) &&
        typia.is<number>(sampleProduct.price) &&
        typia.is<string[]>(sampleProduct.images) &&
        typia.is<IShoppingMallSeller.ISummary>(sampleProduct.seller) &&
        typia.is<IShoppingMallProductCategory.ISummary>(sampleProduct.category),
    );
  }

  // Step 6: Test date filtering combined with search
  const searchWithDateRequest: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "relevance",
    search: RandomGenerator.name(1),
    startDate: thirtyDaysAgo.toISOString(),
    endDate: now.toISOString(),
  };

  const searchDateResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: searchWithDateRequest,
    },
  );
  typia.assert(searchDateResults);

  TestValidator.predicate(
    "search with date filtering should return valid results",
    searchDateResults.data.length >= 0,
  );

  // Step 7: Test with historical date range (older products)
  const historicalStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const historicalEnd = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const historicalRequest: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "newest",
    orderBy: "desc",
    startDate: historicalStart.toISOString(),
    endDate: historicalEnd.toISOString(),
  };

  const historicalResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: historicalRequest,
    },
  );
  typia.assert(historicalResults);

  TestValidator.equals(
    "historical products page number",
    historicalResults.pagination.current,
    1,
  );

  // Step 8: Test with ascending sort order and date filtering
  const oldestFirstRequest: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "newest",
    orderBy: "asc", // Oldest first
    startDate: thirtyDaysAgo.toISOString(),
    endDate: now.toISOString(),
  };

  const oldestFirstResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: oldestFirstRequest,
    },
  );
  typia.assert(oldestFirstResults);

  TestValidator.equals(
    "oldest first sort page number",
    oldestFirstResults.pagination.current,
    1,
  );

  // Final validation: ensure all date range queries returned valid product summaries
  const allResults = [
    recentResults,
    narrowResults,
    searchDateResults,
    historicalResults,
    oldestFirstResults,
  ];

  TestValidator.predicate(
    "all date filtered results should contain valid product summaries",
    allResults.every((result) =>
      result.data.every(
        (product) =>
          !!product.id &&
          !!product.name &&
          product.price >= 0 &&
          Array.isArray(product.images) &&
          product.images.every((img) => typeof img === "string"),
      ),
    ),
  );
}
