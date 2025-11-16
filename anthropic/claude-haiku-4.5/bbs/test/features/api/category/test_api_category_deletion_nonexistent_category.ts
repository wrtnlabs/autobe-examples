import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test deletion of a non-existent category.
 *
 * This test validates that the API properly handles attempts to delete
 * categories that do not exist in the system. It verifies error handling by
 * attempting to delete a category using a non-existent UUID, ensuring the API
 * returns an appropriate error response rather than silently succeeding or
 * crashing.
 *
 * Steps:
 *
 * 1. Register a moderator account for authorization
 * 2. Attempt to delete a category using a non-existent/invalid category ID
 * 3. Verify that an error is thrown indicating the category cannot be found
 */
export async function test_api_category_deletion_nonexistent_category(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account to obtain authorization
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "SecurePassword123!",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2 & 3: Attempt to delete a non-existent category and verify error
  const nonExistentCategoryId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "deletion of non-existent category should throw error",
    async () => {
      await api.functional.discussionBoard.moderator.categories.erase(
        connection,
        {
          categoryId: nonExistentCategoryId,
        },
      );
    },
  );
}
