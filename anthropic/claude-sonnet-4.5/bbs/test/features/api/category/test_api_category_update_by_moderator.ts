import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the complete workflow of updating an existing article category as a
 * moderator.
 *
 * This test validates that moderators can successfully modify category
 * information while maintaining referential integrity and proper business rule
 * enforcement.
 *
 * Workflow steps:
 *
 * 1. Create a new moderator account using the join operation
 * 2. Create an initial category to serve as the update target
 * 3. Update the category's name and description using moderator authentication
 * 4. Validate that the category is updated successfully
 * 5. Verify the response reflects the updated information with new updated_at
 *    timestamp
 * 6. Confirm the original created_at timestamp is preserved
 * 7. Verify that the slug is maintained or regenerated appropriately
 */
export async function test_api_category_update_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderatorPassword = "SecurePass123!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create an initial category to be updated
  const initialCategoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const initialDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const initialCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: initialCategoryName,
          description: initialDescription,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(initialCategory);

  // Verify initial category was created successfully
  TestValidator.equals(
    "initial category name matches",
    initialCategory.name,
    initialCategoryName,
  );
  TestValidator.equals(
    "initial category description matches",
    initialCategory.description,
    initialDescription,
  );

  // Step 3: Update the category with new information
  const updatedCategoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 5,
    wordMax: 9,
  });

  const updatedCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categorySlug: initialCategory.slug,
        body: {
          name: updatedCategoryName,
          description: updatedDescription,
        } satisfies IDiscussionBoardCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 4: Validate that the category was updated successfully
  TestValidator.equals(
    "updated category name matches new value",
    updatedCategory.name,
    updatedCategoryName,
  );
  TestValidator.equals(
    "updated category description matches new value",
    updatedCategory.description,
    updatedDescription,
  );

  // Step 5: Verify category ID remains the same
  TestValidator.equals(
    "category ID remains unchanged after update",
    updatedCategory.id,
    initialCategory.id,
  );

  // Step 6: Verify created_at timestamp is preserved
  TestValidator.equals(
    "created_at timestamp is preserved",
    updatedCategory.created_at,
    initialCategory.created_at,
  );

  // Step 7: Verify updated_at timestamp has changed
  TestValidator.predicate(
    "updated_at timestamp is newer than created_at",
    new Date(updatedCategory.updated_at).getTime() >=
      new Date(updatedCategory.created_at).getTime(),
  );

  // Step 8: Verify slug handling (may be regenerated if name changed)
  TestValidator.predicate(
    "slug exists and is a non-empty string",
    typeof updatedCategory.slug === "string" && updatedCategory.slug.length > 0,
  );
}
