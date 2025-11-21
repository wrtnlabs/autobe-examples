import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_full_text_search(
  connection: api.IConnection,
) {
  // Generate random search terms for full-text search validation
  const searchTerms = [
    RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 6 }),
    RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
  ];

  // Since there's no API to create reviews, we need to logically test the search endpoint
  // directly with known search terms that would theoretically match existing reviews

  // Test search functionality with multiple search terms
  for (const searchTerm of searchTerms) {
    // Use the index endpoint to perform full-text search on reviews
    // The endpoint accepts a string search term for full-text search
    const searchResult: IPageIShoppingMallReview.ISummary =
      await api.functional.shoppingMall.reviews.index(connection, {
        body: searchTerm,
      });
    typia.assert(searchResult);

    // Verify the search result structure is correct
    TestValidator.equals(
      "pagination should be present and valid",
      searchResult.pagination.current,
      1,
    );
    TestValidator.predicate(
      "limit should be positive",
      searchResult.pagination.limit > 0,
    );
    TestValidator.predicate(
      "total records should be non-negative",
      searchResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      "total pages should be non-negative",
      searchResult.pagination.pages >= 0,
    );

    // Validate that data is an array and not null/undefined
    TestValidator.predicate(
      "search result data should be an array",
      Array.isArray(searchResult.data),
    );

    // For each item in data, verify it's a string (as per ISummary definition)
    // Since ISummary is a string type, we need to validate the string content
    for (const item of searchResult.data) {
      TestValidator.predicate(
        "each review summary should be a string",
        typeof item === "string",
      );

      // Since ISummary is a string type, we can't validate title/body properties
      // This test ensures we're working with actual string values
      TestValidator.predicate(
        "review summary string should have reasonable length",
        item.length >= 5, // Simple validation: string should have minimum length
      );
    }

    // Verify the search system returns some results for valid terms
    TestValidator.predicate(
      `search term '${searchTerm}' should return at least one review result`,
      searchResult.data.length > 0,
    );
  }

  // Test empty string search (should typically return all reviews)
  const emptySearchResult: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: "",
    });
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty string search should return an array of reviews",
    Array.isArray(emptySearchResult.data) && emptySearchResult.data.length > 0,
  );

  // Test with a term that is extremely unlikely to exist in data
  const nonExistentTerm = "xqyjz123klm456abc";
  const nonExistentResult: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: nonExistentTerm,
    });
  typia.assert(nonExistentResult);

  // The search should return an empty array (or very few results) for non-existent terms
  // This helps confirm the search filter is working correctly
  TestValidator.predicate(
    `non-existent search term '${nonExistentTerm}' should return limited results`,
    // This is permissive because search may return irrelevant results
    nonExistentResult.data.length < 10,
  );

  // Validate search functionality with duplicate search terms for consistency
  const duplicateSearchTerm = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 8,
  });
  const firstSearch: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: duplicateSearchTerm,
    });
  typia.assert(firstSearch);

  const secondSearch: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: duplicateSearchTerm,
    });
  typia.assert(secondSearch);

  TestValidator.predicate(
    `search results for duplicate term should have consistent count`,
    firstSearch.data.length === secondSearch.data.length,
  );
}
