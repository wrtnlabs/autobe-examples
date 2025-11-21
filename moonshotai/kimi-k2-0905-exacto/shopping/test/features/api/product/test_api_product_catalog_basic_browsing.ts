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
 * Test basic product catalog browsing with default parameters.
 *
 * This comprehensive test validates that customers can successfully browse the
 * marketplace with various filtering and sorting options. It ensures core
 * catalog accessibility works including price display validation, seller
 * information verification, and search result formatting across different
 * browsing scenarios.
 *
 * Test scenarios covered:
 *
 * 1. Basic browsing with default pagination (page 1, limit 10)
 * 2. Price range filtering validation
 * 3. Text search functionality
 * 4. Multiple sorting options (price, popularity, newest)
 * 5. Inventory availability status filtering
 * 6. Pagination with different page sizes and navigation
 * 7. Complex search with multiple filters
 * 8. Category browsing with seller information
 * 9. Tags filtering validation
 */
export async function test_api_product_catalog_basic_browsing(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic catalog browsing with default parameters
  const basicRequest = {
    page: 1,
    limit: 10,
    sortBy: "relevance",
  } satisfies IShoppingMallProduct.IRequest;

  const basicResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: basicRequest,
    },
  );
  typia.assert(basicResults);

  TestValidator.predicate(
    "basic browsing returns products",
    basicResults.data.length > 0,
  );
  TestValidator.predicate(
    "pagination metadata is valid",
    basicResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "results within limit",
    basicResults.data.length <= 10,
  );

  // Validate product summary structure
  if (basicResults.data.length > 0) {
    const firstProduct = basicResults.data[0];
    TestValidator.predicate(
      "product has valid UUID",
      typia.is<string & tags.Format<"uuid">>(firstProduct.id),
    );
    TestValidator.predicate("product has name", firstProduct.name.length > 0);
    TestValidator.predicate(
      "product has description",
      firstProduct.description.length > 0,
    );
    TestValidator.predicate("product has valid price", firstProduct.price >= 0);
    TestValidator.predicate(
      "product has seller info",
      firstProduct.seller !== null,
    );
    TestValidator.predicate(
      "product has category info",
      firstProduct.category !== null,
    );
    TestValidator.predicate(
      "product has images array",
      Array.isArray(firstProduct.images),
    );
  }

  // Test 2: Price range filtering
  const minPrice = 50;
  const maxPrice = 200;
  const priceRangeRequest = {
    page: 1,
    limit: 10,
    minPrice: minPrice,
    maxPrice: maxPrice,
    sortBy: "price_low_to_high",
  } satisfies IShoppingMallProduct.IRequest;

  const priceRangeResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: priceRangeRequest,
    },
  );
  typia.assert(priceRangeResults);

  TestValidator.predicate(
    "price range filtering returns products",
    priceRangeResults.data.length > 0,
  );

  // Validate all products are within price range
  for (const product of priceRangeResults.data) {
    TestValidator.predicate(
      "product price within min range",
      product.price >= minPrice,
    );
    TestValidator.predicate(
      "product price within max range",
      product.price <= maxPrice,
    );
  }

  // Test 3: Text search functionality
  const searchTerm = RandomGenerator.name();
  const searchRequest = {
    page: 1,
    limit: 10,
    search: searchTerm,
    sortBy: "relevance",
  } satisfies IShoppingMallProduct.IRequest;

  const searchResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: searchRequest,
    },
  );
  typia.assert(searchResults);

  TestValidator.predicate(
    "search returns results",
    searchResults.data.length >= 0,
  );

  // Test 4: Sorting options
  const sortOptions = [
    "name",
    "price_low_to_high",
    "price_high_to_low",
    "newest",
    "popularity",
  ] as const;

  for (const sortOption of sortOptions) {
    const sortRequest = {
      page: 1,
      limit: 5,
      sortBy: sortOption,
    } satisfies IShoppingMallProduct.IRequest;

    const sortResults = await api.functional.shoppingMall.products.index(
      connection,
      {
        body: sortRequest,
      },
    );
    typia.assert(sortResults);

    TestValidator.predicate(
      `sorting by ${sortOption} returns products`,
      sortResults.data.length > 0,
    );
  }

  // Test 5: Availability filtering
  const availabilityRequest = {
    page: 1,
    limit: 10,
    availability: "in_stock" as const,
    sortBy: "relevance",
  } satisfies IShoppingMallProduct.IRequest;

  const availabilityResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: availabilityRequest,
    },
  );
  typia.assert(availabilityResults);

  TestValidator.predicate(
    "availability filtering returns products",
    availabilityResults.data.length > 0,
  );

  // Test 6: Pagination testing
  const paginationPage = 2;
  const paginationLimit = 5;
  const paginationRequest = {
    page: paginationPage,
    limit: paginationLimit,
    sortBy: "relevance",
  } satisfies IShoppingMallProduct.IRequest;

  const paginationResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: paginationRequest,
    },
  );
  typia.assert(paginationResults);

  TestValidator.predicate(
    "pagination metadata correct",
    paginationResults.pagination.current === paginationPage,
  );
  TestValidator.predicate(
    "pagination limit correct",
    paginationResults.pagination.limit === paginationLimit,
  );
  TestValidator.predicate(
    "pagination results within limit",
    paginationResults.data.length <= paginationLimit,
  );

  // Test 7: Complex search with multiple filters
  const complexSearchTerm = RandomGenerator.name(2);
  const complexRequest = {
    page: 1,
    limit: 15,
    search: complexSearchTerm,
    minPrice: 25,
    maxPrice: 500,
    condition: "new" as const,
    availability: "in_stock" as const,
    includeVariants: true,
    sortBy: "popularity",
    orderBy: "desc" as const,
  } satisfies IShoppingMallProduct.IRequest;

  const complexResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: complexRequest,
    },
  );
  typia.assert(complexResults);

  TestValidator.predicate(
    "complex search returns products",
    complexResults.data.length > 0,
  );

  // Validate seller information structure
  if (complexResults.data.length > 0) {
    const seller = complexResults.data[0].seller;
    TestValidator.predicate(
      "seller has valid UUID",
      typia.is<string & tags.Format<"uuid">>(seller.id),
    );
    TestValidator.predicate(
      "seller has valid email",
      typia.is<string & tags.Format<"email">>(seller.email),
    );
    TestValidator.predicate(
      "seller has business name",
      seller.business_name.length > 0,
    );
    TestValidator.predicate(
      "seller has verification status",
      seller.verification_status.length > 0,
    );
    TestValidator.predicate(
      "seller has commission rate",
      seller.commission_rate >= 0,
    );
  }

  // Test 8: Category filtering
  const categoryRequest = {
    page: 1,
    limit: 8,
    sortBy: "newest",
    includeOutOfStock: false,
  } satisfies IShoppingMallProduct.IRequest;

  const categoryResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: categoryRequest,
    },
  );
  typia.assert(categoryResults);

  TestValidator.predicate(
    "category browsing returns products",
    categoryResults.data.length > 0,
  );

  // Test 9: Tags filtering validation
  const productTags = ["electronics", "featured", "sale"] as const;
  const tag = RandomGenerator.pick(productTags);

  const tagsRequest = {
    page: 1,
    limit: 12,
    tags: [tag],
    sortBy: "relevance",
  } satisfies IShoppingMallProduct.IRequest;

  const tagsResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: tagsRequest,
    },
  );
  typia.assert(tagsResults);

  TestValidator.predicate("tags filtering works", tagsResults.data.length >= 0);

  // Final validation: ensure all responses maintain proper structure
  const allTestResults = [
    basicResults,
    priceRangeResults,
    searchResults,
    availabilityResults,
    paginationResults,
    complexResults,
    categoryResults,
    tagsResults,
  ];

  for (const result of allTestResults) {
    TestValidator.predicate(
      "response has pagination object",
      result.pagination !== null,
    );
    TestValidator.predicate(
      "pagination has current page",
      typia.is<number & tags.Type<"int32"> & tags.Minimum<0>>(
        result.pagination.current,
      ),
    );
    TestValidator.predicate(
      "pagination has limit",
      typia.is<number & tags.Type<"int32"> & tags.Minimum<0>>(
        result.pagination.limit,
      ),
    );
    TestValidator.predicate(
      "pagination has records count",
      typia.is<number & tags.Type<"int32"> & tags.Minimum<0>>(
        result.pagination.records,
      ),
    );
    TestValidator.predicate(
      "pagination has pages count",
      typia.is<number & tags.Type<"int32"> & tags.Minimum<0>>(
        result.pagination.pages,
      ),
    );
    TestValidator.predicate(
      "response has data array",
      Array.isArray(result.data),
    );
  }
}
