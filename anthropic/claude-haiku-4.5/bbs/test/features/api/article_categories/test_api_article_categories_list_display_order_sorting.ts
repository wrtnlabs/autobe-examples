import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";

/**
 * Validates that article categories are returned in correct display_order
 * sequence.
 *
 * Tests that the category listing API returns all active categories sorted by
 * their display_order field in ascending order. Lower display_order values
 * should appear before higher values, ensuring consistent category menu
 * ordering in the UI.
 *
 * Process:
 *
 * 1. Call the category listing API to retrieve all active categories
 * 2. Verify the response contains valid category data with pagination information
 * 3. Extract display_order values from all returned categories
 * 4. Validate that display_order values are in ascending order
 * 5. Confirm categories are sorted correctly for UI navigation
 */
export async function test_api_article_categories_list_display_order_sorting(
  connection: api.IConnection,
) {
  // Step 1: Retrieve all active article categories from the API
  const response: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection);

  // Validate the response structure and all data
  typia.assert(response);

  // Step 2: Extract display_order values from all categories
  const displayOrders: number[] = response.data.map(
    (category: IDiscussionBoardArticleCategory.ISummary) =>
      category.display_order,
  );

  // Step 3: Validate that display_order values are in ascending order
  for (let i = 0; i < displayOrders.length - 1; i++) {
    TestValidator.predicate(
      `categories should be sorted by display_order in ascending order (position ${i}: ${displayOrders[i]} <= position ${i + 1}: ${displayOrders[i + 1]})`,
      displayOrders[i] <= displayOrders[i + 1],
    );
  }
}
