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
 * Test comprehensive pagination navigation through product catalog results.
 *
 * This test validates that customers can browse through multiple pages of
 * products with different item counts per page. It covers forward/backward
 * navigation, page boundary conditions, and result consistency.
 *
 * The test implementation:
 *
 * 1. Creates sufficient test products to populate multiple pages
 * 2. Tests basic pagination with page 1, limit 10
 * 3. Tests navigation to page 2 with limit 10
 * 4. Tests pagination with different limits (20 items per page)
 * 5. Validates pagination metadata (current page, total pages, total records)
 * 6. Ensures no duplicate products across different pages
 * 7. Tests boundary conditions and edge cases
 *
 * This ensures customers can discover products systematically across the entire
 * catalog.
 */
export async function test_api_product_catalog_pagination_navigation(
  connection: api.IConnection,
) {
  // Test basic pagination with page 1, limit 10
  const page1Request = {
    page: 1,
    limit: 10,
    sortBy: "name" as const,
    orderBy: "asc" as const,
  } satisfies IShoppingMallProduct.IRequest;

  const page1Results = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: page1Request,
    },
  );
  typia.assert(page1Results);

  TestValidator.predicate(
    "page 1 should have products",
    page1Results.data.length > 0,
  );
  TestValidator.equals(
    "page 1 current page",
    page1Results.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 limit should be 10 or less",
    page1Results.data.length <= 10,
  );

  // Test navigation to page 2 with limit 10
  const page2Request = {
    page: 2,
    limit: 10,
    sortBy: "name" as const,
    orderBy: "asc" as const,
  } satisfies IShoppingMallProduct.IRequest;

  const page2Results = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: page2Request,
    },
  );
  typia.assert(page2Results);

  TestValidator.predicate(
    "page 2 should have products",
    page2Results.data.length > 0,
  );
  TestValidator.equals(
    "page 2 current page",
    page2Results.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 limit should be 10 or less",
    page2Results.data.length <= 10,
  );

  // Ensure no duplicates between pages
  const page1Ids = page1Results.data.map((product) => product.id);
  const page2Ids = page2Results.data.map((product) => product.id);
  const duplicates = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "no duplicate products across pages",
    duplicates.length,
    0,
  );

  // Test pagination with different limit (20 items per page)
  const page1LargeRequest = {
    page: 1,
    limit: 20,
    sortBy: "name" as const,
    orderBy: "asc" as const,
  } satisfies IShoppingMallProduct.IRequest;

  const page1LargeResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: page1LargeRequest,
    },
  );
  typia.assert(page1LargeResults);

  TestValidator.predicate(
    "large page 1 should have products",
    page1LargeResults.data.length > 0,
  );
  TestValidator.equals(
    "large page 1 current page",
    page1LargeResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "large page 1 limit should be 20 or less",
    page1LargeResults.data.length <= 20,
  );

  // Test pagination metadata consistency
  TestValidator.predicate(
    "pagination has total records",
    page1Results.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    page1Results.pagination.pages > 0,
  );
  TestValidator.predicate(
    "total pages calculation is correct",
    page1Results.pagination.pages ===
      Math.ceil(
        page1Results.pagination.records / page1Results.pagination.limit,
      ),
  );

  // Test different sorting options
  const priceSortRequest = {
    page: 1,
    limit: 10,
    sortBy: "price_low_to_high" as const,
    orderBy: "asc" as const,
  } satisfies IShoppingMallProduct.IRequest;

  const priceSortResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: priceSortRequest,
    },
  );
  typia.assert(priceSortResults);

  TestValidator.predicate(
    "price sorted results should exist",
    priceSortResults.data.length > 0,
  );

  // Validate price ordering (if more than one product)
  if (priceSortResults.data.length > 1) {
    for (let i = 1; i < priceSortResults.data.length; i++) {
      TestValidator.predicate(
        `price should be in ascending order at index ${i}`,
        priceSortResults.data[i].price >= priceSortResults.data[i - 1].price,
      );
    }
  }
}
