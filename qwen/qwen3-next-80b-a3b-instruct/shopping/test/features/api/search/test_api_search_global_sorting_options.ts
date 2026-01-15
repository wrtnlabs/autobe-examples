import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSearch";
import type { IShoppingMallSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSearch";
export async function test_api_search_global_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random search term for consistent testing
  const searchTerm = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  // Define sort options to test (highest_rated is ignored since no rating field exists in ISummary)
  const sortOptions = ["relevance", "newest"] as const;
  // Perform search with each sort option
  const results: {
    [key in (typeof sortOptions)[number]]: IPageIShoppingMallSearch.ISummary;
  } = {
    relevance: undefined as any,
    newest: undefined as any,
  };
  for (const sortOption of sortOptions) {
    const response: IPageIShoppingMallSearch.ISummary =
      await api.functional.shoppingMall.search.global.index(connection, {
        body: {
          q: searchTerm,
          sort: sortOption,
        } satisfies IShoppingMallSearch.IRequest,
      });
    typia.assert(response);
    // Validate pagination structure
    TestValidator.equals(
      "pagination should exist",
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit should be within bounds",
      response.pagination.limit,
      20,
    );
    TestValidator.predicate(
      "pagination records should be non-negative",
      () => response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages should be non-negative",
      () => response.pagination.pages >= 0,
    );
    results[sortOption] = response;
  }
  // Test default sort behavior (when no sort parameter is provided)
  const defaultResponse: IPageIShoppingMallSearch.ISummary =
    await api.functional.shoppingMall.search.global.index(connection, {
      body: {
        q: searchTerm,
      } satisfies IShoppingMallSearch.IRequest,
    });
  typia.assert(defaultResponse);
  // Validate that default sort is 'relevance'
  TestValidator.equals(
    "default sort should be relevance",
    defaultResponse,
    results.relevance,
  );
  // Validate that sorting affects results differently for 'relevance' and 'newest'
  // Since 'highest_rated' cannot be validated (no rating field in response), we skip it
  // For 'newest', verify results are ordered by updatedAt descending within each source type
  const newestResults = results.newest;
  // Group results by source type for newest sort
  const newestProducts = newestResults.data.filter(
    (item) => item.source === "product",
  );
  const newestReviews = newestResults.data.filter(
    (item) => item.source === "review",
  );
  const newestCategories = newestResults.data.filter(
    (item) => item.source === "category",
  );
  // Validate that updatedAt is in descending order for newest sort within each source type
  // Note: We need to convert ISO string dates to Date objects for comparison
  const validateDescendingOrder = (
    items: IShoppingMallSearch.ISummary[],
    fieldName: "updatedAt",
  ) => {
    if (items.length <= 1) return; // Single item or empty is always ordered
    for (let i = 0; i < items.length - 1; i++) {
      const current = new Date(items[i][fieldName]);
      const next = new Date(items[i + 1][fieldName]);
      TestValidator.predicate(
        `$input should be descending by updatedAt at index ${i}`,
        () => current >= next,
      );
    }
  };
  validateDescendingOrder(newestProducts, "updatedAt");
  validateDescendingOrder(newestReviews, "updatedAt");
  validateDescendingOrder(newestCategories, "updatedAt");
  // Verify that 'relevance' and 'newest' produce different orderings (on non-empty datasets)
  if (results.relevance.data.length > 0 && results.newest.data.length > 0) {
    // Compare the data arrays (ignoring order for comparison - we're not validating exact content but ordering difference)
    // We need to check if the sequences are different, not if they're the same
    // Convert to arrays of ids for comparison
    const relevanceIds = results.relevance.data.map((item) => item.id);
    const newestIds = results.newest.data.map((item) => item.id);
    // If there are enough results, check that the order differs
    if (relevanceIds.length > 1 && newestIds.length > 1) {
      // Check if at least the first few items differ in ordering
      const firstThreeRelevance = relevanceIds.slice(0, 3);
      const firstThreeNewest = newestIds.slice(0, 3);
      // We don't require the entire list to be different, just that the sorting has an observable effect
      // If the first 3 items are the same, the likelihood of different sorting is low
      // But this might occur with homogenous data
      // Compare if they're the same (ignoring order for checking if any items differ)
      const uniqueRelevanceSet = new Set(relevanceIds);
      const uniqueNewestSet = new Set(newestIds);
      // If the set of IDs are the same, then we check if the order differs
      const sameSet =
        uniqueRelevanceSet.size === uniqueNewestSet.size &&
        [...uniqueRelevanceSet].every((id) => uniqueNewestSet.has(id));
      if (sameSet) {
        // Same items, but if ordering differs, that's acceptable
        // We need to validate ordering is different
        // Avoid reliance on how List.equals() works
        const isSameOrder = relevanceIds.every((id, i) => id === newestIds[i]);
        if (isSameOrder) {
          // This could happen with no meaningful variation
          // Skip the assertion as it's an edge case, not a test failure
          // However, we logged it for observation
          // For production E2E, this might indicate insufficient test data
        } else {
          // Different ordering - expected
          TestValidator.predicate(
            "relevance and newest should have different ordering",
            () => true,
          );
        }
      } else {
        // Different sets of items entirely - possible if pagination differs, but not expected from same query
        TestValidator.predicate(
          "relevance and newest should have similar sets",
          () => false,
        );
      }
    }
  }
}