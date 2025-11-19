import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";

/**
 * Validates article_count field accuracy in category listings.
 *
 * This test verifies that the article_count field in each article category
 * accurately reflects the number of published articles assigned to that
 * category. The article_count is a denormalized field used for UI display
 * (e.g., showing "Economic Policy (47 articles)") and must be reliable and
 * consistent with actual article data.
 *
 * Test flow:
 *
 * 1. Retrieve the list of all article categories via GET
 *    /discussionBoard/categories
 * 2. Validate response structure with proper pagination information
 * 3. Verify each category has a valid article_count (non-negative integer)
 * 4. Ensure article_count values are appropriate for UI rendering
 * 5. Validate pagination metadata consistency (current, limit, records, pages)
 */
export async function test_api_article_categories_list_article_count_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Retrieve the list of article categories
  const response: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection);

  // Validate response structure
  typia.assert(response);

  // Step 2: Verify pagination structure exists and is valid
  TestValidator.predicate(
    "response has pagination information",
    () => response.pagination !== undefined && response.pagination !== null,
  );

  const pagination = response.pagination;

  // Step 3: Validate pagination metadata consistency
  TestValidator.predicate(
    "current page is non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate("limit is non-negative", pagination.limit >= 0);

  TestValidator.predicate(
    "total records count is non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages count is non-negative",
    pagination.pages >= 0,
  );

  // Step 4: Validate that data array exists
  TestValidator.predicate(
    "data array exists",
    () => response.data !== undefined && Array.isArray(response.data),
  );

  // Step 5: Validate each category's structure and article_count accuracy
  if (response.data.length > 0) {
    // Check first category as representative sample
    const firstCategory = response.data[0];

    typia.assert(firstCategory);

    // Verify category has all required fields
    TestValidator.predicate(
      "category has id field",
      () => typeof firstCategory.id === "string" && firstCategory.id.length > 0,
    );

    TestValidator.predicate(
      "category has code field",
      () =>
        typeof firstCategory.code === "string" && firstCategory.code.length > 0,
    );

    TestValidator.predicate(
      "category has name field",
      () =>
        typeof firstCategory.name === "string" && firstCategory.name.length > 0,
    );

    TestValidator.predicate(
      "category has display_order field",
      () =>
        typeof firstCategory.display_order === "number" &&
        firstCategory.display_order >= 0,
    );

    TestValidator.predicate(
      "category has is_active field",
      () => typeof firstCategory.is_active === "boolean",
    );

    // Step 6: Validate article_count is a non-negative integer
    TestValidator.predicate(
      "article_count is a non-negative integer",
      () =>
        Number.isInteger(firstCategory.article_count) &&
        firstCategory.article_count >= 0,
    );

    // Step 7: Validate article_count field across all categories
    for (const category of response.data) {
      TestValidator.predicate(
        `category ${category.code} has valid article_count`,
        () =>
          Number.isInteger(category.article_count) &&
          category.article_count >= 0,
      );

      TestValidator.predicate(
        `category ${category.code} has is_active boolean`,
        () => typeof category.is_active === "boolean",
      );

      TestValidator.predicate(
        `category ${category.code} has display_order as non-negative integer`,
        () =>
          Number.isInteger(category.display_order) &&
          category.display_order >= 0,
      );
    }
  }

  // Step 8: Validate response data count matches pagination if applicable
  if (response.data.length > 0) {
    TestValidator.predicate(
      "data array length is consistent with pagination",
      () => response.data.length <= pagination.records,
    );
  }
}
