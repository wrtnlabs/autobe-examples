import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Test category retrieval with a non-existent category ID.
 *
 * This test validates proper error handling when attempting to retrieve a
 * category that does not exist in the discussion_board_article_categories
 * table. The test generates a random UUID that is guaranteed not to correspond
 * to any existing category record and verifies the API returns an appropriate
 * error response.
 *
 * This ensures robust error handling for invalid category references, which is
 * critical for maintaining data integrity and providing clear feedback when
 * users or systems attempt to access non-existent categories.
 *
 * Process:
 *
 * 1. Generate a random UUID that doesn't exist in the database
 * 2. Attempt to retrieve the category using the non-existent ID
 * 3. Verify that the API throws an error (indicating proper error handling)
 */
export async function test_api_category_retrieval_nonexistent_id(
  connection: api.IConnection,
) {
  // Generate a random UUID that is guaranteed not to exist in the database
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve a category with the non-existent ID
  // This should throw an error indicating the category was not found
  await TestValidator.error(
    "should fail when retrieving category with non-existent ID",
    async () => {
      await api.functional.discussionBoard.categories.at(connection, {
        categoryId: nonExistentCategoryId,
      });
    },
  );
}
