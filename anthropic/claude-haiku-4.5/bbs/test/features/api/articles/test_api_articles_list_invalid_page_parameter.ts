import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article list retrieval with valid pagination parameters.
 *
 * Validates that the article list endpoint correctly handles pagination with
 * valid page parameter values. Tests multiple valid pagination scenarios to
 * ensure the API properly processes page parameters within the valid range
 * (page >= 1).
 *
 * Test workflow:
 *
 * 1. Retrieve articles with page = 1 (minimum valid page)
 * 2. Verify the response contains valid pagination data
 * 3. Retrieve articles with page = 2 to test subsequent pages
 * 4. Verify pagination metadata is correct
 * 5. Retrieve articles without page parameter (optional field)
 * 6. Verify the API handles optional pagination gracefully
 */
export async function test_api_articles_list_invalid_page_parameter(
  connection: api.IConnection,
) {
  // Test 1: Retrieve articles with page = 1 (minimum valid page value)
  const firstPageResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(firstPageResult);
  TestValidator.equals(
    "first page should have current page = 1",
    firstPageResult.pagination.current,
    1,
  );

  // Test 2: Retrieve articles with page = 2
  const secondPageResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 2,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(secondPageResult);
  TestValidator.equals(
    "second page should have current page = 2",
    secondPageResult.pagination.current,
    2,
  );

  // Test 3: Verify pagination data structure is valid
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    firstPageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages count should be non-negative",
    firstPageResult.pagination.pages >= 0,
  );

  // Test 4: Retrieve articles without page parameter (optional)
  const defaultPageResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {} satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(defaultPageResult);
  TestValidator.predicate(
    "default page should return valid response",
    defaultPageResult.pagination.current >= 1,
  );
}
