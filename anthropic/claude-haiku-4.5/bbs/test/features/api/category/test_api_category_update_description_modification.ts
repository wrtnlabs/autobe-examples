import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test updating category descriptions to clarify category purpose or scope.
 *
 * This test validates the complete lifecycle of category description
 * management:
 *
 * 1. Register a moderator account to enable category management operations
 * 2. Create a category initially without a description (null/undefined)
 * 3. Add a detailed description to the category
 * 4. Update the description to a different value
 * 5. Clear the description back to null
 *
 * Ensures that description updates are properly persisted, null values are
 * correctly handled as empty optional fields, and update operations maintain
 * data integrity throughout the modification sequence.
 */
export async function test_api_category_update_description_modification(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account for category management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphabets(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a category without description (null)
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categorySlug = RandomGenerator.alphabets(10);

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: null,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  TestValidator.predicate(
    "category created with null description",
    createdCategory.description === null ||
      createdCategory.description === undefined,
  );

  // Step 3: Add detailed description to the category
  const detailedDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 5,
  });

  const categoryWithDescription: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: createdCategory.id,
        body: {
          description: detailedDescription,
        } satisfies IDiscussionBoardCategory.IUpdate,
      },
    );
  typia.assert(categoryWithDescription);

  TestValidator.equals(
    "description added to category",
    categoryWithDescription.description,
    detailedDescription,
  );

  // Step 4: Update description to a different value
  const updatedDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 4,
  });

  const categoryWithUpdatedDescription: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: createdCategory.id,
        body: {
          description: updatedDescription,
        } satisfies IDiscussionBoardCategory.IUpdate,
      },
    );
  typia.assert(categoryWithUpdatedDescription);

  TestValidator.equals(
    "description updated to new value",
    categoryWithUpdatedDescription.description,
    updatedDescription,
  );

  TestValidator.notEquals(
    "updated description differs from previous",
    categoryWithUpdatedDescription.description,
    detailedDescription,
  );

  // Step 5: Clear description back to null
  const categoryWithClearedDescription: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: createdCategory.id,
        body: {
          description: null,
        } satisfies IDiscussionBoardCategory.IUpdate,
      },
    );
  typia.assert(categoryWithClearedDescription);

  TestValidator.predicate(
    "description cleared to null",
    categoryWithClearedDescription.description === null ||
      categoryWithClearedDescription.description === undefined,
  );

  // Verify final state maintains category integrity
  TestValidator.equals(
    "category id remains unchanged",
    categoryWithClearedDescription.id,
    createdCategory.id,
  );

  TestValidator.equals(
    "category name unchanged after description updates",
    categoryWithClearedDescription.name,
    createdCategory.name,
  );
}
