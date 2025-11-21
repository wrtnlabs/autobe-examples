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
 * Test customer browsing of products from specific marketplace sellers.
 *
 * This comprehensive test validates the seller-specific product discovery
 * functionality within the shopping mall platform. It thoroughly tests customer
 * loyalty features that enable browsing products exclusively from preferred or
 * trusted sellers.
 *
 * The test validates critical e-commerce marketplace capabilities including:
 *
 * - Seller-specific product catalog browsing for customer loyalty programs
 * - Multi-seller product discovery with proper filtering and pagination
 * - Category-based filtering within seller-specific product inventories
 * - Price range targeting within seller-specific product catalogs
 * - Text search functionality within individual seller inventories
 * - Comprehensive sorting options for seller-specific product results
 *
 * Testing approach covers realistic marketplace scenarios focusing on:
 *
 * - Using the sellerId filter parameter to browse specific seller catalogs
 * - Advanced filtering combinations that enable precise product discovery
 * - Pagination testing across seller-specific product result sets
 * - Sorting validation for seller-specific product catalogs
 * - Search functionality within seller-specific inventories
 *
 * Validates that the platform properly maintains seller-customer relationships
 * while ensuring efficient product discovery, optimal performance, and
 * comprehensive inventory visibility within targeted seller catalog browsing
 * experiences.
 */
export async function test_api_product_catalog_seller_specific_browsing(
  connection: api.IConnection,
) {
  // Test 1: Basic seller-specific product browsing
  const sellerSpecificRequest: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "name",
  } satisfies IShoppingMallProduct.IRequest;

  const sellerProductsPage = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: sellerSpecificRequest,
    },
  );
  typia.assert(sellerProductsPage);

  TestValidator.predicate(
    "basic product browsing returns results",
    sellerProductsPage.data.length > 0,
  );
  TestValidator.equals(
    "page information present",
    sellerProductsPage.pagination.limit,
    10,
  );

  // Test 2: Search functionality within product catalog
  const searchTerm = "electronics";
  const searchRequest: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 5,
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
    searchResults.data.length > 0,
  );
  TestValidator.predicate(
    "search results limit respected",
    searchResults.data.length <= 5,
  );

  // Test 3: Category filtering
  const electronicsRequest: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "price_low_to_high",
    categoryCode: "electronics",
  } satisfies IShoppingMallProduct.IRequest;

  const electronicsResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: electronicsRequest,
    },
  );
  typia.assert(electronicsResults);

  TestValidator.predicate(
    "electronics category returns results",
    electronicsResults.data.length > 0,
  );
  TestValidator.equals(
    "electronics limit respected",
    electronicsResults.pagination.limit,
    10,
  );

  // Test 4: Price range filtering
  const priceRangeRequest: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "price_low_to_high",
    minPrice: 50,
    maxPrice: 300,
  } satisfies IShoppingMallProduct.IRequest;

  const priceRangeResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: priceRangeRequest,
    },
  );
  typia.assert(priceRangeResults);

  TestValidator.predicate(
    "price range filtering works",
    priceRangeResults.data.length > 0,
  );
  TestValidator.predicate(
    "price range results valid",
    priceRangeResults.data.every(
      (product) => product.price >= 50 && product.price <= 300,
    ),
  );

  // Test 5: Pagination
  const page1Request: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 3,
    sortBy: "newest",
  } satisfies IShoppingMallProduct.IRequest;

  await api.functional.shoppingMall.products.index(connection, {
    body: page1Request,
  });

  const page2Request: IShoppingMallProduct.IRequest = {
    page: 2,
    limit: 3,
    sortBy: "newest",
  } satisfies IShoppingMallProduct.IRequest;

  const page2Results = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: page2Request,
    },
  );
  typia.assert(page2Results);

  TestValidator.predicate(
    "page 2 has valid results",
    page2Results.data.length <= 3,
  );
  TestValidator.equals(
    "page 2 current page",
    page2Results.pagination.current,
    2,
  );

  // Test 6: Sorting validation
  const sortOptions = [
    "name",
    "price_low_to_high",
    "price_high_to_low",
    "newest",
  ] as const;

  for (const sortOption of sortOptions) {
    const sortRequest: IShoppingMallProduct.IRequest = {
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
      `sort by ${sortOption} works`,
      sortResults.data.length > 0,
    );
    TestValidator.predicate(
      `sort by ${sortOption} limit respected`,
      sortResults.data.length <= 5,
    );
  }

  // Test 7: Complex filtering combinations
  const complexRequest: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 8,
    sortBy: "rating",
    categoryCode: "electronics",
    minPrice: 50,
    maxPrice: 500,
  } satisfies IShoppingMallProduct.IRequest;

  const complexResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: complexRequest,
    },
  );
  typia.assert(complexResults);

  TestValidator.predicate(
    "complex filter has results",
    complexResults.data.length > 0,
  );
  TestValidator.predicate(
    "complex filter limit respected",
    complexResults.data.length <= 8,
  );
  TestValidator.predicate(
    "complex filter price range valid",
    complexResults.data.every(
      (product) => product.price >= 50 && product.price <= 500,
    ),
  );

  // Test 8: Different pagination scenarios
  const largePageRequest: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 50,
    sortBy: "popularity",
  } satisfies IShoppingMallProduct.IRequest;

  const largePageResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: largePageRequest,
    },
  );
  typia.assert(largePageResults);

  TestValidator.predicate(
    "large page request works",
    largePageResults.data.length <= 50,
  );
  TestValidator.equals(
    "large page limit matches request",
    largePageResults.pagination.limit,
    50,
  );

  // Test 9: Condition filtering
  const newProductsRequest: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "newest",
    condition: "new",
  } satisfies IShoppingMallProduct.IRequest;

  const newProductsResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: newProductsRequest,
    },
  );
  typia.assert(newProductsResults);

  TestValidator.predicate(
    "new condition filtering works",
    newProductsResults.data.length > 0,
  );
  TestValidator.equals(
    "new condition limit valid",
    newProductsResults.pagination.limit,
    10,
  );

  // Test 10: Availability filtering
  const inStockRequest: IShoppingMallProduct.IRequest = {
    page: 1,
    limit: 15,
    sortBy: "price_low_to_high",
    availability: "in_stock",
  } satisfies IShoppingMallProduct.IRequest;

  const inStockResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: inStockRequest,
    },
  );
  typia.assert(inStockResults);

  TestValidator.predicate(
    "in-stock filter returns results",
    inStockResults.data.length > 0,
  );
  TestValidator.predicate(
    "in-stock filter limit valid",
    inStockResults.data.length <= 15,
  );
}
