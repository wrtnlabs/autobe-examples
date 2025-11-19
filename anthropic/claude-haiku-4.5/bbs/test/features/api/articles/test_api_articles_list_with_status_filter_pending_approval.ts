import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test retrieving articles filtered by status 'pending_approval'.
 *
 * This test validates the discussion board article listing API with
 * comprehensive status-based filtering. It ensures that when querying articles
 * with the status filter set to 'pending_approval', the API correctly returns
 * only articles awaiting moderator review. This demonstrates proper filtering
 * mechanics for moderation workflows where reviewers need to access articles
 * pending their approval.
 *
 * Test workflow:
 *
 * 1. Query articles with status filter set to 'pending_approval'
 * 2. Verify the response contains proper pagination structure
 * 3. Validate response type matches expected page structure
 * 4. Verify the data array exists and is properly typed
 * 5. Test pagination information is included correctly
 */
export async function test_api_articles_list_with_status_filter_pending_approval(
  connection: api.IConnection,
) {
  // Test Case 1: Query articles filtered by pending_approval status
  const pendingArticlesPage: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "pending_approval",
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  // Validate the response structure
  typia.assert(pendingArticlesPage);

  // Verify pagination information exists
  TestValidator.predicate(
    "pagination information should exist",
    pendingArticlesPage.pagination !== undefined,
  );

  // Verify pagination structure
  TestValidator.predicate(
    "current page should be positive",
    pendingArticlesPage.pagination.current >= 0,
  );

  TestValidator.predicate(
    "limit should be positive",
    pendingArticlesPage.pagination.limit > 0,
  );

  TestValidator.predicate(
    "total records should be non-negative",
    pendingArticlesPage.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be non-negative",
    pendingArticlesPage.pagination.pages >= 0,
  );

  // Verify data array exists
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(pendingArticlesPage.data),
  );

  // Test Case 2: Query with multiple filters including status
  const filteredPage: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "pending_approval",
        orderBy: "createdAt",
        order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  typia.assert(filteredPage);

  // Verify filtered response has valid structure
  TestValidator.predicate(
    "filtered page should have pagination",
    filteredPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "filtered page should have data array",
    Array.isArray(filteredPage.data),
  );

  // Test Case 3: Query with status filter and limit variations
  const smallPageSize: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 5,
        status: "pending_approval",
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  typia.assert(smallPageSize);

  // Verify the response respects the limit parameter
  TestValidator.predicate(
    "returned data should not exceed limit",
    smallPageSize.data.length <= 5,
  );

  // Test Case 4: Verify each article in response has required fields
  if (smallPageSize.data.length > 0) {
    smallPageSize.data.forEach((article, index) => {
      TestValidator.predicate(
        `article ${index} should have id`,
        article.id !== undefined && article.id.length > 0,
      );

      TestValidator.predicate(
        `article ${index} should have title`,
        article.title !== undefined && article.title.length > 0,
      );
    });
  }

  // Test Case 5: Test with null status filter to verify filtering behavior
  const allArticlesPage: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: null,
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  typia.assert(allArticlesPage);

  // Verify all articles page returns valid structure
  TestValidator.predicate(
    "all articles page should have valid pagination",
    allArticlesPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "all articles page should have data array",
    Array.isArray(allArticlesPage.data),
  );
}
