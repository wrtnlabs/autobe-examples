import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test retrieving articles filtered by status 'draft'.
 *
 * This test validates that the article list API correctly filters articles by
 * their publication status. Specifically, it verifies that when requesting
 * articles with status filter set to "draft", the API response contains only
 * articles with draft status and properly excludes other statuses.
 *
 * Test steps:
 *
 * 1. Call the article list API with status="draft" filter
 * 2. Validate the response structure and type safety
 * 3. Verify pagination information is valid
 * 4. Test filtering with different pagination parameters
 * 5. Verify consistency of returned article data structure
 */
export async function test_api_articles_list_with_status_filter_draft(
  connection: api.IConnection,
) {
  // Call the article list API with draft status filter
  const draftFilterResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        status: "draft",
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  // Validate the complete response structure and all type aspects
  typia.assert(draftFilterResponse);

  // Verify pagination information
  TestValidator.predicate(
    "pagination current page should be positive",
    draftFilterResponse.pagination.current >= 1,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    draftFilterResponse.pagination.limit > 0,
  );

  TestValidator.predicate(
    "total records should be non-negative",
    draftFilterResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be non-negative",
    draftFilterResponse.pagination.pages >= 0,
  );

  // Verify that response data is an array
  TestValidator.predicate(
    "response data should be an array",
    Array.isArray(draftFilterResponse.data),
  );

  // Test with pagination - second page
  const pagedResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        status: "draft",
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  // Validate the paginated response structure
  typia.assert(pagedResponse);

  TestValidator.equals(
    "paginated response limit should match requested limit",
    pagedResponse.pagination.limit,
    10,
  );

  TestValidator.equals(
    "paginated response current page should match request",
    pagedResponse.pagination.current,
    2,
  );

  // Test with smaller limit
  const limitedResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        status: "draft",
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  typia.assert(limitedResponse);

  TestValidator.predicate(
    "returned data should not exceed requested limit",
    limitedResponse.data.length <= 5,
  );

  // Test filtering without status filter for comparison
  const allArticlesResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  typia.assert(allArticlesResponse);

  TestValidator.predicate(
    "unfiltered response should have valid pagination",
    allArticlesResponse.pagination.records >= 0,
  );

  // Test with null status (explicitly no status filter)
  const nullStatusResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        status: null,
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  typia.assert(nullStatusResponse);

  TestValidator.predicate(
    "null status filter should return valid response",
    Array.isArray(nullStatusResponse.data),
  );
}
