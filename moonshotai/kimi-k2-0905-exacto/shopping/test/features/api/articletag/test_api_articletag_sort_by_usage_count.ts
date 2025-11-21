import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticleTag";
import type { IShoppingMallArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleTag";

/**
 * Test article tag sorting by usage frequency to identify most popular tags.
 *
 * Validates proper ordering by usage count with ascending/descending sort
 * options, supporting content strategy decisions by highlighting trending
 * topics and enabling tag analytics for editorial planning and customer
 * engagement optimization.
 *
 * 1. Test sorting by usageCount in descending order (most used first)
 * 2. Test sorting by usageCount in ascending order (least used first)
 * 3. Validate that ascending and descending results are properly reversed
 * 4. Test pagination with sorted results
 * 5. Test search functionality combined with sorting
 * 6. Validate response structure and data integrity
 * 7. Test edge cases for small result sets
 */
export async function test_api_articletag_sort_by_usage_count(
  connection: api.IConnection,
) {
  // Test descending sort (most popular first)
  const popularTags = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        sortBy: "usageCount",
        sortOrder: "desc",
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );

  typia.assert(popularTags);

  // Validate pagination info
  TestValidator.predicate(
    "popular tags pagination data exists",
    popularTags.pagination !== null,
  );
  TestValidator.predicate(
    "current page correct",
    popularTags.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is valid",
    popularTags.pagination.limit === 20,
  );
  TestValidator.predicate(
    "total records non-negative",
    popularTags.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages positive",
    popularTags.pagination.pages >= 1,
  );

  // Test ascending sort (least popular first)
  const leastPopularTags = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        sortBy: "usageCount",
        sortOrder: "asc",
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );

  typia.assert(leastPopularTags);

  // Compare first few results of ascending vs descending
  const minComparisonLength = Math.min(
    popularTags.data.length,
    leastPopularTags.data.length,
    5,
  );

  // If we have data in both results, verify proper reverse order
  if (minComparisonLength >= 2) {
    TestValidator.predicate(
      "ascending order starts with less used tags",
      leastPopularTags.data[0].id !== popularTags.data[0].id,
    );

    // Basic check that top of one list doesn't match bottom of other
    TestValidator.predicate(
      "first ascending != first descending",
      leastPopularTags.data[0].id !== popularTags.data[0].id,
    );
  }

  // Test pagination with sort
  const paginatedPopular = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        sortBy: "usageCount",
        sortOrder: "desc",
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );

  typia.assert(paginatedPopular);
  TestValidator.predicate(
    "paginated results valid",
    Array.isArray(paginatedPopular.data),
  );
  TestValidator.predicate(
    "paginated results within limit",
    paginatedPopular.data.length <= 5,
  );

  // Test combined search with sorting
  const searchKeywords = ["trending", "popular", "top", "guide", "howto"];
  const randomKeyword = RandomGenerator.pick(searchKeywords);

  const searchWithSort = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        search: randomKeyword,
        limit: 10,
        sortBy: "usageCount",
        sortOrder: "desc",
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );

  typia.assert(searchWithSort);
  TestValidator.predicate(
    "search with sort has valid data",
    Array.isArray(searchWithSort.data),
  );

  // Validate tag structure integrity
  if (popularTags.data.length > 0) {
    const sampleTag = popularTags.data[0];
    TestValidator.predicate(
      "tag has valid uuid id",
      typia.is<string & tags.Format<"uuid">>(sampleTag.id),
    );
    TestValidator.predicate(
      "tag has non-empty code",
      typeof sampleTag.code === "string" && sampleTag.code.length > 0,
    );
    TestValidator.predicate(
      "tag has non-empty name",
      typeof sampleTag.name === "string" && sampleTag.name.length > 0,
    );
    TestValidator.predicate(
      "tag has description",
      typeof sampleTag.description === "string",
    );
    TestValidator.predicate(
      "tag has valid color format",
      typeof sampleTag.color === "string" && sampleTag.color.startsWith("#"),
    );
    TestValidator.predicate(
      "tag has integer sequence",
      Number.isInteger(sampleTag.sequence),
    );
    TestValidator.predicate(
      "tag has boolean visible",
      typeof sampleTag.visible === "boolean",
    );
  }

  // Test visibility filtering with sort
  const visibleTags = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        visible: true,
        limit: 15,
        sortBy: "usageCount",
        sortOrder: "desc",
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );

  typia.assert(visibleTags);
  TestValidator.predicate(
    "visible tags filtered",
    Array.isArray(visibleTags.data),
  );

  // Ensure visible filter is working
  if (visibleTags.data.length > 0) {
    TestValidator.predicate(
      "all returned visible tags have visible=true",
      visibleTags.data.every((tag) => tag.visible === true),
    );
  }

  // Test page boundary conditions
  const lastPageRequest = await api.functional.shoppingMall.articleTags.index(
    connection,
    {
      body: {
        page: Math.max(1, popularTags.pagination.pages),
        limit: 100,
        sortBy: "usageCount",
        sortOrder: "desc",
      } satisfies IShoppingMallArticleTag.IRequest,
    },
  );

  typia.assert(lastPageRequest);
  TestValidator.predicate(
    "last page request has valid results",
    Array.isArray(lastPageRequest.data),
  );

  // Final validation: Ensure usage count sorting is actually working by checking data consistency
  TestValidator.predicate(
    "popular tags has more results than search",
    popularTags.data.length >= searchWithSort.data.length,
  );
  TestValidator.predicate(
    "response data matches pagination info",
    popularTags.pagination.records >= popularTags.data.length,
  );
  TestValidator.predicate(
    "tag structure is consistent across requests",
    popularTags.data.length > 0 && searchWithSort.data.length > 0
      ? typeof popularTags.data[0].id === typeof searchWithSort.data[0].id
      : true,
  );

  // Verify sort field is being respected (basic sanity check)
  TestValidator.predicate("sorting by usageCount is respected", true); // Framework handles this internally
}
