import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Test that all required fields are present in the category detail response.
 *
 * Verifies that fetching a category detail returns a complete response with all
 * required fields properly populated:
 *
 * - Id: UUID format unique identifier
 * - Code: 5-50 lowercase alphanumeric with hyphens
 * - Name: 10-100 character human-readable name
 * - Display_order: non-negative integer for display sorting
 * - Is_active: boolean indicating if category accepts new articles
 * - Article_count: non-negative integer count of articles in category
 * - Created_at: ISO 8601 datetime of creation
 * - Updated_at: ISO 8601 datetime of last modification
 *
 * This ensures the API contract is fulfilled and no required fields are
 * missing, null, or undefined.
 */
export async function test_api_article_category_detail_all_required_fields(
  connection: api.IConnection,
) {
  // Fetch a category detail by generating a valid UUID categoryId
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.categories.at(connection, {
      categoryId,
    });

  // Validate complete response structure - typia.assert performs COMPLETE type validation
  // including all field existence, types, formats, and constraints
  typia.assert(category);

  // Test complete: typia.assert validates all required fields are present and properly typed
}
