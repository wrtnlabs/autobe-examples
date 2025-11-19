import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";

/**
 * Validate the completeness and format of article category metadata in list
 * response.
 *
 * This test verifies that the GET /discussionBoard/categories endpoint returns
 * complete category metadata with all required fields properly formatted for UI
 * rendering:
 *
 * - Pagination information (current, limit, records, pages)
 * - Category id in UUID format
 * - Category code following lowercase alphanumeric with hyphens pattern (5-50
 *   chars)
 * - Category name (10-100 characters human-readable title)
 * - Display order for UI sorting (non-negative integer)
 * - Active status (boolean flag)
 * - Article count for display purposes (non-negative integer)
 *
 * All fields must conform to their type constraints and format specifications.
 */
export async function test_api_article_categories_list_category_metadata_completeness(
  connection: api.IConnection,
) {
  // Retrieve the paginated list of article categories
  const response =
    await api.functional.discussionBoard.categories.index(connection);

  // Validate the response structure matches the DTO
  typia.assert<IPageIDiscussionBoardArticleCategory.ISummary>(response);

  // Validate pagination information exists
  TestValidator.predicate(
    "pagination should exist",
    response.pagination !== null && response.pagination !== undefined,
  );

  // Validate pagination fields are non-negative integers
  TestValidator.predicate(
    "current page should be non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "page limit should be non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    response.pagination.pages >= 0,
  );

  // Validate data array exists and is an array
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(response.data),
  );

  // If categories exist, validate each category's metadata completeness
  if (response.data.length > 0) {
    // Test with first few categories (or all if less than 3)
    const categoriesToTest = response.data.slice(
      0,
      Math.min(3, response.data.length),
    );

    for (const category of categoriesToTest) {
      // Validate id field exists and is in UUID format
      TestValidator.predicate(
        `category ${category.id} should have valid UUID format`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          category.id,
        ),
      );

      // Validate code field exists and follows pattern
      TestValidator.predicate(
        `category code "${category.code}" should be 5-50 chars of lowercase alphanumeric with hyphens`,
        category.code.length >= 5 &&
          category.code.length <= 50 &&
          /^[a-z0-9-]+$/.test(category.code),
      );

      // Validate name field exists and has correct length
      TestValidator.predicate(
        `category name "${category.name}" should be 10-100 characters`,
        category.name.length >= 10 && category.name.length <= 100,
      );

      // Validate display_order is non-negative integer
      TestValidator.predicate(
        `display_order for "${category.name}" should be non-negative integer`,
        Number.isInteger(category.display_order) && category.display_order >= 0,
      );

      // Validate is_active is boolean
      TestValidator.predicate(
        `is_active for "${category.name}" should be boolean`,
        typeof category.is_active === "boolean",
      );

      // Validate article_count is non-negative integer
      TestValidator.predicate(
        `article_count for "${category.name}" should be non-negative integer`,
        Number.isInteger(category.article_count) && category.article_count >= 0,
      );
    }
  }

  // Validate that all required metadata fields are present in response structure
  TestValidator.predicate(
    "response should contain pagination and data",
    response.pagination !== undefined && response.data !== undefined,
  );
}
