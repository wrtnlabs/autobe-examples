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

export async function test_api_product_search_edge_cases_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search with criteria that matches no products should return empty results
  const emptySearchResult = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        search: "xyznonexistentproductsearch12345",
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
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search data is empty array",
    emptySearchResult.data,
    [],
  );
  TestValidator.equals(
    "empty search records is 0",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search pages is 0",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search current page is 1",
    emptySearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search limit is 20",
    emptySearchResult.pagination.limit,
    20,
  );
  // Test 2: Search with only null filters to get all products
  const allProductsResult = await api.functional.ecommerceMall.products.index(
    connection,
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
  // Test 3: Pagination defaults - page=1, limit=20
  const firstPageResult = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        search: null,
        categoryId: null,
        subcategoryId: null,
        minPrice: null,
        maxPrice: null,
        inStockOnly: null,
        sortBy: null,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(firstPageResult);
  TestValidator.equals(
    "first page current is 1",
    firstPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit is 20",
    firstPageResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "first page data length does not exceed limit",
    firstPageResult.data.length <= 20,
  );
  // Test 4: Request page beyond available data
  const farPage = Math.max(1000, firstPageResult.pagination.pages + 10);
  const beyondPageResult = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        search: null,
        categoryId: null,
        subcategoryId: null,
        minPrice: null,
        maxPrice: null,
        inStockOnly: null,
        sortBy: null,
        page: farPage,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(beyondPageResult);
  TestValidator.equals("beyond page data is empty", beyondPageResult.data, []);
  TestValidator.equals(
    "beyond page records match total",
    beyondPageResult.pagination.records,
    firstPageResult.pagination.records,
  );
  TestValidator.equals(
    "beyond page current is farPage",
    beyondPageResult.pagination.current,
    farPage,
  );
  // Test 5: Combined filters with search text, price range, and inStockOnly
  const combinedFilterResult =
    await api.functional.ecommerceMall.products.index(connection, {
      body: {
        search: "a",
        categoryId: null,
        subcategoryId: null,
        minPrice: 0,
        maxPrice: 1000000,
        inStockOnly: true,
        sortBy: "newest",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filter pagination current is 1",
    combinedFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter pagination limit is 10",
    combinedFilterResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "combined filter data length does not exceed limit",
    combinedFilterResult.data.length <= 10,
  );
  // Test 6: Filter by subcategoryId with random non-existent UUID (edge case)
  const subcategoryFilterResult =
    await api.functional.ecommerceMall.products.index(connection, {
      body: {
        search: null,
        categoryId: null,
        subcategoryId: typia.random<string & tags.Format<"uuid">>(),
        minPrice: null,
        maxPrice: null,
        inStockOnly: null,
        sortBy: null,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(subcategoryFilterResult);
  // Test 7: Different sort orders to ensure they work
  const sortByPriceAsc = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        search: null,
        categoryId: null,
        subcategoryId: null,
        minPrice: null,
        maxPrice: null,
        inStockOnly: null,
        sortBy: "priceAsc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(sortByPriceAsc);
  const sortByPriceDesc = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        search: null,
        categoryId: null,
        subcategoryId: null,
        minPrice: null,
        maxPrice: null,
        inStockOnly: null,
        sortBy: "priceDesc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(sortByPriceDesc);
  // Test 8: Pagination with custom limit
  const limitPageResult = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        search: null,
        categoryId: null,
        subcategoryId: null,
        minPrice: null,
        maxPrice: null,
        inStockOnly: null,
        sortBy: null,
        page: 2,
        limit: 5,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(limitPageResult);
  TestValidator.equals(
    "custom limit page current is 2",
    limitPageResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom limit is 5",
    limitPageResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "custom limit data length does not exceed limit",
    limitPageResult.data.length <= 5,
  );
}
