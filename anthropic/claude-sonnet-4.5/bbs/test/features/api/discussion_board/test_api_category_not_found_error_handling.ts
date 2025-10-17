import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test error handling when requesting a non-existent discussion board category.
 *
 * This test validates that the API properly handles requests for categories
 * that do not exist in the system. It verifies the error handling mechanism by
 * attempting to retrieve a category using a randomly generated UUID that is
 * guaranteed not to exist in the database.
 *
 * Test workflow:
 *
 * 1. Generate a random UUID that represents a non-existent category
 * 2. Attempt to retrieve the category using the API endpoint
 * 3. Verify that the API returns an appropriate error response
 *
 * This test ensures robust error handling for category retrieval operations,
 * providing clear feedback when users attempt to access non-existent
 * categories.
 */
export async function test_api_category_not_found_error_handling(
  connection: api.IConnection,
) {
  // Generate a random UUID that does not exist in the system
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  // Verify that requesting a non-existent category returns an error
  await TestValidator.error(
    "should return error for non-existent category",
    async () => {
      await api.functional.discussionBoard.categories.at(connection, {
        categoryId: nonExistentCategoryId,
      });
    },
  );
}
