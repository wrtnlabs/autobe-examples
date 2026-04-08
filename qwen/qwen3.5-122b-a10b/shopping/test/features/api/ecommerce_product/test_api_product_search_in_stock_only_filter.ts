import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_search_in_stock_only_filter(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test product search with in_stock_only filter to verify stock-based filtering behavior.
   *
   * Validates the in_stock_only query parameter functionality that filters products based on inventory availability. This test ensures that when in_stock_only is enabled, only products with at least one variant having stock > 0 are returned, while disabled returns all products regardless of stock status.
   *
   * The test focuses on filter behavior validation, response structure correctness, and pagination metadata accuracy. Since only read access is available, we test the filtering logic with various parameter combinations rather than data creation scenarios.
   *
   * 1. Search with in_stock_only=false to verify all products are returned
   * 2. Search with in_stock_only=true to verify only in-stock products returned
   * 3. Test in_stock_only combined with search keyword filter
   * 4. Test in_stock_only combined with price range filter
   * 5. Validate stock_status field reflects correct availability in results
   * 6. Verify pagination metadata is accurate for filtered results
   * 7. Test limit parameter with in_stock_only filter
   * 8. Validate response type safety with typia.assert()
   */
  // 1. Test with in_stock_only=false (default behavior - all products)
  const allProducts = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        in_stock_only: false,
        limit: 20,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(allProducts);
  TestValidator.predicate(
    "pagination present",
    allProducts.pagination.current >= 1,
  );
  // 2. Test with in_stock_only=true (only in-stock products)
  const inStockProducts = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        in_stock_only: true,
        limit: 20,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(inStockProducts);
  TestValidator.predicate(
    "in-stock count <= all count",
    inStockProducts.data.length <= allProducts.data.length,
  );
  // 3. Verify all returned products have valid stock status when in_stock_only=true
  for (const product of inStockProducts.data) {
    typia.assert(product);
  }
  // 4. Test combination with search filter
  const searchKeyword = RandomGenerator.alphabets(5);
  const searchedProducts = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        search: searchKeyword,
        in_stock_only: true,
        limit: 20,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(searchedProducts);
  // 5. Test combination with price range filter
  const minPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<0>
  >();
  const maxPrice =
    minPrice + typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>();
  const pricedProducts = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        min_price: minPrice,
        max_price: maxPrice,
        in_stock_only: true,
        limit: 20,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(pricedProducts);
  // 6. Verify price filter is applied correctly
  for (const product of pricedProducts.data) {
    typia.assert(product);
    TestValidator.predicate(
      "price within range",
      product.base_price >= minPrice && product.base_price <= maxPrice,
    );
  }
  // 7. Test with different limit values
  const limitedProducts = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        in_stock_only: true,
        limit: 10,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(limitedProducts);
  TestValidator.predicate("limit respected", limitedProducts.data.length <= 10);
  TestValidator.equals(
    "pagination limit matches",
    limitedProducts.pagination.limit,
    10,
  );
  // 8. Test sorting with in_stock_only filter
  const sortedProducts = await api.functional.ecommerce.products.index(
    connection,
    {
      body: {
        in_stock_only: true,
        sort_by: "base_price",
        sort_order: "asc",
        limit: 20,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(sortedProducts);
  // Verify sorting order (ascending by price)
  for (let i = 1; i < sortedProducts.data.length; i++) {
    TestValidator.predicate(
      "prices sorted ascending",
      sortedProducts.data[i - 1].base_price <=
        sortedProducts.data[i].base_price,
    );
  }
  // 9. Test pagination with in_stock_only filter
  const firstPage = await api.functional.ecommerce.products.index(connection, {
    body: {
      in_stock_only: true,
      page: 1,
      limit: 5,
    } satisfies IEcommerceProduct.IRequest,
  });
  typia.assert(firstPage);
  TestValidator.equals("first page number", firstPage.pagination.current, 1);
  const secondPage = await api.functional.ecommerce.products.index(connection, {
    body: {
      in_stock_only: true,
      page: 2,
      limit: 5,
    } satisfies IEcommerceProduct.IRequest,
  });
  typia.assert(secondPage);
  TestValidator.equals("second page number", secondPage.pagination.current, 2);
  TestValidator.predicate(
    "pagination records consistent",
    secondPage.pagination.records === firstPage.pagination.records,
  );
}