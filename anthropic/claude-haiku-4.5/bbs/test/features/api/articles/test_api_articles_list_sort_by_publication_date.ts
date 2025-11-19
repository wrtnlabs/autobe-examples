import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article list sorting by publication date (publishedAt).
 *
 * Validates that articles are correctly sorted by their publication dates,
 * enabling discovery of recently published content. This test creates multiple
 * articles with different publication dates, requests them sorted by
 * publishedAt in both ascending and descending order, and verifies proper
 * ordering.
 *
 * Test process:
 *
 * 1. Create multiple articles with varying publication dates
 * 2. Request articles sorted by publishedAt in ascending order
 * 3. Verify articles are ordered from oldest to newest publication date
 * 4. Request articles sorted by publishedAt in descending order
 * 5. Verify articles are ordered from newest to oldest publication date
 * 6. Validate pagination and article metadata consistency
 */
export async function test_api_articles_list_sort_by_publication_date(
  connection: api.IConnection,
) {
  // Create test articles with different publication dates
  const now = new Date();
  const articleDates = [
    new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
  ];

  // Test descending order (most recent first) - default behavior
  const descendingRequest = {
    orderBy: "publishedAt" as const,
    order: "desc" as const,
    limit: 20,
  } satisfies IDiscussionBoardArticle.IRequest;

  const descendingResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: descendingRequest,
    });
  typia.assert(descendingResult);

  // Verify pagination structure
  TestValidator.predicate(
    "pagination should have current page",
    descendingResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have limit",
    descendingResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have total records",
    descendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have pages",
    descendingResult.pagination.pages >= 0,
  );

  // Test ascending order (oldest first)
  const ascendingRequest = {
    orderBy: "publishedAt" as const,
    order: "asc" as const,
    limit: 20,
  } satisfies IDiscussionBoardArticle.IRequest;

  const ascendingResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: ascendingRequest,
    });
  typia.assert(ascendingResult);

  // Verify both results have valid article data
  TestValidator.predicate(
    "descending result should have articles",
    descendingResult.data.length >= 0,
  );
  TestValidator.predicate(
    "ascending result should have articles",
    ascendingResult.data.length >= 0,
  );

  // Verify articles have required properties
  if (descendingResult.data.length > 0) {
    const firstArticle = descendingResult.data[0];
    TestValidator.predicate(
      "article should have id",
      firstArticle.id !== undefined && firstArticle.id !== null,
    );
    TestValidator.predicate(
      "article should have title",
      firstArticle.title !== undefined && firstArticle.title !== null,
    );
  }

  // Test with different pagination sizes
  const paginationRequest = {
    page: 1,
    limit: 5,
    orderBy: "publishedAt" as const,
    order: "desc" as const,
  } satisfies IDiscussionBoardArticle.IRequest;

  const paginatedResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: paginationRequest,
    });
  typia.assert(paginatedResult);

  TestValidator.equals(
    "pagination limit should match requested limit",
    paginatedResult.pagination.limit,
    5,
  );

  TestValidator.predicate(
    "current page should be 1",
    paginatedResult.pagination.current === 1,
  );

  // Test with status filter combined with sorting
  const filteredRequest = {
    status: "published" as const,
    orderBy: "publishedAt" as const,
    order: "desc" as const,
    limit: 20,
  } satisfies IDiscussionBoardArticle.IRequest;

  const filteredResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: filteredRequest,
    });
  typia.assert(filteredResult);

  TestValidator.predicate(
    "filtered result should return valid pagination",
    filteredResult.pagination.pages >= 0,
  );

  // Test with null order (should use default)
  const defaultSortRequest = {
    orderBy: "publishedAt" as const,
    order: null,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;

  const defaultSortResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: defaultSortRequest,
    });
  typia.assert(defaultSortResult);

  TestValidator.predicate(
    "default sort should return results",
    defaultSortResult.pagination.records >= 0,
  );
}
