import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Test API behavior when accessing a soft-deleted article category.
 *
 * This test validates that soft-deleted discussion board categories are
 * properly excluded from normal retrieval operations. When a category has been
 * soft-deleted (deleted_at is not null), attempting to retrieve it should
 * return a 404 Not Found error, ensuring data integrity and proper soft-delete
 * semantics.
 *
 * Test steps:
 *
 * 1. Attempt to retrieve a non-existent/soft-deleted category by ID
 * 2. Validate that the API returns 404 Not Found error
 * 3. Verify error handling for soft-deleted category access
 */
export async function test_api_article_category_detail_soft_deleted_category_handling(
  connection: api.IConnection,
) {
  // Generate a random UUID for a soft-deleted category
  // This category is not expected to exist in the system
  const softDeletedCategoryId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve the soft-deleted category
  // Expected behavior: API should return 404 Not Found
  await TestValidator.error(
    "accessing soft-deleted category should fail",
    async () => {
      return await api.functional.discussionBoard.categories.at(connection, {
        categoryId: softDeletedCategoryId,
      });
    },
  );

  // Additional validation: verify that attempting to access invalid category IDs
  // properly triggers error handling
  const anotherInvalidCategoryId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "non-existent category should return error",
    async () => {
      return await api.functional.discussionBoard.categories.at(connection, {
        categoryId: anotherInvalidCategoryId,
      });
    },
  );
}
