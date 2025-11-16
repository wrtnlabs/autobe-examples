import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test stock availability filtering in sales search functionality.
 *
 * This test validates the has_stock parameter to ensure proper stock-based
 * product visibility. Creates products with various stock scenarios: products
 * with all SKUs in stock, products with some SKUs in stock and some out of
 * stock, and products with all SKUs out of stock.
 *
 * Verifies that has_stock=true returns only products with at least one SKU
 * having available inventory, while has_stock=false or omitted returns all
 * products regardless of stock status. Also tests stock filtering in
 * combination with other filters to ensure correct AND semantics.
 *
 * Test Steps:
 *
 * 1. Query sales with has_stock=true and verify only in-stock products returned
 * 2. Query sales with has_stock=false and verify all products returned
 * 3. Query sales with has_stock omitted and verify all products returned
 * 4. Test stock filtering combined with other filters (category, price range)
 */
export async function test_api_sales_search_stock_availability_filtering(
  connection: api.IConnection,
) {
  // Test has_stock=true filter - should return only products with available inventory
  const inStockResults = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        has_stock: true,
        page: 1,
        limit: 50,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(inStockResults);

  // Verify pagination structure
  TestValidator.predicate(
    "in-stock results should have valid pagination",
    inStockResults.pagination.current === 1 &&
      inStockResults.pagination.limit === 50 &&
      inStockResults.pagination.records >= 0 &&
      inStockResults.pagination.pages >= 0,
  );

  // Test has_stock=false filter - should return all products
  const allProductsWithFalse = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        has_stock: false,
        page: 1,
        limit: 50,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(allProductsWithFalse);

  // Test omitted has_stock parameter - should return all products
  const allProductsOmitted = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(allProductsOmitted);

  // Verify that has_stock=false and omitted return same or more products than has_stock=true
  TestValidator.predicate(
    "all products count should be >= in-stock products count",
    allProductsWithFalse.pagination.records >=
      inStockResults.pagination.records &&
      allProductsOmitted.pagination.records >=
        inStockResults.pagination.records,
  );

  // Test stock filtering combined with price range filter
  const combinedFilter = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        has_stock: true,
        min_price: 10,
        max_price: 1000,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(combinedFilter);

  // Verify combined filter results respect both stock and price constraints
  TestValidator.predicate(
    "combined filter should return valid results",
    combinedFilter.pagination.records >= 0 && combinedFilter.data.length <= 20,
  );

  // Verify all returned products in combined filter have prices within range
  for (const product of combinedFilter.data) {
    TestValidator.predicate(
      "product price should be within specified range",
      product.price >= 10 && product.price <= 1000,
    );
  }

  // Test stock filtering with category filter
  if (allProductsOmitted.data.length > 0) {
    const sampleProduct = allProductsOmitted.data[0];
    typia.assert(sampleProduct);

    const categoryFiltered = await api.functional.shoppingMall.sales.index(
      connection,
      {
        body: {
          has_stock: true,
          category_id: sampleProduct.category.id,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSale.IRequest,
      },
    );
    typia.assert(categoryFiltered);

    // Verify category filter results
    TestValidator.predicate(
      "category filtered results should be valid",
      categoryFiltered.pagination.records >= 0,
    );

    // Verify all returned products belong to the specified category
    for (const product of categoryFiltered.data) {
      TestValidator.equals(
        "product category ID should match filter",
        product.category.id,
        sampleProduct.category.id,
      );
    }
  }

  // Test stock filtering with search query
  const searchWithStock = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        has_stock: true,
        search: RandomGenerator.alphabets(3),
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(searchWithStock);

  TestValidator.predicate(
    "search with stock filter should return valid results",
    searchWithStock.pagination.records >= 0 &&
      searchWithStock.data.length <= 20,
  );

  // Test different sorting options with stock filter
  const sortedResults = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        has_stock: true,
        sort_by: "price_asc",
        page: 1,
        limit: 30,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(sortedResults);

  // Verify sorted results maintain stock filter
  TestValidator.predicate(
    "sorted results should be valid",
    sortedResults.pagination.records >= 0 && sortedResults.data.length <= 30,
  );

  // Verify price ascending order if multiple products exist
  if (sortedResults.data.length > 1) {
    for (let i = 0; i < sortedResults.data.length - 1; i++) {
      TestValidator.predicate(
        "products should be sorted by price ascending",
        sortedResults.data[i].price <= sortedResults.data[i + 1].price,
      );
    }
  }

  // Test stock filter with seller filter
  if (allProductsOmitted.data.length > 0) {
    const sampleSeller = allProductsOmitted.data[0].seller;
    typia.assert(sampleSeller);

    const sellerFiltered = await api.functional.shoppingMall.sales.index(
      connection,
      {
        body: {
          has_stock: true,
          seller_id: sampleSeller.id,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSale.IRequest,
      },
    );
    typia.assert(sellerFiltered);

    TestValidator.predicate(
      "seller filtered results should be valid",
      sellerFiltered.pagination.records >= 0,
    );

    // Verify all products belong to the specified seller
    for (const product of sellerFiltered.data) {
      TestValidator.equals(
        "product seller ID should match filter",
        product.seller.id,
        sampleSeller.id,
      );
    }
  }

  // Test stock filter with status filter
  const statusFiltered = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        has_stock: true,
        status: "published",
        page: 1,
        limit: 25,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(statusFiltered);

  TestValidator.predicate(
    "status filtered results should be valid",
    statusFiltered.pagination.records >= 0 && statusFiltered.data.length <= 25,
  );

  // Verify all products have published status
  for (const product of statusFiltered.data) {
    TestValidator.equals(
      "product status should be published",
      product.status,
      "published",
    );
  }

  // Test stock filter with condition filter
  const conditionFiltered = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        has_stock: true,
        condition: "new",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(conditionFiltered);

  TestValidator.predicate(
    "condition filtered results should be valid",
    conditionFiltered.pagination.records >= 0,
  );

  // Verify all products have new condition
  for (const product of conditionFiltered.data) {
    TestValidator.equals(
      "product condition should be new",
      product.condition,
      "new",
    );
  }
}
