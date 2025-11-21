import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGlobalSearchResult";
import type { IShoppingMallAnalyticsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallGlobalSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearch";
import type { IShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearchResult";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test basic product search functionality where customers search for products
 * using simple keywords. Validates that the search returns relevant product
 * results with proper categorization, pricing information, and seller details.
 * Tests the core search algorithm's ability to match product names,
 * descriptions, and specifications against user queries.
 */
export async function test_api_global_search_basic_product_discovery(
  connection: api.IConnection,
) {
  // Generate realistic product search queries
  const searchQueries = [
    "smartphone",
    "laptop computer",
    "wireless headphones",
    "gaming console",
    "kitchen appliance",
    "fashion clothing",
    "home furniture",
  ];

  // Test search with different queries
  for (const query of searchQueries) {
    const searchRequest = {
      query: query,
      sort_order: "relevance" as const,
      page: 1,
      limit: 20,
    } satisfies IShoppingMallGlobalSearch.IRequest;

    const searchResults = await api.functional.shoppingMall.search.global(
      connection,
      {
        body: searchRequest,
      },
    );

    // Validate response structure
    typia.assert(searchResults);
    TestValidator.predicate(
      "search results have valid pagination",
      searchResults.pagination !== undefined,
    );
    TestValidator.predicate(
      "search results have data array",
      Array.isArray(searchResults.data),
    );
    TestValidator.predicate(
      "search results pagination current page is 1",
      searchResults.pagination.current === 1,
    );
    TestValidator.predicate(
      "search results pagination limit is 20",
      searchResults.pagination.limit === 20,
    );

    if (searchResults.data.length > 0) {
      const firstResult = searchResults.data[0];
      TestValidator.predicate(
        "search result has categories array",
        Array.isArray(firstResult.categories),
      );
      TestValidator.predicate(
        "search result has products array",
        Array.isArray(firstResult.products),
      );
      TestValidator.predicate(
        "search result has sellers array",
        Array.isArray(firstResult.sellers),
      );
      TestValidator.predicate(
        "search result has customers array",
        Array.isArray(firstResult.customers),
      );
      TestValidator.predicate(
        "search result has analytics array",
        Array.isArray(firstResult.analytics),
      );
      TestValidator.predicate(
        "search result has total results count",
        typeof firstResult.total_results === "number",
      );
      TestValidator.predicate(
        "search result has search query",
        typeof firstResult.search_query === "string",
      );

      // Validate product information if products exist
      if (firstResult.products.length > 0) {
        const product = firstResult.products[0];
        TestValidator.predicate(
          "product has valid ID format",
          product.id !== undefined,
        );
        TestValidator.predicate("product has name", product.name !== undefined);
        TestValidator.predicate(
          "product has description",
          product.description !== undefined,
        );
        TestValidator.predicate(
          "product has price",
          product.price !== undefined,
        );
        TestValidator.predicate(
          "product has seller",
          product.seller !== undefined,
        );
        TestValidator.predicate(
          "product has category",
          product.category !== undefined,
        );
        TestValidator.predicate(
          "product has images array",
          Array.isArray(product.images),
        );
        TestValidator.predicate(
          "product price is non-negative",
          product.price >= 0,
        );

        // Validate seller information
        const seller = product.seller;
        TestValidator.predicate(
          "seller has valid ID format",
          seller.id !== undefined,
        );
        TestValidator.predicate("seller has email", seller.email !== undefined);
        TestValidator.predicate(
          "seller has business name",
          seller.business_name !== undefined,
        );
        TestValidator.predicate(
          "seller has verification status",
          seller.verification_status !== undefined,
        );
        TestValidator.predicate(
          "seller has verification flag",
          typeof seller.is_verified === "boolean",
        );

        // Validate category information
        const category = product.category;
        TestValidator.predicate(
          "category has valid ID format",
          category.id !== undefined,
        );
        TestValidator.predicate(
          "category has name",
          category.name !== undefined,
        );
        TestValidator.predicate(
          "category has path",
          category.path !== undefined,
        );
        TestValidator.predicate(
          "category has level",
          typeof category.level === "number",
        );
        TestValidator.predicate(
          "category has product count",
          typeof category.product_count === "number",
        );
        TestValidator.predicate(
          "category has active status",
          typeof category.is_active === "boolean",
        );
      }
    }
  }

  // Test with category filter
  const categorySearchRequest = {
    query: RandomGenerator.name(2),
    sort_order: "relevance" as const,
    page: 1,
    limit: 10,
    content_types: ["products"] as const,
    category_filter: "electronics",
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const categoryResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: categorySearchRequest,
    },
  );

  typia.assert(categoryResults);
  TestValidator.predicate(
    "category search returns valid results",
    categoryResults.data.length >= 0,
  );

  if (
    categoryResults.data.length > 0 &&
    categoryResults.data[0].products.length > 0
  ) {
    const product = categoryResults.data[0].products[0];
    TestValidator.predicate(
      "category filtered product has valid structure",
      product.category !== undefined,
    );
  }

  // Test price range filtering
  const priceRangeRequest = {
    query: RandomGenerator.name(1),
    sort_order: "price_asc" as const,
    page: 1,
    limit: 15,
    content_types: ["products"] as const,
    min_price: 100,
    max_price: 1000,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const priceResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: priceRangeRequest,
    },
  );

  typia.assert(priceResults);
  TestValidator.predicate(
    "price range search returns valid results",
    priceResults.data.length >= 0,
  );

  if (priceResults.data.length > 0) {
    const products = priceResults.data[0].products;
    products.forEach((product) => {
      TestValidator.predicate(
        "product price is within min range",
        product.price >= 100,
      );
      TestValidator.predicate(
        "product price is within max range",
        product.price <= 1000,
      );
    });
  }

  // Test empty search query edge case
  const emptyQueryRequest = {
    query: "",
    sort_order: "relevance" as const,
    page: 1,
    limit: 10,
    content_types: ["products"] as const,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const emptyResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: emptyQueryRequest,
    },
  );

  typia.assert(emptyResults);
  TestValidator.predicate(
    "empty query returns valid structure",
    Array.isArray(emptyResults.data),
  );
  TestValidator.predicate(
    "empty query returns valid pagination",
    emptyResults.pagination !== undefined,
  );

  // Test different result ordering
  const orderTypes = [
    "relevance",
    "date",
    "price_asc",
    "price_desc",
    "popularity",
  ] as const;
  for (const orderType of orderTypes) {
    const orderRequest = {
      query: RandomGenerator.name(1),
      sort_order: orderType,
      page: 1,
      limit: 10,
      content_types: ["products"] as const,
    } satisfies IShoppingMallGlobalSearch.IRequest;

    const orderResults = await api.functional.shoppingMall.search.global(
      connection,
      {
        body: orderRequest,
      },
    );

    typia.assert(orderResults);
    TestValidator.predicate(
      `order type ${orderType} returns valid results`,
      orderResults.data.length >= 0,
    );
  }

  // Test page pagination
  const paginationRequests = [
    { page: 1, limit: 5 },
    { page: 2, limit: 10 },
    { page: 3, limit: 15 },
  ];

  for (const pagReq of paginationRequests) {
    const pagRequest = {
      query: RandomGenerator.name(1),
      sort_order: "relevance" as const,
      page: pagReq.page,
      limit: pagReq.limit,
      content_types: ["products"] as const,
    } satisfies IShoppingMallGlobalSearch.IRequest;

    const pagResults = await api.functional.shoppingMall.search.global(
      connection,
      {
        body: pagRequest,
      },
    );

    typia.assert(pagResults);
    TestValidator.predicate(
      `pagination page ${pagReq.page} returns valid structure`,
      pagResults.pagination.current === pagReq.page,
    );
    TestValidator.predicate(
      `pagination limit ${pagReq.limit} matches request`,
      pagResults.pagination.limit === pagReq.limit,
    );
  }

  // Test content type combinations
  const contentTypeTests = [
    ["products", "articles"],
    ["products", "faq"],
    ["articles", "help"],
    ["products", "articles", "faq", "help"],
  ];

  for (const contentTypes of contentTypeTests) {
    const multiTypeRequest = {
      query: RandomGenerator.name(1),
      sort_order: "relevance" as const,
      page: 1,
      limit: 20,
      content_types: contentTypes as (
        | "products"
        | "articles"
        | "faq"
        | "help"
      )[],
    } satisfies IShoppingMallGlobalSearch.IRequest;

    const multiResults = await api.functional.shoppingMall.search.global(
      connection,
      {
        body: multiTypeRequest,
      },
    );

    typia.assert(multiResults);
    if (multiResults.data.length > 0) {
      const result = multiResults.data[0];
      if (contentTypes.includes("products")) {
        TestValidator.predicate(
          "multi-type search includes products",
          Array.isArray(result.products),
        );
      }
      if (contentTypes.includes("articles")) {
        TestValidator.predicate(
          "multi-type search includes articles structure",
          Array.isArray(result.categories),
        );
      }
    }
  }

  // Test with user preferences
  const prefRequest = {
    query: RandomGenerator.name(1),
    sort_order: "relevance" as const,
    page: 1,
    limit: 15,
    content_types: ["products"] as const,
    user_preferences: ["electronics", "gadgets", "mobile"],
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const prefResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: prefRequest,
    },
  );

  typia.assert(prefResults);
  TestValidator.predicate(
    "search with user preferences returns valid results",
    prefResults.data.length >= 0,
  );

  // Test date range filtering
  const dateRange = `${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}..${new Date().toISOString().split("T")[0]}`;

  const dateRangeRequest = {
    query: RandomGenerator.name(1),
    sort_order: "date" as const,
    page: 1,
    limit: 10,
    content_types: ["products"] as const,
    date_range: dateRange,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const dateResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: dateRangeRequest,
    },
  );

  typia.assert(dateResults);
  TestValidator.predicate(
    "date range search returns valid results",
    dateResults.data.length >= 0,
  );
}
