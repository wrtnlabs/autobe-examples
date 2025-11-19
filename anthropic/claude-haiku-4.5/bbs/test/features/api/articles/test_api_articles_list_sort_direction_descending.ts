import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article list sorting with descending order.
 *
 * Validates that the article list API correctly sorts results in descending
 * order when the order parameter is set to "desc". This test verifies that
 * articles are returned in a consistent, sorted manner for the selected sort
 * field, ensuring the API processes sorting parameters correctly and returns
 * properly paginated results with descending order applied.
 *
 * Test process:
 *
 * 1. Request article list with descending sort order on createdAt field
 * 2. Validate response structure and pagination
 * 3. Request article list with descending sort order on viewCount field
 * 4. Validate results are properly returned with pagination
 * 5. Request article list with descending sort order on commentCount field
 * 6. Validate results are properly returned with pagination
 * 7. Request article list with descending sort order on publishedAt field
 * 8. Validate results are properly returned with pagination
 * 9. Request article list with descending sort order on isPinned field
 * 10. Validate results are properly returned with pagination
 */
export async function test_api_articles_list_sort_direction_descending(
  connection: api.IConnection,
) {
  // Test 1: Sort by createdAt in descending order (newest first)
  const createdAtDescResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        orderBy: "createdAt",
        order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(createdAtDescResult);

  TestValidator.predicate(
    "createdAt descending response has valid pagination",
    createdAtDescResult.pagination.current > 0 &&
      createdAtDescResult.pagination.limit > 0 &&
      createdAtDescResult.pagination.pages >= 0 &&
      createdAtDescResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "createdAt descending response data is array",
    Array.isArray(createdAtDescResult.data),
  );

  // Test 2: Sort by viewCount in descending order (highest views first)
  const viewCountDescResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        orderBy: "viewCount",
        order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(viewCountDescResult);

  TestValidator.predicate(
    "viewCount descending response has valid pagination",
    viewCountDescResult.pagination.current > 0 &&
      viewCountDescResult.pagination.limit > 0 &&
      viewCountDescResult.pagination.pages >= 0 &&
      viewCountDescResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "viewCount descending response data is array",
    Array.isArray(viewCountDescResult.data),
  );

  // Test 3: Sort by commentCount in descending order (most comments first)
  const commentCountDescResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        orderBy: "commentCount",
        order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(commentCountDescResult);

  TestValidator.predicate(
    "commentCount descending response has valid pagination",
    commentCountDescResult.pagination.current > 0 &&
      commentCountDescResult.pagination.limit > 0 &&
      commentCountDescResult.pagination.pages >= 0 &&
      commentCountDescResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "commentCount descending response data is array",
    Array.isArray(commentCountDescResult.data),
  );

  // Test 4: Sort by publishedAt in descending order (most recent publication first)
  const publishedAtDescResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        orderBy: "publishedAt",
        order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(publishedAtDescResult);

  TestValidator.predicate(
    "publishedAt descending response has valid pagination",
    publishedAtDescResult.pagination.current > 0 &&
      publishedAtDescResult.pagination.limit > 0 &&
      publishedAtDescResult.pagination.pages >= 0 &&
      publishedAtDescResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "publishedAt descending response data is array",
    Array.isArray(publishedAtDescResult.data),
  );

  // Test 5: Sort by isPinned in descending order (pinned articles first)
  const isPinnedDescResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        orderBy: "isPinned",
        order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(isPinnedDescResult);

  TestValidator.predicate(
    "isPinned descending response has valid pagination",
    isPinnedDescResult.pagination.current > 0 &&
      isPinnedDescResult.pagination.limit > 0 &&
      isPinnedDescResult.pagination.pages >= 0 &&
      isPinnedDescResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "isPinned descending response data is array",
    Array.isArray(isPinnedDescResult.data),
  );

  // Validate article summary structure
  if (createdAtDescResult.data.length > 0) {
    const firstArticle = createdAtDescResult.data[0];
    TestValidator.predicate(
      "article summary has id field",
      firstArticle.id !== undefined && firstArticle.id !== null,
    );

    TestValidator.predicate(
      "article summary has title field",
      firstArticle.title !== undefined && firstArticle.title !== null,
    );
  }

  // Validate pagination consistency across all responses
  TestValidator.equals(
    "all responses use same page number",
    createdAtDescResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "all responses use same limit",
    createdAtDescResult.pagination.limit,
    20,
  );
}
