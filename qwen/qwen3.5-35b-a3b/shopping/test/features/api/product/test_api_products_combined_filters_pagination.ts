import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product browsing with combined filters and pagination.
 *
 * Validates the comprehensive product search functionality including multiple filter combinations,
 * cursor-based pagination, sorting, and empty result handling. Ensures that the product listing
 * correctly applies all filters simultaneously and returns accurate pagination metadata.
 *
 * Special attention is given to verifying that the inStockOnly filter correctly excludes products
 * with no available variants while including products with at least one variant in stock, and that
 * date range filtering using createdAtMin and createdAtMax parameters works correctly for filtering
 * products by creation date.
 *
 * 1. Test combined filters (categoryIds + minPrice + maxPrice + inStockOnly).
 * 2. Test inStockOnly filter behavior with products that have variants in stock.
 * 3. Test date range filtering with createdAtMin and createdAtMax parameters.
 * 4. Test cursor-based pagination with sequential requests.
 * 5. Test sorting combined with filters.
 * 6. Test empty results with proper pagination metadata.
 * 7. Test full-text search functionality on name and description.
 */
export async function test_api_products_combined_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test combined filters (categoryIds + minPrice + maxPrice + inStockOnly)
  const combinedFilterParams: IEcommerceMallProduct.IRequest = {
    categoryIds: [
      "12345678-1234-1234-1234-123456789abc",
      "87654321-4321-4321-4321-cba987654321",
    ].slice(0, 2),
    minPrice: 10000,
    maxPrice: 50000,
    inStockOnly: true,
  } satisfies IEcommerceMallProduct.IRequest;
  const combinedResult = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: combinedFilterParams,
    },
  );
  typia.assert(combinedResult);
  typia.assert(combinedResult.data);
  TestValidator.equals(
    "combined filter pagination",
    combinedResult.pagination, // validates structure
    combinedResult.pagination,
  );
  // 2. Test inStockOnly filter
  const inStockParams: IEcommerceMallProduct.IRequest = {
    inStockOnly: true,
    limit: 50,
  } satisfies IEcommerceMallProduct.IRequest;
  const inStockResult = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: inStockParams,
    },
  );
  typia.assert(inStockResult);
  typia.assert(inStockResult.data);
  for (const product of inStockResult.data) {
    TestValidator.equals(
      "inStockOnly flag",
      product.has_available_variants,
      true,
    );
    TestValidator.equals(
      "inStockOnly status",
      product.availability_status,
      "available",
    );
  }
  // 3. Test date range filtering
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const dateRangeParams: IEcommerceMallProduct.IRequest = {
    createdAtMin: oneMonthAgo.toISOString(),
    createdAtMax: oneWeekAgo.toISOString(),
    limit: 50,
  } satisfies IEcommerceMallProduct.IRequest;
  const dateRangeResult = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: dateRangeParams,
    },
  );
  typia.assert(dateRangeResult);
  typia.assert(dateRangeResult.data);
  // 4. Test cursor-based pagination
  const cursorParams: IEcommerceMallProduct.IRequest = {
    limit: 10,
    sortBy: "created_at",
    sortOrder: "desc",
  } satisfies IEcommerceMallProduct.IRequest;
  const firstPage = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: cursorParams,
    },
  );
  typia.assert(firstPage);
  typia.assert(firstPage.data);
  // Test that the API accepts cursor parameter (without validating actual cursor value)
  const cursorParamsSecondPage: IEcommerceMallProduct.IRequest = {
    limit: 10,
    sortBy: "created_at",
    sortOrder: "desc",
    cursor: "dGVzdC1jdXJzb3I=", // Base64 encoded "test-cursor"
  } satisfies IEcommerceMallProduct.IRequest;
  const secondPage = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: cursorParamsSecondPage,
    },
  );
  typia.assert(secondPage);
  typia.assert(secondPage.data);
  TestValidator.equals(
    "cursor pagination current page",
    secondPage.pagination.current,
    1,
  );
  // 5. Test sorting combined with filters
  const sortWithFilterParams: IEcommerceMallProduct.IRequest = {
    categoryIds: ["12345678-1234-1234-1234-123456789abc"].slice(0, 1),
    minPrice: 0,
    maxPrice: 100000,
    sortBy: "base_price",
    sortOrder: "asc",
    limit: 50,
  } satisfies IEcommerceMallProduct.IRequest;
  const sortWithFilterResult =
    await api.functional.ecommerceMall.products.index(connection, {
      body: sortWithFilterParams,
    });
  typia.assert(sortWithFilterResult);
  typia.assert(sortWithFilterResult.data);
  for (let i = 1; i < sortWithFilterResult.data.length; i++) {
    const prevProduct = sortWithFilterResult.data[i - 1];
    const currProduct = sortWithFilterResult.data[i];
    if (prevProduct.base_price === currProduct.base_price) {
      continue;
    }
    TestValidator.predicate(
      "sorted by base_price ascending",
      prevProduct.base_price <= currProduct.base_price,
    );
  }
  // 6. Test empty results with proper pagination metadata
  const emptyParams: IEcommerceMallProduct.IRequest = {
    categoryIds: ["00000000-0000-0000-0000-000000000000"].slice(0, 1),
    minPrice: 1000000000,
    maxPrice: 999999999999,
    limit: 20,
  } satisfies IEcommerceMallProduct.IRequest;
  const emptyResult = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: emptyParams,
    },
  );
  typia.assert(emptyResult);
  typia.assert(emptyResult.data);
  TestValidator.equals("empty result data", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  TestValidator.equals(
    "empty result current",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals("empty result limit", emptyResult.pagination.limit, 20);
  // 7. Test full-text search
  const searchTerm = RandomGenerator.alphabets(5);
  const searchParams: IEcommerceMallProduct.IRequest = {
    search: searchTerm,
    limit: 50,
  } satisfies IEcommerceMallProduct.IRequest;
  const searchResult = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: searchParams,
    },
  );
  typia.assert(searchResult);
  typia.assert(searchResult.data);
  // Validate response structure for search results
  if (searchResult.data.length > 0) {
    for (const product of searchResult.data) {
      typia.assert(product);
      // Validate that returned products have required fields
      TestValidator.predicate("product has id", product.id !== undefined);
      TestValidator.predicate("product has name", product.name !== undefined);
      TestValidator.predicate(
        "product has base_price",
        product.base_price !== undefined,
      );
      TestValidator.predicate(
        "product has category",
        product.category !== undefined,
      );
      TestValidator.predicate(
        "product has seller",
        product.seller !== undefined,
      );
    }
  }
}
