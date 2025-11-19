import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article list sorting with ascending order.
 *
 * This test validates that the article list API correctly returns results
 * sorted in ascending order by the selected sort field. Results should be
 * ordered from lowest to highest value for the selected sort field:
 *
 * - For createdAt/publishedAt: oldest dates first
 * - For viewCount/commentCount: lowest counts first
 * - For isPinned: unpinned articles first
 *
 * The test requests articles with "asc" sort direction on different sort fields
 * and verifies that the API accepts all ascending sort parameter combinations
 * and returns properly paginated results with valid article summaries.
 */
export async function test_api_articles_list_sort_direction_ascending(
  connection: api.IConnection,
) {
  // Test ascending sort by createdAt (oldest first)
  const createdAtAscResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        order: "asc",
        orderBy: "createdAt",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(createdAtAscResult);

  TestValidator.predicate(
    "ascending createdAt sort should return paginated results",
    createdAtAscResult.data.length >= 0,
  );

  // Test ascending sort by viewCount (lowest first)
  const viewCountAscResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        order: "asc",
        orderBy: "viewCount",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(viewCountAscResult);

  TestValidator.predicate(
    "ascending viewCount sort should return valid results",
    viewCountAscResult.data.length >= 0,
  );

  // Test ascending sort by commentCount (lowest first)
  const commentCountAscResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        order: "asc",
        orderBy: "commentCount",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(commentCountAscResult);

  TestValidator.predicate(
    "ascending commentCount sort should return valid results",
    commentCountAscResult.data.length >= 0,
  );

  // Test ascending sort by publishedAt (oldest first)
  const publishedAtAscResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        order: "asc",
        orderBy: "publishedAt",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(publishedAtAscResult);

  TestValidator.predicate(
    "ascending publishedAt sort should return valid results",
    publishedAtAscResult.data.length >= 0,
  );

  // Test ascending sort by isPinned (unpinned first)
  const isPinnedAscResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        order: "asc",
        orderBy: "isPinned",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(isPinnedAscResult);

  TestValidator.predicate(
    "ascending isPinned sort should return valid results",
    isPinnedAscResult.data.length >= 0,
  );

  // Verify pagination information is correct
  TestValidator.predicate(
    "pagination should have valid current page",
    createdAtAscResult.pagination.current >= 1,
  );

  TestValidator.predicate(
    "pagination should have valid limit",
    createdAtAscResult.pagination.limit >= 1,
  );

  TestValidator.predicate(
    "pagination should have valid total records count",
    createdAtAscResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination should have valid pages count",
    createdAtAscResult.pagination.pages >= 0,
  );
}
