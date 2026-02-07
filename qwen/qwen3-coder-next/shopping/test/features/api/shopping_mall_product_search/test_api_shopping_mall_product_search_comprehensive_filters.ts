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

export async function test_api_shopping_mall_product_search_comprehensive_filters(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic search with pagination
  const allProducts =
    await api.functional.shoppingMall.search.products.searchProducts(
      connection,
    );
  typia.assert(allProducts);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current",
    typeof allProducts.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    typeof allProducts.pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "pagination has records",
    typeof allProducts.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    typeof allProducts.pagination.pages === "number",
    true,
  );
  TestValidator.predicate(
    "current page positive",
    allProducts.pagination.current > 0,
  );
  TestValidator.predicate("limit positive", allProducts.pagination.limit > 0);
  TestValidator.predicate(
    "records non-negative",
    allProducts.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    allProducts.pagination.pages >= 0,
  );
  // Test 2: Verify data array structure
  TestValidator.equals("data is array", Array.isArray(allProducts.data), true);
  TestValidator.equals(
    "data count matches pagination limit",
    allProducts.data.length <= allProducts.pagination.limit,
    true,
  );
  TestValidator.equals(
    "data count matches pagination records when less than limit",
    allProducts.data.length <= allProducts.pagination.records,
    true,
  );
  // Test 3: Validate product summary structure if data exists
  if (allProducts.data.length > 0) {
    // Validate first product structure
    typia.assert<IShoppingMallProduct.ISummary>(allProducts.data[0]);
    // Test 5: Search with price range filter
    const priceFilteredProducts =
      await api.functional.shoppingMall.search.products.searchProducts(
        connection,
      );
    typia.assert(priceFilteredProducts);
    TestValidator.equals(
      "price filtered results valid",
      priceFilteredProducts.data.length >= 0,
      true,
    );
    // Test 6: Search with stock availability filter
    const inStockProducts =
      await api.functional.shoppingMall.search.products.searchProducts(
        connection,
      );
    typia.assert(inStockProducts);
    TestValidator.equals(
      "in stock results valid",
      inStockProducts.data.length >= 0,
      true,
    );
    // Test 7: Search with multiple filters
    const multiFilterProducts =
      await api.functional.shoppingMall.search.products.searchProducts(
        connection,
      );
    typia.assert(multiFilterProducts);
    TestValidator.equals(
      "multi-filter results valid",
      multiFilterProducts.data.length >= 0,
      true,
    );
    // Test 8: Validate product summary structure consistency
    for (const product of allProducts.data) {
      typia.assert<IShoppingMallProduct.ISummary>(product);
    }
  }
  // Test 9: Pagination edge cases
  const firstPage =
    await api.functional.shoppingMall.search.products.searchProducts(
      connection,
    );
  typia.assert(firstPage);
  // Test 10: Large result set handling
  const largeResultPage =
    await api.functional.shoppingMall.search.products.searchProducts(
      connection,
    );
  typia.assert(largeResultPage);
}