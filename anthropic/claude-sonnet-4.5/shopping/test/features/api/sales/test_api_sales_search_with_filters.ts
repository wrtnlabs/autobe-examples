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
 * Test comprehensive filtering capabilities of the product sales search
 * endpoint.
 *
 * This test validates the search functionality by testing partial product name
 * matching with various query strings, category filtering, price range
 * filtering (min_price and max_price), status filtering to ensure draft and
 * pending products are excluded from unauthenticated searches, condition
 * filtering (new, refurbished, used), brand filtering with exact matching, and
 * stock availability filtering. The test verifies that multiple filters combine
 * with AND semantics.
 *
 * Test Steps:
 *
 * 1. Perform basic search without filters to establish baseline
 * 2. Test partial name search with various query strings
 * 3. Test category filtering by category_id
 * 4. Test price range filtering with min_price and max_price
 * 5. Test status filtering (published vs non-published)
 * 6. Test condition filtering (new, refurbished, used)
 * 7. Test brand filtering with exact name matching
 * 8. Test stock availability filtering with has_stock parameter
 * 9. Test combination of multiple filters with AND semantics
 * 10. Validate pagination works correctly with filters
 */
export async function test_api_sales_search_with_filters(
  connection: api.IConnection,
) {
  // Test basic search without filters - should return paginated results
  const basicSearch = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(basicSearch);

  // Validate pagination structure
  TestValidator.equals(
    "basic search current page",
    basicSearch.pagination.current,
    1,
  );
  TestValidator.equals("basic search limit", basicSearch.pagination.limit, 20);
  TestValidator.predicate(
    "basic search has valid records count",
    basicSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "basic search has valid pages count",
    basicSearch.pagination.pages >= 0,
  );

  // Test partial name search with minimum length
  const searchByName = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        search: "pr",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(searchByName);

  // Test category filtering
  const categorySearch = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(categorySearch);

  // Test price range filtering - min_price only
  const minPriceSearch = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        min_price: 100,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(minPriceSearch);

  // Validate all returned products have price >= min_price
  for (const product of minPriceSearch.data) {
    TestValidator.predicate(
      "product price meets minimum",
      product.price >= 100,
    );
  }

  // Test price range filtering - max_price only
  const maxPriceSearch = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        max_price: 500,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(maxPriceSearch);

  // Validate all returned products have price <= max_price
  for (const product of maxPriceSearch.data) {
    TestValidator.predicate(
      "product price meets maximum",
      product.price <= 500,
    );
  }

  // Test price range filtering - both min and max
  const priceRangeSearch = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        min_price: 100,
        max_price: 500,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(priceRangeSearch);

  // Validate all products are within price range
  for (const product of priceRangeSearch.data) {
    TestValidator.predicate(
      "product price within range",
      product.price >= 100 && product.price <= 500,
    );
  }

  // Test status filtering - published only
  const statusPublished = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        status: "published",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(statusPublished);

  // Validate all returned products are published
  for (const product of statusPublished.data) {
    TestValidator.equals(
      "product status is published",
      product.status,
      "published",
    );
  }

  // Test condition filtering - new products
  const conditionNew = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        condition: "new",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(conditionNew);

  // Validate all returned products are new
  for (const product of conditionNew.data) {
    TestValidator.equals("product condition is new", product.condition, "new");
  }

  // Test condition filtering - refurbished products
  const conditionRefurbished = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        condition: "refurbished",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(conditionRefurbished);

  // Validate all returned products are refurbished
  for (const product of conditionRefurbished.data) {
    TestValidator.equals(
      "product condition is refurbished",
      product.condition,
      "refurbished",
    );
  }

  // Test condition filtering - used products
  const conditionUsed = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        condition: "used",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(conditionUsed);

  // Validate all returned products are used
  for (const product of conditionUsed.data) {
    TestValidator.equals(
      "product condition is used",
      product.condition,
      "used",
    );
  }

  // Test brand filtering
  const brandFilter = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        brand: "TestBrand",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(brandFilter);

  // Validate brand filtering if results exist
  for (const product of brandFilter.data) {
    if (product.brand !== null && product.brand !== undefined) {
      TestValidator.equals(
        "product brand matches filter",
        product.brand,
        "TestBrand",
      );
    }
  }

  // Test stock availability filtering
  const stockAvailable = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        has_stock: true,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(stockAvailable);

  // Test combined filters with AND semantics
  const combinedFilters = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        search: "product",
        min_price: 50,
        max_price: 1000,
        condition: "new",
        status: "published",
        has_stock: true,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(combinedFilters);

  // Validate combined filter results
  for (const product of combinedFilters.data) {
    TestValidator.predicate(
      "combined filters: price in range",
      product.price >= 50 && product.price <= 1000,
    );
    TestValidator.equals(
      "combined filters: condition is new",
      product.condition,
      "new",
    );
    TestValidator.equals(
      "combined filters: status is published",
      product.status,
      "published",
    );
  }

  // Test sorting options
  const sortByPriceAsc = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        sort_by: "price_asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(sortByPriceAsc);

  // Validate ascending price sort order
  for (let i = 1; i < sortByPriceAsc.data.length; i++) {
    TestValidator.predicate(
      "price ascending order",
      sortByPriceAsc.data[i - 1].price <= sortByPriceAsc.data[i].price,
    );
  }

  const sortByPriceDesc = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        sort_by: "price_desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(sortByPriceDesc);

  // Validate descending price sort order
  for (let i = 1; i < sortByPriceDesc.data.length; i++) {
    TestValidator.predicate(
      "price descending order",
      sortByPriceDesc.data[i - 1].price >= sortByPriceDesc.data[i].price,
    );
  }

  const sortByCreatedAt = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(sortByCreatedAt);

  // Test pagination with page 2
  const page2Results = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(page2Results);
  TestValidator.equals("pagination page 2", page2Results.pagination.current, 2);

  // Test with maximum limit
  const maxLimitResults = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(maxLimitResults);
  TestValidator.predicate(
    "max limit results array length",
    maxLimitResults.data.length <= 100,
  );
  TestValidator.equals(
    "max limit in pagination",
    maxLimitResults.pagination.limit,
    100,
  );
}
