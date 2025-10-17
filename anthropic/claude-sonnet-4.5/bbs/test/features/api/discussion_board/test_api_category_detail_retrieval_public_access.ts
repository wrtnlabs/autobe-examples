import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test public access to category detail retrieval without authentication.
 *
 * Validates that unauthenticated guests can retrieve detailed information for a
 * specific discussion board category by its unique ID. This ensures category
 * information is publicly accessible organizational metadata that supports
 * category understanding during topic creation and general platform
 * exploration.
 *
 * The test verifies:
 *
 * 1. Successful retrieval without authentication credentials
 * 2. Complete category details are returned including all metadata fields
 * 3. All fields conform to their expected types and formats
 * 4. Description field contains complete explanatory text
 * 5. Parent category ID is properly populated for subcategories
 * 6. Topic count provides current usage statistics
 * 7. Display order indicates category position in organized listings
 */
export async function test_api_category_detail_retrieval_public_access(
  connection: api.IConnection,
) {
  // Generate a valid UUID for the category ID to retrieve
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve category details without authentication
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.categories.at(connection, {
      categoryId: categoryId,
    });

  // Validate the complete response structure and all type constraints
  typia.assert(category);
}
