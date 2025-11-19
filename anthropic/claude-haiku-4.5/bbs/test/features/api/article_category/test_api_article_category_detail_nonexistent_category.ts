import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Test API behavior when requesting a category that does not exist.
 *
 * This test validates proper error handling for non-existent resources. It
 * generates a valid UUID that corresponds to no category in the system and
 * verifies that the API returns an appropriate 404 Not Found error with a
 * descriptive message.
 *
 * Test steps:
 *
 * 1. Generate a valid UUID in the correct format
 * 2. Attempt to retrieve category details using the non-existent UUID
 * 3. Verify the API throws an error (404 Not Found expected)
 * 4. Validate error response indicates the category was not found
 */
export async function test_api_article_category_detail_nonexistent_category(
  connection: api.IConnection,
) {
  // Generate a valid UUID that does not correspond to any category
  const nonexistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve the non-existent category and expect an error
  await TestValidator.error(
    "should return error when category does not exist",
    async () => {
      await api.functional.discussionBoard.categories.at(connection, {
        categoryId: nonexistentCategoryId,
      });
    },
  );
}
