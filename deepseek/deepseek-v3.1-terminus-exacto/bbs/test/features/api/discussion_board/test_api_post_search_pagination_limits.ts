import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";

/**
 * Test pagination functionality with various page sizes and limits. Validate
 * that pagination metadata (current page, total records, total pages) is
 * accurate and that page navigation works correctly across large result sets.
 */
export async function test_api_post_search_pagination_limits(
  connection: api.IConnection,
) {
  // Test various page sizes and limits with valid page indices
  const testCases = [
    { page: 0, limit: 10 }, // First page (0-based indexing)
    { page: 1, limit: 25 }, // Second page
    { page: 2, limit: 50 }, // Third page
    { page: 0, limit: 100 }, // First page with maximum limit
    { page: 4, limit: 20 }, // Fifth page
  ];

  for (const testCase of testCases) {
    const searchRequest = {
      page: testCase.page + 1, // Convert to 1-based for API request
      limit: testCase.limit,
    } satisfies IDiscussionBoardPost.IRequest;

    const result: IPageIDiscussionBoardPost.ISummary =
      await api.functional.discussion_board.search.posts.search(connection, {
        body: searchRequest,
      });

    typia.assert(result);

    // Validate pagination metadata
    TestValidator.equals(
      `pagination current page should match request for page ${testCase.page}, limit ${testCase.limit}`,
      result.pagination.current,
      testCase.page, // API returns 0-based page index
    );

    TestValidator.equals(
      `pagination limit should match request for page ${testCase.page}, limit ${testCase.limit}`,
      result.pagination.limit,
      testCase.limit,
    );

    TestValidator.predicate(
      `total records should be non-negative for page ${testCase.page}, limit ${testCase.limit}`,
      result.pagination.records >= 0,
    );

    TestValidator.predicate(
      `total pages should be non-negative for page ${testCase.page}, limit ${testCase.limit}`,
      result.pagination.pages >= 0,
    );

    // Validate that current page is within valid range
    if (result.pagination.pages > 0) {
      TestValidator.predicate(
        `current page should be less than total pages for page ${testCase.page}, limit ${testCase.limit}`,
        result.pagination.current < result.pagination.pages,
      );
    } else {
      // If no pages, current should be 0
      TestValidator.equals(
        `current page should be 0 when no pages exist for page ${testCase.page}, limit ${testCase.limit}`,
        result.pagination.current,
        0,
      );
    }

    // Validate data array length does not exceed limit
    TestValidator.predicate(
      `data array length should not exceed limit for page ${testCase.page}, limit ${testCase.limit}`,
      result.data.length <= testCase.limit,
    );

    // Validate pagination calculation: pages = ceil(records / limit)
    const expectedPages =
      result.pagination.records === 0
        ? 0
        : Math.ceil(result.pagination.records / result.pagination.limit);
    TestValidator.equals(
      `total pages calculation should be correct for page ${testCase.page}, limit ${testCase.limit}`,
      result.pagination.pages,
      expectedPages,
    );

    // Validate data count matches expectation for the current page
    if (result.pagination.current < result.pagination.pages - 1) {
      // Not the last page - should have full limit
      TestValidator.equals(
        `data count should match limit for non-last page ${testCase.page}, limit ${testCase.limit}`,
        result.data.length,
        testCase.limit,
      );
    } else if (result.pagination.pages > 0) {
      // Last page - should have remaining records
      const expectedLastPageCount =
        result.pagination.records % result.pagination.limit ||
        result.pagination.limit;
      TestValidator.equals(
        `data count should match remaining records for last page ${testCase.page}, limit ${testCase.limit}`,
        result.data.length,
        expectedLastPageCount,
      );
    }
  }

  // Test edge case: first page with minimum limit
  const minLimitCase = {
    page: 1, // 1-based for API
    limit: 1,
  } satisfies IDiscussionBoardPost.IRequest;

  const minLimitResult: IPageIDiscussionBoardPost.ISummary =
    await api.functional.discussion_board.search.posts.search(connection, {
      body: minLimitCase,
    });

  typia.assert(minLimitResult);
  TestValidator.equals(
    "minimum limit should work correctly",
    minLimitResult.pagination.limit,
    1,
  );

  // Test with search term to ensure pagination works with filtered results
  const searchWithTerm = {
    page: 1, // 1-based for API
    limit: 10,
    search: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardPost.IRequest;

  const searchResult: IPageIDiscussionBoardPost.ISummary =
    await api.functional.discussion_board.search.posts.search(connection, {
      body: searchWithTerm,
    });

  typia.assert(searchResult);
  TestValidator.equals(
    "pagination should work with search term",
    searchResult.pagination.limit,
    10,
  );
}
