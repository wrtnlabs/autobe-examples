import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";

/**
 * Validates the API's handling of empty category listings.
 *
 * Tests the discussion board article categories endpoint when no categories are
 * available in the system. Verifies that the API returns a properly structured
 * paginated response with an empty data array while maintaining correct
 * pagination metadata.
 *
 * This test ensures:
 *
 * 1. The API returns an empty data array when no categories exist
 * 2. Pagination metadata is correct (records=0, pages=0)
 * 3. The response structure remains consistent and valid
 * 4. The API gracefully handles the empty state without errors
 *
 * Workflow:
 *
 * 1. Call the categories listing API
 * 2. Assert the response is valid according to the type definition
 * 3. Validate that the data array is empty
 * 4. Verify pagination shows 0 records and 0 pages
 * 5. Confirm the response structure is properly formed
 */
export async function test_api_article_categories_list_empty_response(
  connection: api.IConnection,
) {
  // Call the API to retrieve categories
  const response: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection);

  // Validate the response structure is correct
  typia.assert(response);

  // Verify the data array is empty
  TestValidator.equals(
    "categories data array should be empty",
    response.data.length,
    0,
  );

  // Verify pagination metadata reflects empty state
  TestValidator.equals(
    "total records should be zero",
    response.pagination.records,
    0,
  );

  TestValidator.equals(
    "total pages should be zero",
    response.pagination.pages,
    0,
  );

  // Verify pagination structure is present and valid
  TestValidator.predicate(
    "pagination object should exist",
    response.pagination !== null && response.pagination !== undefined,
  );

  // Verify pagination properties have valid types
  TestValidator.predicate(
    "current page number should be non-negative",
    response.pagination.current >= 0,
  );

  TestValidator.predicate(
    "page limit should be non-negative",
    response.pagination.limit >= 0,
  );
}
