import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product discovery through natural language text search queries.
 *
 * This comprehensive test validates the marketplace's search engine
 * functionality by testing natural language text searches across product names,
 * descriptions, and tags. It covers real-world customer shopping scenarios
 * including electronics, fashion, and lifestyle products to ensure the search
 * engine returns relevant results that match customer intent.
 *
 * Test coverage includes:
 *
 * 1. Basic single-term searches (laptop, dress, headphones)
 * 2. Multi-word natural language queries (wireless bluetooth speakers)
 * 3. Search with category filtering integration
 * 4. Search with price range constraints
 * 5. Empty search terms and boundary conditions
 * 6. Search result pagination and sorting preferences
 * 7. Special characters and query length handling
 * 8. Search relevance validation against product data
 */
export async function test_api_product_catalog_text_search_discovery(
  connection: api.IConnection,
) {
  // Create base search request with common parameters
  const createSearchRequest = (
    search: string | undefined,
    overrides?: Partial<IShoppingMallProduct.IRequest>,
  ): IShoppingMallProduct.IRequest =>
    ({
      page: 1,
      limit: 20,
      search,
      sortBy: "relevance",
      orderBy: "desc",
      includeVariants: true,
      includeOutOfStock: false,
      ...overrides,
    }) satisfies IShoppingMallProduct.IRequest;

  // Test 1: Basic single-term searches for common product categories
  const basicSearchTerms = [
    "laptop",
    "dress",
    "headphones",
    "phone",
    "tablet",
    "shoes",
    "watch",
    "camera",
  ];

  for (const term of basicSearchTerms) {
    const searchResults = await api.functional.shoppingMall.products.index(
      connection,
      {
        body: createSearchRequest(term),
      },
    );

    typia.assert(searchResults);

    TestValidator.predicate(
      `search results exist for term "${term}"`,
      searchResults.data.length > 0,
    );

    TestValidator.predicate(
      `pagination info valid for "${term}" search`,
      searchResults.pagination.current >= 1 &&
        searchResults.pagination.limit > 0,
    );
  }

  // Test 2: Multi-word natural language search queries
  const multiWordSearches = [
    "wireless bluetooth speakers",
    "summer casual dress",
    "gaming laptop computer",
    "running shoes men",
    "smart watch fitness",
    "dslr camera professional",
    "office chair ergonomic",
    "coffee maker automatic",
  ];

  for (const query of multiWordSearches) {
    const searchResults = await api.functional.shoppingMall.products.index(
      connection,
      {
        body: createSearchRequest(query),
      },
    );

    typia.assert(searchResults);

    // Results should contain products that match the search intent
    TestValidator.predicate(
      `results found for multi-word query "${query}"`,
      searchResults.data.length > 0,
    );

    // Validate individual product summaries
    for (const product of searchResults.data) {
      TestValidator.predicate(
        `product "${product.name}" has valid ID`,
        typia.is<string & tags.Format<"uuid">>(product.id),
      );

      TestValidator.predicate(
        `product "${product.name}" has valid price`,
        product.price >= 0,
      );

      TestValidator.predicate(
        `product "${product.name}" has seller info`,
        product.seller && product.seller.business_name.length > 0,
      );

      TestValidator.predicate(
        `product "${product.name}" has category info`,
        product.category && product.category.name.length > 0,
      );
    }
  }

  // Test 3: Search with category filtering
  const categories = ["Electronics", "Fashion", "Home & Garden", "Sports"];
  const searchWithCategory = createSearchRequest("computer", {
    categoryCode: categories[0],
  });

  const categoryResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: searchWithCategory,
    },
  );

  typia.assert(categoryResults);

  TestValidator.predicate(
    "category-filtered search returns results",
    categoryResults.data.length > 0,
  );

  // Test 4: Search with price range constraints
  const priceRangeSearch = createSearchRequest("laptop", {
    minPrice: 500,
    maxPrice: 1500,
    sortBy: "price_low_to_high",
  });

  const priceResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: priceRangeSearch,
    },
  );

  typia.assert(priceResults);

  if (priceResults.data.length > 0) {
    TestValidator.predicate(
      "price range search respects minimum price",
      priceResults.data[0].price >= 500,
    );

    TestValidator.predicate(
      "price range search respects maximum price",
      priceResults.data.every((product) => product.price <= 1500),
    );
  }

  // Test 5: Empty search term (should return all or popular products)
  const emptySearchResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: createSearchRequest(undefined),
    },
  );

  typia.assert(emptySearchResults);

  TestValidator.predicate(
    "empty search returns valid results",
    emptySearchResults.data.length > 0,
  );

  // Test 6: Search with different sort options
  const sortOptions = [
    "name",
    "price_high_to_low",
    "newest",
    "popularity",
  ] as const;

  for (const sort of sortOptions) {
    const sortedResults = await api.functional.shoppingMall.products.index(
      connection,
      {
        body: createSearchRequest("phone", { sortBy: sort }),
      },
    );

    typia.assert(sortedResults);

    TestValidator.predicate(
      `sort by "${sort}" returns results`,
      sortedResults.data.length > 0,
    );
  }

  // Test 7: Search with pagination
  const paginatedSearch = createSearchRequest("dress", { page: 2, limit: 10 });

  const page2Results = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: paginatedSearch,
    },
  );

  typia.assert(page2Results);

  TestValidator.predicate(
    "page 2 search results valid",
    page2Results.pagination.current === 2,
  );

  TestValidator.predicate(
    "pagination limit respected",
    page2Results.data.length <= 10,
  );

  // Test 8: Search with special handling for search terms with special characters
  const specialCharSearches = [
    "& co",
    "l'oreal",
    "sony - cyber",
    'dell inspiron 15"',
    "the best $20 phone",
  ];

  for (const specialSearch of specialCharSearches) {
    const results = await api.functional.shoppingMall.products.index(
      connection,
      {
        body: createSearchRequest(specialSearch),
      },
    );

    typia.assert(results);

    TestValidator.predicate(
      `special character search "${specialSearch}" handled properly`,
      results.data.length >= 0, // May return 0 results but should not error
    );
  }

  // Test 9: Very long search query
  const longQuery = ArrayUtil.repeat(20, () =>
    RandomGenerator.paragraph({ sentences: 1 }),
  ).join(" ");

  const longQueryResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: createSearchRequest(longQuery),
    },
  );

  typia.assert(longQueryResults);

  TestValidator.predicate(
    "long search query handled properly",
    longQueryResults.data.length >= 0,
  );

  // Test 10: Search relevance validation - search should find products with matching terms
  const testSearchTerm = "wireless speaker";
  const relevanceResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: createSearchRequest(testSearchTerm, { limit: 5 }),
    },
  );

  typia.assert(relevanceResults);

  if (relevanceResults.data.length > 0) {
    // Check if any products mention wireless or speaker in their name/description
    const hasRelevantProduct = relevanceResults.data.some(
      (product) =>
        product.name.toLowerCase().includes("wireless") ||
        product.name.toLowerCase().includes("speaker") ||
        product.description.toLowerCase().includes("wireless") ||
        product.description.toLowerCase().includes("speaker"),
    );

    TestValidator.predicate(
      "search returns relevant products for wireless speaker",
      hasRelevantProduct,
    );
  }

  // Test 11: Search with availability filters
  const inStockSearch = createSearchRequest("laptop", {
    availability: "in_stock",
    includeOutOfStock: false,
  });

  const stockResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: inStockSearch,
    },
  );

  typia.assert(stockResults);

  TestValidator.predicate(
    "in-stock filter returns results",
    stockResults.data.length > 0,
  );

  // Test 12: Search with seller filtering
  // **FIXED**: Generate proper UUID string for seller filtering
  const validSellerId = typia.random<string & tags.Format<"uuid">>();
  const sellerSearch = createSearchRequest("watch", {
    sellerId: validSellerId,
  });

  const sellerResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: sellerSearch,
    },
  );

  typia.assert(sellerResults);

  if (sellerResults.data.length > 0) {
    TestValidator.predicate(
      "seller-filtered results come from same seller",
      sellerResults.data.every(
        (product) => product.seller.id === validSellerId,
      ),
    );
  }

  // Test 13: Empty results handling
  const impossibleSearch = createSearchRequest("zzqqxyz123");

  const emptyResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: impossibleSearch,
    },
  );

  typia.assert(emptyResults);

  TestValidator.equals(
    "impossible search returns zero results",
    emptyResults.data.length,
    0,
  );

  TestValidator.equals(
    "empty search has valid pagination",
    emptyResults.pagination.current,
    1,
  );

  // Test 14: Search with condition filters
  const conditionSearch = createSearchRequest("phone", {
    condition: "new",
    includeOutOfStock: true,
  });

  const conditionResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: conditionSearch,
    },
  );

  typia.assert(conditionResults);

  TestValidator.predicate(
    "condition-filtered search returns valid results",
    conditionResults.data.length >= 0,
  );
}
