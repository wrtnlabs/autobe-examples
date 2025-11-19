import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article list retrieval that returns no matching results.
 *
 * Verify that the endpoint correctly handles empty result sets, returning
 * paginated response with zero records and appropriate pagination metadata.
 *
 * Steps:
 *
 * 1. Call the article list endpoint with a restrictive search filter
 * 2. Use a search query that is highly unlikely to match any articles
 * 3. Validate the response structure is a valid paginated response
 * 4. Verify the data array is empty
 * 5. Verify pagination metadata shows 0 total records and 0 pages
 * 6. Verify the current page and limit are reasonable values
 */
export async function test_api_articles_list_empty_result_set(
  connection: api.IConnection,
) {
  // Call the article list endpoint with a search query unlikely to match anything
  const searchQuery = RandomGenerator.alphaNumeric(50); // Very specific random string

  const response: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        search: searchQuery satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<200>,
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  // Validate response structure
  typia.assert(response);

  // Verify the data array is empty
  TestValidator.predicate(
    "response data array should be empty",
    response.data.length === 0,
  );

  // Verify pagination metadata shows zero records
  TestValidator.equals(
    "total records should be 0",
    response.pagination.records,
    0,
  );

  // Verify total pages is 0
  TestValidator.equals("total pages should be 0", response.pagination.pages, 0);

  // Verify current page is 1 (default first page)
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );

  // Verify limit is set to the requested value
  TestValidator.equals("limit should be 20", response.pagination.limit, 20);
}
