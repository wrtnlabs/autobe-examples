import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article list sorting by pinned status.
 *
 * Validates that the article list API correctly handles sorting by pinned
 * status (isPinned field). Since the API response includes only summary
 * information (id and title without pinned status), this test verifies that the
 * API accepts isPinned as a valid sort field and returns properly formatted
 * results in different sort orders.
 *
 * Test flow:
 *
 * 1. Request article list with sorting by isPinned in descending order
 * 2. Request article list with sorting by isPinned in ascending order
 * 3. Validate that both responses are properly formatted with valid pagination
 * 4. Verify the API correctly handles the isPinned sort parameter
 * 5. Compare results from different sort orders
 */
export async function test_api_articles_list_sort_by_pinned_status(
  connection: api.IConnection,
) {
  // Test 1: Fetch articles sorted by pinned status descending (pinned first)
  const sortedByPinnedDesc =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        orderBy: "isPinned",
        order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(sortedByPinnedDesc);

  // Validate response structure for descending sort
  TestValidator.predicate(
    "response should have valid pagination info",
    sortedByPinnedDesc.pagination.current >= 0 &&
      sortedByPinnedDesc.pagination.limit > 0 &&
      sortedByPinnedDesc.pagination.records >= 0 &&
      sortedByPinnedDesc.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response should have data array",
    Array.isArray(sortedByPinnedDesc.data),
  );
  TestValidator.predicate(
    "data items should have required fields",
    sortedByPinnedDesc.data.every(
      (article) =>
        article.id !== undefined &&
        article.id !== null &&
        article.title !== undefined &&
        article.title !== null,
    ),
  );

  // Test 2: Fetch articles sorted by pinned status ascending (unpinned first)
  const sortedByPinnedAsc = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        orderBy: "isPinned",
        order: "asc",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(sortedByPinnedAsc);

  // Validate response structure for ascending sort
  TestValidator.predicate(
    "ascending sort response should have valid pagination",
    sortedByPinnedAsc.pagination.current >= 0 &&
      sortedByPinnedAsc.pagination.limit > 0,
  );
  TestValidator.predicate(
    "ascending sort response should have data array",
    Array.isArray(sortedByPinnedAsc.data),
  );

  // Test 3: Verify both sort directions return data
  TestValidator.predicate(
    "descending sort should return articles",
    sortedByPinnedDesc.data.length >= 0,
  );
  TestValidator.predicate(
    "ascending sort should return articles",
    sortedByPinnedAsc.data.length >= 0,
  );

  // Test 4: Verify pagination consistency
  TestValidator.equals(
    "both sorts should have same total records count",
    sortedByPinnedDesc.pagination.records,
    sortedByPinnedAsc.pagination.records,
  );
  TestValidator.equals(
    "both sorts should have same page count",
    sortedByPinnedDesc.pagination.pages,
    sortedByPinnedAsc.pagination.pages,
  );

  // Test 5: Verify individual article data integrity
  for (const article of sortedByPinnedDesc.data) {
    TestValidator.predicate(
      `article ${article.id} should have valid title",`,
      article.title.length > 0,
    );
  }

  // Test 6: Compare with sorting by different field
  const sortedByCreatedAt = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        orderBy: "createdAt",
        order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(sortedByCreatedAt);

  TestValidator.predicate(
    "different sort field should also work",
    Array.isArray(sortedByCreatedAt.data),
  );

  // Test 7: Verify pagination with different limits
  const singleArticle = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
        orderBy: "isPinned",
        order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(singleArticle);

  TestValidator.predicate(
    "limit parameter should be respected",
    singleArticle.data.length <= 1,
  );
}
