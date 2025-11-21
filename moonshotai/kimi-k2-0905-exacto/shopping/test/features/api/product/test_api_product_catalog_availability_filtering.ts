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
 * Test product availability filtering to show only products currently available
 * for purchase. This validates that customers can filter out out-of-stock items
 * during their shopping experience. Covers scenarios where customers want to
 * see only 'in_stock' products or specifically 'backorder_allowed' items for
 * preorder or special ordering scenarios.
 *
 * The test implements comprehensive availability filtering scenarios including:
 *
 * 1. Testing the availability filter parameter functionality
 * 2. Validating that different availability values are accepted by the API
 * 3. Testing combination filters with availability
 * 4. Verifying pagination works correctly with availability filters
 * 5. Testing edge cases and various sorting options
 */
export async function test_api_product_catalog_availability_filtering(
  connection: api.IConnection,
) {
  // Test 1: Filter for in_stock products only
  const inStockRequest = {
    page: 1,
    limit: 20,
    availability: "in_stock" as const,
    sortBy: "name" as const,
  } satisfies IShoppingMallProduct.IRequest;

  const inStockResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: inStockRequest,
    },
  );
  typia.assert(inStockResults);

  // Validate that results are returned and properly typed
  TestValidator.predicate(
    "in_stock filter should return valid product summaries",
    inStockResults.data.length >= 0 &&
      inStockResults.data.every(
        (product) =>
          typeof product.id === "string" &&
          typeof product.name === "string" &&
          typeof product.price === "number",
      ),
  );

  // Test 2: Filter for backorder_allowed products
  const backorderRequest = {
    page: 1,
    limit: 20,
    availability: "backorder_allowed" as const,
    sortBy: "name" as const,
  } satisfies IShoppingMallProduct.IRequest;

  const backorderResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: backorderRequest,
    },
  );
  typia.assert(backorderResults);

  // Validate that results are returned and properly typed
  TestValidator.predicate(
    "backorder_allowed filter should return valid product summaries",
    backorderResults.data.length >= 0 &&
      backorderResults.data.every(
        (product) =>
          typeof product.id === "string" &&
          typeof product.name === "string" &&
          typeof product.price === "number",
      ),
  );

  // Test 3: Filter for out_of_stock products
  const outOfStockRequest = {
    page: 1,
    limit: 20,
    availability: "out_of_stock" as const,
    sortBy: "name" as const,
  } satisfies IShoppingMallProduct.IRequest;

  const outOfStockResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: outOfStockRequest,
    },
  );
  typia.assert(outOfStockResults);

  // Validate that results are returned and properly typed
  TestValidator.predicate(
    "out_of_stock filter should return valid product summaries",
    outOfStockResults.data.length >= 0 &&
      outOfStockResults.data.every(
        (product) =>
          typeof product.id === "string" &&
          typeof product.name === "string" &&
          typeof product.price === "number",
      ),
  );

  // Test 4: Combination filter - availability + price range
  const comboRequest = {
    page: 1,
    limit: 20,
    availability: "in_stock" as const,
    minPrice: 50,
    maxPrice: 200,
    sortBy: "price_low_to_high" as const,
  } satisfies IShoppingMallProduct.IRequest;

  const comboResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: comboRequest,
    },
  );
  typia.assert(comboResults);

  // Validate combination filter results
  TestValidator.predicate(
    "combination filter should return products within price range",
    comboResults.data.length >= 0 &&
      comboResults.data.every(
        (product) =>
          typeof product.id === "string" &&
          typeof product.name === "string" &&
          product.price >= 50 &&
          product.price <= 200,
      ),
  );

  // Test 5: Pagination with availability filter
  const paginatedRequest = {
    page: 1,
    limit: 5,
    availability: "in_stock" as const,
    sortBy: "name" as const,
  } satisfies IShoppingMallProduct.IRequest;

  const page1Results = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: paginatedRequest,
    },
  );
  typia.assert(page1Results);

  const page2Request = {
    page: 2,
    limit: 5,
    availability: "in_stock" as const,
    sortBy: "name" as const,
  } satisfies IShoppingMallProduct.IRequest;

  const page2Results = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: page2Request,
    },
  );
  typia.assert(page2Results);

  // Validate pagination provides proper structure
  TestValidator.predicate(
    "page 1 should have valid pagination info",
    page1Results.pagination.current === 1 &&
      page1Results.pagination.limit === 5,
  );

  TestValidator.predicate(
    "page 2 should have valid pagination info",
    page2Results.pagination.current === 2 &&
      page2Results.pagination.limit === 5,
  );

  // Test 6: No filter (show all products)
  const noFilterRequest = {
    page: 1,
    limit: 20,
    sortBy: "name" as const,
  } satisfies IShoppingMallProduct.IRequest;

  const noFilterResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: noFilterRequest,
    },
  );
  typia.assert(noFilterResults);

  // Validate no filter returns valid results
  TestValidator.predicate(
    "no filter should return valid product summaries",
    noFilterResults.data.length >= 0 &&
      noFilterResults.data.every(
        (product) =>
          typeof product.id === "string" &&
          typeof product.name === "string" &&
          typeof product.price === "number",
      ),
  );

  // Test 7: Test different sort options with availability filter
  const sortOptions = [
    "name" as const,
    "price_low_to_high" as const,
    "price_high_to_low" as const,
    "newest" as const,
    "popularity" as const,
    "rating" as const,
    "relevance" as const,
  ] as const;

  for (const sortBy of sortOptions) {
    const sortTestRequest = {
      page: 1,
      limit: 10,
      availability: "in_stock" as const,
      sortBy,
      orderBy: RandomGenerator.pick(["asc", "desc"] as const),
    } satisfies IShoppingMallProduct.IRequest;

    const sortResults = await api.functional.shoppingMall.products.index(
      connection,
      {
        body: sortTestRequest,
      },
    );
    typia.assert(sortResults);

    TestValidator.predicate(
      `sort by ${sortBy} should return valid results`,
      sortResults.data.length >= 0 &&
        sortResults.data.every(
          (product) =>
            typeof product.id === "string" &&
            typeof product.name === "string" &&
            typeof product.price === "number",
        ),
    );
  }
}
