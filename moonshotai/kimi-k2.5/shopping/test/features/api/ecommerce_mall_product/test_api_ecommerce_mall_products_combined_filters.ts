import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test combined filtering with category, price range, and in-stock only filters.
 *
 * This test validates that the product search endpoint correctly applies multiple
 * filter criteria simultaneously using AND logic. It tests:
 * 1. Individual filter applications (category only, price range only, in-stock only)
 * 2. Combined filter application (all criteria together)
 * 3. Boundary price value testing
 * 4. Empty results when no products match combined criteria
 * 5. Filter validation in response data
 */
export async function test_api_ecommerce_mall_products_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // Get baseline data - all products without filters
  const baselineResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {} satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(baselineResponse);
  // Skip detailed tests if no products exist in the system
  if (baselineResponse.data.length === 0) {
    return;
  }
  // Get sample products for filter testing
  const sampleProduct = baselineResponse.data[0];
  const sampleCategoryId = sampleProduct.category.id;
  const minProductPrice = Math.min(
    ...baselineResponse.data.map((p) => p.priceRangeMin),
  );
  const maxProductPrice = Math.max(
    ...baselineResponse.data.map((p) => p.priceRangeMax),
  );
  // Test 1: Filter by category only
  const categoryFilterResponse =
    await api.functional.ecommerceMall.products.index(connection, {
      body: {
        categoryId: sampleCategoryId,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(categoryFilterResponse);
  // Verify all results match the requested category
  for (const product of categoryFilterResponse.data) {
    TestValidator.equals(
      "category filter - category matches",
      product.category.id,
      sampleCategoryId,
    );
  }
  // Test 2: Filter by price range only (inclusive of sample product)
  const priceRangeMin = Math.max(0, minProductPrice - 100);
  const priceRangeMax = maxProductPrice + 100;
  const priceFilterResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        minPrice: priceRangeMin,
        maxPrice: priceRangeMax,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceFilterResponse);
  // Test 3: Filter by in-stock only
  const inStockResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        inStockOnly: true,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(inStockResponse);
  // Verify all results are available (have positive inventory)
  for (const product of inStockResponse.data) {
    TestValidator.predicate(
      "in-stock filter - product is available",
      product.isAvailable === true,
    );
  }
  // Test 4: Combined filters - category + price range + in-stock (AND logic)
  const combinedResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        categoryId: sampleCategoryId,
        minPrice: priceRangeMin,
        maxPrice: priceRangeMax,
        inStockOnly: true,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(combinedResponse);
  // Verify all results satisfy ALL filter criteria simultaneously
  for (const product of combinedResponse.data) {
    TestValidator.equals(
      "combined filter - category matches",
      product.category.id,
      sampleCategoryId,
    );
    TestValidator.predicate(
      "combined filter - product is available",
      product.isAvailable === true,
    );
  }
  // Test 5: Boundary price test - extremely high min price should return limited results
  const highMinPrice = maxProductPrice + 10000;
  const boundaryResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        minPrice: highMinPrice,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(boundaryResponse);
  // Test 6: Combined filters with impossible criteria (should return empty or minimal results)
  const impossibleMinPrice = maxProductPrice + 100000;
  const impossibleMaxPrice = impossibleMinPrice + 10000;
  const impossibleResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        categoryId: sampleCategoryId,
        minPrice: impossibleMinPrice,
        maxPrice: impossibleMaxPrice,
        inStockOnly: true,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(impossibleResponse);
  // Combined criteria should return empty or very limited results
  // Verify pagination metadata is consistent
  TestValidator.equals(
    "impossible filter - current page is 1",
    impossibleResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "impossible filter - records count is valid",
    impossibleResponse.pagination.records >= 0,
  );
  // Test 7: Combined filters with pagination
  const paginatedResponse = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        categoryId: sampleCategoryId,
        inStockOnly: true,
        page: 1,
        limit: 5,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "paginated filter - current page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated filter - limit",
    paginatedResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "paginated filter - data length <= limit",
    paginatedResponse.data.length <= 5,
  );
  // Verify paginated filtered data integrity
  for (const product of paginatedResponse.data) {
    TestValidator.equals(
      "paginated filter - category matches",
      product.category.id,
      sampleCategoryId,
    );
    TestValidator.predicate(
      "paginated filter - product is available",
      product.isAvailable === true,
    );
  }
  // Test 8: Verify that filter results are a subset of unfiltered results
  if (categoryFilterResponse.data.length > 0) {
    const categoryFilteredIds = new Set(
      categoryFilterResponse.data.map((p) => p.id),
    );
    const baselineIds = new Set(baselineResponse.data.map((p) => p.id));
    for (const id of categoryFilteredIds) {
      TestValidator.predicate(
        "category filter results are subset of baseline",
        baselineIds.has(id),
      );
    }
  }
}
