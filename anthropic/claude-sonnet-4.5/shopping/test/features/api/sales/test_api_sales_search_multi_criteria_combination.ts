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
 * Test complex scenarios combining multiple search criteria simultaneously.
 *
 * This test validates the multi-criteria search functionality of the sales
 * search API, ensuring that when multiple filters are applied together (search
 * text, category, price range, status, condition, brand, seller, stock
 * availability, and sorting), they work correctly with AND semantics.
 *
 * The test simulates a realistic buyer scenario: searching for 'laptop'
 * products in the Electronics category with price range $500-$1500, condition
 * 'new', with stock available, sorted by price ascending.
 *
 * Test Steps:
 *
 * 1. Execute comprehensive multi-criteria search combining all available filters
 * 2. Validate that returned products match the applied criteria when verifiable
 * 3. Test each filter type individually to ensure proper API parameter handling
 * 4. Verify all sorting options work correctly
 * 5. Validate pagination metadata structure and integrity
 * 6. Confirm response structure matches schema for all search variations
 */
export async function test_api_sales_search_multi_criteria_combination(
  connection: api.IConnection,
) {
  // Test 1: Comprehensive multi-criteria search with all filters
  const comprehensiveSearch = {
    page: 1,
    limit: 20,
    search: "laptop",
    min_price: 500,
    max_price: 1500,
    status: "published" as const,
    condition: "new" as const,
    sort_by: "price_asc" as const,
    has_stock: true,
  } satisfies IShoppingMallSale.IRequest;

  const comprehensiveResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: comprehensiveSearch,
    });

  typia.assert(comprehensiveResult);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination current should match request",
    comprehensiveResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    comprehensiveResult.pagination.limit === 20,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    comprehensiveResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    comprehensiveResult.pagination.pages >= 0,
  );

  // Validate data is array
  TestValidator.predicate(
    "response data should be an array",
    Array.isArray(comprehensiveResult.data),
  );

  // Validate returned products match verifiable criteria
  for (const product of comprehensiveResult.data) {
    // Validate search text criteria if product title contains searchable text
    if (comprehensiveSearch.search) {
      TestValidator.predicate(
        "product title should contain search term when search filter applied",
        product.title
          .toLowerCase()
          .includes(comprehensiveSearch.search.toLowerCase()),
      );
    }

    // Validate price range criteria
    TestValidator.predicate(
      "product price should be within specified range",
      product.price >= 500 && product.price <= 1500,
    );

    // Validate status criteria
    TestValidator.equals(
      "product status should match filter",
      product.status,
      "published",
    );

    // Validate condition criteria
    TestValidator.equals(
      "product condition should match filter",
      product.condition,
      "new",
    );
  }

  // Validate price ascending sort order
  if (comprehensiveResult.data.length > 1) {
    for (let i = 0; i < comprehensiveResult.data.length - 1; i++) {
      TestValidator.predicate(
        "products should be sorted by price ascending",
        comprehensiveResult.data[i].price <=
          comprehensiveResult.data[i + 1].price,
      );
    }
  }

  // Test 2: Category filter
  const randomCategoryId = typia.random<string & tags.Format<"uuid">>();
  const categoryFilterSearch: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        category_id: randomCategoryId,
        status: "published" as const,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    });

  typia.assert(categoryFilterSearch);

  // Validate all returned products belong to the specified category
  for (const product of categoryFilterSearch.data) {
    TestValidator.equals(
      "product category should match filter",
      product.category.id,
      randomCategoryId,
    );
  }

  // Test 3: Seller filter
  const randomSellerId = typia.random<string & tags.Format<"uuid">>();
  const sellerFilterSearch: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        seller_id: randomSellerId,
        status: "published" as const,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    });

  typia.assert(sellerFilterSearch);

  // Validate all returned products belong to the specified seller
  for (const product of sellerFilterSearch.data) {
    TestValidator.equals(
      "product seller should match filter",
      product.seller.id,
      randomSellerId,
    );
  }

  // Test 4: Brand filter
  const brandName = RandomGenerator.name();
  const brandFilterSearch: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        brand: brandName,
        status: "published" as const,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    });

  typia.assert(brandFilterSearch);

  // Validate all returned products match the brand filter
  for (const product of brandFilterSearch.data) {
    if (product.brand !== null && product.brand !== undefined) {
      TestValidator.equals(
        "product brand should match filter when brand is present",
        product.brand,
        brandName,
      );
    }
  }

  // Test 5: Maximum price filter only
  const maxPriceOnly: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        max_price: 1500,
        status: "published" as const,
        limit: 15,
      } satisfies IShoppingMallSale.IRequest,
    });

  typia.assert(maxPriceOnly);

  // Validate all products respect max_price
  for (const product of maxPriceOnly.data) {
    TestValidator.predicate(
      "product price should not exceed max_price filter",
      product.price <= 1500,
    );
  }

  // Test 6: Minimum price filter only
  const minPriceOnly: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        min_price: 500,
        status: "published" as const,
        limit: 15,
      } satisfies IShoppingMallSale.IRequest,
    });

  typia.assert(minPriceOnly);

  // Validate all products respect min_price
  for (const product of minPriceOnly.data) {
    TestValidator.predicate(
      "product price should be at least min_price filter",
      product.price >= 500,
    );
  }

  // Test 7: Price range combination (both min and max)
  const priceRangeSearch: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        min_price: 500,
        max_price: 1500,
        status: "published" as const,
      } satisfies IShoppingMallSale.IRequest,
    });

  typia.assert(priceRangeSearch);

  // Validate price range is respected
  for (const product of priceRangeSearch.data) {
    TestValidator.predicate(
      "product price should be within min and max range",
      product.price >= 500 && product.price <= 1500,
    );
  }

  // Test 8: Sort by price descending
  const sortPriceDesc: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        sort_by: "price_desc" as const,
        limit: 10,
        status: "published" as const,
      } satisfies IShoppingMallSale.IRequest,
    });

  typia.assert(sortPriceDesc);

  // Validate descending price order
  if (sortPriceDesc.data.length > 1) {
    for (let i = 0; i < sortPriceDesc.data.length - 1; i++) {
      TestValidator.predicate(
        "products should be sorted by price descending",
        sortPriceDesc.data[i].price >= sortPriceDesc.data[i + 1].price,
      );
    }
  }

  // Test 9: Sort by title ascending
  const sortTitleAsc: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        sort_by: "title_asc" as const,
        limit: 10,
        status: "published" as const,
      } satisfies IShoppingMallSale.IRequest,
    });

  typia.assert(sortTitleAsc);

  // Validate ascending title order
  if (sortTitleAsc.data.length > 1) {
    for (let i = 0; i < sortTitleAsc.data.length - 1; i++) {
      TestValidator.predicate(
        "products should be sorted by title ascending",
        sortTitleAsc.data[i].title.toLowerCase() <=
          sortTitleAsc.data[i + 1].title.toLowerCase(),
      );
    }
  }

  // Test 10: Sort by title descending
  const sortTitleDesc: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        sort_by: "title_desc" as const,
        limit: 10,
        status: "published" as const,
      } satisfies IShoppingMallSale.IRequest,
    });

  typia.assert(sortTitleDesc);

  // Validate descending title order
  if (sortTitleDesc.data.length > 1) {
    for (let i = 0; i < sortTitleDesc.data.length - 1; i++) {
      TestValidator.predicate(
        "products should be sorted by title descending",
        sortTitleDesc.data[i].title.toLowerCase() >=
          sortTitleDesc.data[i + 1].title.toLowerCase(),
      );
    }
  }

  // Test 11: Sort by created_at (default sorting)
  const sortCreatedAt: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        sort_by: "created_at" as const,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    });

  typia.assert(sortCreatedAt);

  // Test 12: Condition filter - used
  const usedCondition: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        condition: "used" as const,
        status: "published" as const,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    });

  typia.assert(usedCondition);

  // Validate all products have used condition
  for (const product of usedCondition.data) {
    TestValidator.equals(
      "product condition should be used",
      product.condition,
      "used",
    );
  }

  // Test 13: Condition filter - refurbished
  const refurbishedCondition: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        condition: "refurbished" as const,
        status: "published" as const,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    });

  typia.assert(refurbishedCondition);

  // Validate all products have refurbished condition
  for (const product of refurbishedCondition.data) {
    TestValidator.equals(
      "product condition should be refurbished",
      product.condition,
      "refurbished",
    );
  }

  // Test 14: Different status values
  const statusDraft: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        status: "draft" as const,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    });

  typia.assert(statusDraft);

  for (const product of statusDraft.data) {
    TestValidator.equals(
      "product status should be draft",
      product.status,
      "draft",
    );
  }

  // Test 15: Pagination - page 2
  const page2: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        page: 2,
        limit: 5,
        status: "published" as const,
      } satisfies IShoppingMallSale.IRequest,
    });

  typia.assert(page2);

  TestValidator.equals(
    "pagination current should be page 2",
    page2.pagination.current,
    2,
  );

  TestValidator.equals(
    "pagination limit should be 5",
    page2.pagination.limit,
    5,
  );

  // Test 16: Combined filters - search + price + condition
  const combinedFilters: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        search: "phone",
        min_price: 100,
        max_price: 800,
        condition: "new" as const,
        status: "published" as const,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    });

  typia.assert(combinedFilters);

  // Validate AND semantics - all filters must be satisfied
  for (const product of combinedFilters.data) {
    TestValidator.predicate(
      "product should match search term",
      product.title.toLowerCase().includes("phone"),
    );

    TestValidator.predicate(
      "product price should be in range",
      product.price >= 100 && product.price <= 800,
    );

    TestValidator.equals(
      "product condition should be new",
      product.condition,
      "new",
    );

    TestValidator.equals(
      "product status should be published",
      product.status,
      "published",
    );
  }

  // Test 17: Empty/minimal search to verify API handles minimal parameters
  const minimalSearch: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {} satisfies IShoppingMallSale.IRequest,
    });

  typia.assert(minimalSearch);

  TestValidator.predicate(
    "minimal search should return valid pagination",
    minimalSearch.pagination.records >= 0 &&
      minimalSearch.pagination.pages >= 0,
  );
}
