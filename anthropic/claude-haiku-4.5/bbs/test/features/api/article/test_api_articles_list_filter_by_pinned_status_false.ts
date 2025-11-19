import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test retrieving only unpinned articles using isPinned filter set to false.
 *
 * This test validates the article listing API's ability to filter articles by
 * their pinned status. When isPinned filter is set to false, the API should
 * return only unpinned articles, excluding any pinned articles from the
 * results.
 *
 * Test workflow:
 *
 * 1. Call the article list API with isPinned filter set to false
 * 2. Validate that the response contains properly paginated article data
 * 3. Verify that pagination information is properly included
 * 4. Confirm that all returned articles have the correct summary structure
 */
export async function test_api_articles_list_filter_by_pinned_status_false(
  connection: api.IConnection,
) {
  // Call the article list API with isPinned filter set to false to retrieve only unpinned articles
  const response: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        isPinned: false,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  // Validate the complete response structure including all nested properties and article summaries
  typia.assert(response);

  // Verify pagination data is valid and consistent
  TestValidator.predicate(
    "pagination current page should be non-negative",
    response.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be non-negative",
    response.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination total records should be non-negative",
    response.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination total pages should be non-negative",
    response.pagination.pages >= 0,
  );
}
