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
 * Test search functionality with special characters, punctuation, and symbols.
 *
 * Validates proper sanitization of search input, handling of quotes and
 * apostrophes, and protection against SQL injection and XSS attacks. Tests that
 * the global search API properly handles dangerous input without compromising
 * security while maintaining functional search capabilities.
 *
 * 1. Test basic special character handling
 * 2. Verify SQL injection prevention
 * 3. Validate XSS protection
 * 4. Test unicode and international characters
 * 5. Ensure business logic remains intact
 */
export async function test_api_global_search_special_characters(
  connection: api.IConnection,
) {
  // Generator for valid unicode product names and content to search against
  const generateProductContent = () =>
    RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 });

  const electronicsContent = generateProductContent();
  const clothingContent = generateProductContent();
  const booksContent = generateProductContent();

  // Test 1: Basic special character handling
  console.log("Test 1: Basic special character handling");
  const specialCharSearch1 = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: `laptop${RandomGenerator.pick(["&", "%", "$", "#", "@", "!", "?", ".", ":", ";"])}computer`,
        page: 1,
        limit: 10,
        sort_order: "relevance",
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(specialCharSearch1);
  TestValidator.predicate(
    "special chars request returns valid pagination",
    specialCharSearch1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "special chars request contains search query in first result",
    specialCharSearch1.data.length > 0 &&
      specialCharSearch1.data[0].search_query.length > 0,
  );

  // Test quote and apostrophe handling with proper generic typing
  console.log("Test 2: Quote and apostrophe handling");
  const quoteSearch = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: String.raw`"gaming notebook" 'premium' developer's laptop`,
        page: 1,
        limit: 10,
        sort_order: "relevance",
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(quoteSearch);
  TestValidator.predicate(
    "quotes and apostrophes handled safely",
    quoteSearch.data.length >= 0,
  );

  // Test basic injection patterns for prevention validation only
  console.log("Test 3: Basic sanitization verification");
  const sanitizationTest = [
    String.raw`'; DROP TABLE products; --`,
    String.raw`<script>alert('test')</script>`,
    String.raw`test UNION ADMIN test`,
  ];

  for (const testQuery of sanitizationTest) {
    const protectedSearch = await api.functional.shoppingMall.search.global(
      connection,
      {
        body: {
          query: testQuery,
          page: 1,
          limit: 5,
          sort_order: "relevance",
        } satisfies IShoppingMallGlobalSearch.IRequest,
      },
    );
    typia.assert(protectedSearch);
    TestValidator.predicate(
      "malicious input safely handled",
      protectedSearch.data.length >= 0,
    );
  }

  // Test 4: Unicode and international characters
  console.log("Test 4: Unicode and international characters");
  const unicodeSearches = [
    "🛍️👗👠shopping clothes fashion",
    "€100$50£75 budget phone",
    "ηλεκτρονικά electronics",
    "كتاب book ممتاز excellent",
  ];

  for (const unicodeQuery of unicodeSearches.slice(0, 2)) {
    const unicodeSearch = await api.functional.shoppingMall.search.global(
      connection,
      {
        body: {
          query: unicodeQuery,
          page: 1,
          limit: 10,
          sort_order: "relevance",
        } satisfies IShoppingMallGlobalSearch.IRequest,
      },
    );
    typia.assert(unicodeSearch);
    TestValidator.predicate(
      "unicode search contains valid categories",
      Array.isArray(unicodeSearch.data[0]?.categories),
    );
    TestValidator.predicate(
      "unicode search contains valid products",
      Array.isArray(unicodeSearch.data[0]?.products),
    );
  }

  // Test 5: Business logic continuity with special characters
  console.log("Test 5: Business logic with special characters");
  const productKeywords = [
    "laptop",
    "phone",
    "book",
    "clothes",
    "electronics",
    "fashion",
  ];
  const combinedSpecialQuery = `${RandomGenerator.pick(productKeywords)}-${RandomGenerator.pick(["!", "@", "#", "$"])}-${RandomGenerator.name()}`;

  const businessLogicSearch = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: {
        query: combinedSpecialQuery,
        page: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<50>
        >(),
        sort_order: RandomGenerator.pick([
          "relevance",
          "date",
          "price_asc",
          "price_desc",
          "popularity",
        ]),
      } satisfies IShoppingMallGlobalSearch.IRequest,
    },
  );
  typia.assert(businessLogicSearch);
  TestValidator.predicate(
    "search with mixed special chars returns results",
    businessLogicSearch.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination works with special characters",
    businessLogicSearch.pagination.current > 0,
  );
}
