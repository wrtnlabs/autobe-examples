import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";

/**
 * Test that inactive categories are properly excluded from the list.
 *
 * This test validates that the discussion board categories API correctly
 * filters out inactive categories (is_active = false) and returns only active
 * categories (is_active = true). The test retrieves the paginated list of
 * categories and verifies that every returned category has is_active set to
 * true, ensuring users only see available categories for article submission and
 * selection.
 *
 * Steps:
 *
 * 1. Call the categories index API to retrieve all categories
 * 2. Validate that the response has proper type structure
 * 3. Verify that all returned categories have is_active = true
 * 4. Confirm that no inactive categories appear in the results
 * 5. Validate pagination consistency
 */
export async function test_api_article_categories_list_inactive_categories_excluded(
  connection: api.IConnection,
) {
  // Call the API to retrieve all discussion board article categories
  const response: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection);

  // Validate the complete response structure and all type constraints
  typia.assert(response);

  // Verify that all returned categories are active
  for (const category of response.data) {
    TestValidator.predicate(
      `category "${category.name}" should be active`,
      category.is_active === true,
    );
  }

  // Verify pagination consistency
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "returned data count should not exceed pagination records",
      response.data.length <= response.pagination.records,
    );
  }
}
