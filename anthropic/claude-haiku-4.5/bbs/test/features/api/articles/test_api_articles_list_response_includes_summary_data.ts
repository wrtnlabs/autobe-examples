import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Validate that article list response includes proper summary information.
 *
 * This test verifies that the article list API returns articles with complete
 * summary information (id and title) for each item. The test exercises the
 * article search and filtering functionality to ensure the lightweight summary
 * format is correctly populated with all required fields.
 *
 * Test flow:
 *
 * 1. Call the article index API with basic pagination parameters
 * 2. Verify the response structure validates and is logically consistent
 * 3. Verify articles are returned with required summary fields
 * 4. Test with various filter combinations to ensure consistency
 * 5. Validate pagination data reflects article counts
 */
export async function test_api_articles_list_response_includes_summary_data(
  connection: api.IConnection,
) {
  // Test 1: Basic article list request with pagination
  const basicListResponse = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );

  typia.assert(basicListResponse);

  // Verify pagination data is logically consistent
  TestValidator.predicate(
    "current page should not exceed total pages",
    basicListResponse.pagination.current <=
      basicListResponse.pagination.pages ||
      basicListResponse.pagination.pages === 0,
  );

  TestValidator.equals(
    "limit should match requested limit",
    basicListResponse.pagination.limit,
    20,
  );

  // Verify articles are returned with summary information
  if (basicListResponse.data.length > 0) {
    const firstArticle = basicListResponse.data[0];
    TestValidator.predicate(
      "article should have non-empty id",
      firstArticle.id.length > 0,
    );
    TestValidator.predicate(
      "article should have non-empty title",
      firstArticle.title.length > 0,
    );
  }

  // Test 2: Request with status filter
  const filteredResponse = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "published",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );

  typia.assert(filteredResponse);

  if (filteredResponse.data.length > 0) {
    const firstArticle = filteredResponse.data[0];
    TestValidator.predicate(
      "filtered article should have id",
      firstArticle.id.length > 0,
    );
    TestValidator.predicate(
      "filtered article should have title",
      firstArticle.title.length > 0,
    );
  }

  // Test 3: Request with search query
  const searchResponse = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 15,
        search: "article",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );

  typia.assert(searchResponse);

  TestValidator.predicate(
    "search response pagination should be consistent",
    searchResponse.pagination.current >= 1,
  );

  // Test 4: Request with sorting parameters
  const sortedResponse = await api.functional.discussionBoard.articles.index(
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

  typia.assert(sortedResponse);

  if (sortedResponse.data.length > 0) {
    sortedResponse.data.forEach((article) => {
      TestValidator.predicate(
        "sorted article should have id",
        article.id.length > 0,
      );
      TestValidator.predicate(
        "sorted article should have title",
        article.title.length > 0,
      );
    });
  }

  // Test 5: Request with multiple filters
  const multiFilterResponse =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "published",
        isPinned: true,
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  typia.assert(multiFilterResponse);

  TestValidator.equals(
    "multi-filter response pagination limit matches request",
    multiFilterResponse.pagination.limit,
    10,
  );

  // Verify pagination values are logically correct
  TestValidator.predicate(
    "pagination records should match or exceed data length",
    multiFilterResponse.pagination.records >= multiFilterResponse.data.length,
  );
}
