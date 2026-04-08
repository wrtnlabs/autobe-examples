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

export async function test_api_product_search_with_filters_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  const searchConnection: api.IConnection = { host: connection.host };
  // Test 1: Search with text query using GIN trigram
  const textSearchResult = await api.functional.ecommerceMall.products.index(
    searchConnection,
    {
      body: {
        search: RandomGenerator.alphabets(5),
        categoryId: null,
        subcategoryId: null,
        minPrice: null,
        maxPrice: null,
        inStockOnly: null,
        sortBy: "newest",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(textSearchResult);
  // Test 2: Search with price range filters (minPrice and maxPrice)
  const priceFilterResult = await api.functional.ecommerceMall.products.index(
    searchConnection,
    {
      body: {
        search: null,
        categoryId: null,
        subcategoryId: null,
        minPrice: 1000,
        maxPrice: 50000,
        inStockOnly: null,
        sortBy: "priceAsc",
        page: null,
        limit: null,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceFilterResult);
  // Test 3: Search with in-stock filter and price descending sort
  const inStockResult = await api.functional.ecommerceMall.products.index(
    searchConnection,
    {
      body: {
        search: null,
        categoryId: null,
        subcategoryId: null,
        minPrice: null,
        maxPrice: null,
        inStockOnly: true,
        sortBy: "priceDesc",
        page: null,
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(inStockResult);
  // Test 4: Search with no filters to test pagination metadata
  const allProductsResult = await api.functional.ecommerceMall.products.index(
    searchConnection,
    {
      body: {
        search: null,
        categoryId: null,
        subcategoryId: null,
        minPrice: null,
        maxPrice: null,
        inStockOnly: null,
        sortBy: null,
        page: null,
        limit: null,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(allProductsResult);
  // Validate business logic: All returned products should have approved seller status
  const allResults = [
    textSearchResult,
    priceFilterResult,
    inStockResult,
    allProductsResult,
  ];
  for (const result of allResults) {
    for (const product of result.data) {
      TestValidator.equals(
        "seller approval status is approved",
        product.seller.approvalStatus,
        "approved",
      );
    }
  }
  // Validate pagination metadata is correctly structured
  TestValidator.predicate(
    "current page is valid",
    allProductsResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    allProductsResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records is non-negative",
    allProductsResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    allProductsResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    allProductsResult.pagination.pages ===
      Math.ceil(
        allProductsResult.pagination.records /
          allProductsResult.pagination.limit,
      ) ||
      (allProductsResult.pagination.records === 0 &&
        allProductsResult.pagination.pages === 0),
  );
}
