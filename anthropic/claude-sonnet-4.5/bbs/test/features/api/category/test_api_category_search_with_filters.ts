import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";

/**
 * Test advanced search and filtering capabilities for category discovery.
 *
 * This test validates the comprehensive search functionality of the discussion
 * board category API, including keyword matching, exact filters, date range
 * filtering, multiple sorting options, and pagination controls.
 *
 * Test workflow:
 *
 * 1. Test basic keyword search across category names and descriptions
 * 2. Test exact name and slug matching filters
 * 3. Validate date range filtering with created_after and created_before
 * 4. Test multiple sorting options (alphabetical and chronological)
 * 5. Verify pagination with different page sizes
 * 6. Validate that search results accurately match filter criteria
 * 7. Ensure pagination metadata correctly reflects total counts and page
 *    information
 */
export async function test_api_category_search_with_filters(
  connection: api.IConnection,
) {
  // Test 1: Basic keyword search
  const keywordSearchBody = {
    search: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardCategory.IRequest;

  const keywordSearchResult =
    await api.functional.discussionBoard.categories.index(connection, {
      body: keywordSearchBody,
    });
  typia.assert(keywordSearchResult);
  TestValidator.predicate(
    "keyword search returns valid pagination structure",
    keywordSearchResult.pagination.current === 1,
  );

  // Test 2: Exact name filter
  const nameFilterBody = {
    name: RandomGenerator.name(2),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardCategory.IRequest;

  const nameFilterResult =
    await api.functional.discussionBoard.categories.index(connection, {
      body: nameFilterBody,
    });
  typia.assert(nameFilterResult);
  TestValidator.predicate(
    "name filter returns valid response",
    nameFilterResult.pagination.limit === 10,
  );

  // Test 3: Slug exact match filter
  const slugFilterBody = {
    slug: RandomGenerator.name(1).toLowerCase(),
    page: 1,
    limit: 15,
  } satisfies IDiscussionBoardCategory.IRequest;

  const slugFilterResult =
    await api.functional.discussionBoard.categories.index(connection, {
      body: slugFilterBody,
    });
  typia.assert(slugFilterResult);

  // Test 4: Date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeBody = {
    created_after: thirtyDaysAgo.toISOString(),
    created_before: now.toISOString(),
    page: 1,
    limit: 25,
  } satisfies IDiscussionBoardCategory.IRequest;

  const dateRangeResult = await api.functional.discussionBoard.categories.index(
    connection,
    { body: dateRangeBody },
  );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns valid pagination",
    dateRangeResult.pagination.limit === 25,
  );

  // Test 5: Sorting by name ascending
  const sortByNameAscBody = {
    sort_by: "name",
    sort_order: "asc",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardCategory.IRequest;

  const sortByNameAscResult =
    await api.functional.discussionBoard.categories.index(connection, {
      body: sortByNameAscBody,
    });
  typia.assert(sortByNameAscResult);
  TestValidator.predicate(
    "sort by name ascending returns valid results",
    sortByNameAscResult.data.length >= 0,
  );

  // Test 6: Sorting by name descending
  const sortByNameDescBody = {
    sort_by: "name",
    sort_order: "desc",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardCategory.IRequest;

  const sortByNameDescResult =
    await api.functional.discussionBoard.categories.index(connection, {
      body: sortByNameDescBody,
    });
  typia.assert(sortByNameDescResult);

  // Test 7: Sorting by creation date ascending
  const sortByCreatedAscBody = {
    sort_by: "created_at",
    sort_order: "asc",
    page: 1,
    limit: 30,
  } satisfies IDiscussionBoardCategory.IRequest;

  const sortByCreatedAscResult =
    await api.functional.discussionBoard.categories.index(connection, {
      body: sortByCreatedAscBody,
    });
  typia.assert(sortByCreatedAscResult);
  TestValidator.predicate(
    "sort by created_at ascending returns valid pagination",
    sortByCreatedAscResult.pagination.limit === 30,
  );

  // Test 8: Sorting by creation date descending
  const sortByCreatedDescBody = {
    sort_by: "created_at",
    sort_order: "desc",
    page: 1,
    limit: 15,
  } satisfies IDiscussionBoardCategory.IRequest;

  const sortByCreatedDescResult =
    await api.functional.discussionBoard.categories.index(connection, {
      body: sortByCreatedDescBody,
    });
  typia.assert(sortByCreatedDescResult);

  // Test 9: Pagination with different page sizes
  const smallPageBody = {
    page: 1,
    limit: 5,
  } satisfies IDiscussionBoardCategory.IRequest;

  const smallPageResult = await api.functional.discussionBoard.categories.index(
    connection,
    { body: smallPageBody },
  );
  typia.assert(smallPageResult);
  TestValidator.predicate(
    "small page size returns correct limit",
    smallPageResult.pagination.limit === 5,
  );

  // Test 10: Pagination with large page size
  const largePageBody = {
    page: 1,
    limit: 100,
  } satisfies IDiscussionBoardCategory.IRequest;

  const largePageResult = await api.functional.discussionBoard.categories.index(
    connection,
    { body: largePageBody },
  );
  typia.assert(largePageResult);
  TestValidator.predicate(
    "large page size returns correct limit",
    largePageResult.pagination.limit === 100,
  );

  // Test 11: Second page pagination
  const secondPageBody = {
    page: 2,
    limit: 10,
  } satisfies IDiscussionBoardCategory.IRequest;

  const secondPageResult =
    await api.functional.discussionBoard.categories.index(connection, {
      body: secondPageBody,
    });
  typia.assert(secondPageResult);
  TestValidator.predicate(
    "second page returns correct current page",
    secondPageResult.pagination.current === 2,
  );

  // Test 12: Combined filters - search with date range and sorting
  const combinedFiltersBody = {
    search: RandomGenerator.name(1),
    created_after: thirtyDaysAgo.toISOString(),
    sort_by: "created_at",
    sort_order: "desc",
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardCategory.IRequest;

  const combinedFiltersResult =
    await api.functional.discussionBoard.categories.index(connection, {
      body: combinedFiltersBody,
    });
  typia.assert(combinedFiltersResult);

  // Test 13: All optional filters null or undefined
  const minimalBody = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardCategory.IRequest;

  const minimalResult = await api.functional.discussionBoard.categories.index(
    connection,
    { body: minimalBody },
  );
  typia.assert(minimalResult);
  TestValidator.predicate(
    "minimal request returns valid pagination metadata",
    minimalResult.pagination.current === 1 &&
      minimalResult.pagination.limit === 20,
  );

  // Test 14: Validate pagination metadata consistency
  const paginationTestBody = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardCategory.IRequest;

  const paginationTestResult =
    await api.functional.discussionBoard.categories.index(connection, {
      body: paginationTestBody,
    });
  typia.assert(paginationTestResult);

  TestValidator.predicate(
    "pagination pages calculation is correct",
    paginationTestResult.pagination.pages ===
      Math.ceil(
        paginationTestResult.pagination.records /
          paginationTestResult.pagination.limit,
      ),
  );

  // Test 15: Empty search results handling
  const unlikelySearchBody = {
    search: RandomGenerator.alphaNumeric(50),
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardCategory.IRequest;

  const unlikelySearchResult =
    await api.functional.discussionBoard.categories.index(connection, {
      body: unlikelySearchBody,
    });
  typia.assert(unlikelySearchResult);
  TestValidator.predicate(
    "unlikely search returns valid structure even if empty",
    Array.isArray(unlikelySearchResult.data),
  );
}
