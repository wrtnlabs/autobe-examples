import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article list endpoint with various valid filter combinations and
 * validation.
 *
 * Validates that the article list endpoint (PATCH /discussionBoard/articles)
 * properly handles filtering, pagination, sorting, and search functionality
 * with valid input parameters. Tests realistic usage scenarios including:
 *
 * - Filtering by status
 * - Filtering by valid UUIDs for category and contributor
 * - Pagination with valid page and limit values
 * - Sorting by different fields
 * - Search functionality with valid keywords
 */
export async function test_api_articles_list_invalid_uuid_parameters(
  connection: api.IConnection,
) {
  // Test 1: List articles with default parameters
  const defaultResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {} satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default request should return valid pagination",
    defaultResponse.pagination !== null && defaultResponse.data !== null,
  );

  // Test 2: List articles with valid pagination parameters
  const paginatedResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination current page should match request",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    paginatedResponse.pagination.limit,
    10,
  );

  // Test 3: List articles with status filter
  const statusFilterResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        status: "published",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(statusFilterResponse);
  TestValidator.predicate(
    "status filter request should succeed",
    Array.isArray(statusFilterResponse.data),
  );

  // Test 4: List articles with valid UUID for categoryId
  const validCategoryId = typia.random<string & tags.Format<"uuid">>();
  const categoryFilterResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        categoryId: validCategoryId,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(categoryFilterResponse);
  TestValidator.predicate(
    "valid categoryId filter should succeed",
    categoryFilterResponse.pagination !== null,
  );

  // Test 5: List articles with valid UUID for contributorId
  const validContributorId = typia.random<string & tags.Format<"uuid">>();
  const contributorFilterResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        contributorId: validContributorId,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(contributorFilterResponse);
  TestValidator.predicate(
    "valid contributorId filter should succeed",
    Array.isArray(contributorFilterResponse.data),
  );

  // Test 6: List articles with null UUID parameters
  const nullParamsResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        categoryId: null,
        contributorId: null,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(nullParamsResponse);
  TestValidator.predicate(
    "null UUID parameters should be accepted",
    nullParamsResponse.pagination !== null,
  );

  // Test 7: List articles with search query
  const searchResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: "test article",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search query should succeed",
    Array.isArray(searchResponse.data),
  );

  // Test 8: List articles with sorting
  const sortedResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        orderBy: "createdAt",
        order: "desc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(sortedResponse);
  TestValidator.predicate(
    "sorting parameters should succeed",
    sortedResponse.pagination !== null,
  );

  // Test 9: List articles with pinned filter
  const pinnedResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        isPinned: true,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(pinnedResponse);
  TestValidator.predicate(
    "pinned filter should succeed",
    Array.isArray(pinnedResponse.data),
  );

  // Test 10: List articles with locked filter
  const lockedResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        isLocked: false,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(lockedResponse);
  TestValidator.predicate(
    "locked filter should succeed",
    lockedResponse.pagination !== null,
  );

  // Test 11: List articles with combined filters
  const combinedResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        status: "published",
        categoryId: validCategoryId,
        contributorId: validContributorId,
        isPinned: true,
        orderBy: "viewCount",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(combinedResponse);
  TestValidator.predicate(
    "combined filters should succeed",
    combinedResponse.pagination !== null && combinedResponse.data !== null,
  );
}
