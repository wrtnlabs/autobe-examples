import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validates timestamp behavior when updating discussion board categories.
 *
 * Tests that the updated_at timestamp is correctly updated when category
 * properties change, while created_at remains immutable. This ensures proper
 * audit trail capability and timestamp accuracy for change tracking.
 *
 * Process:
 *
 * 1. Register a moderator to obtain authentication credentials
 * 2. Create a new category and record its initial timestamps
 * 3. Wait a brief interval to ensure time progression
 * 4. Update the category with new property values
 * 5. Verify that updated_at reflects the new modification time
 * 6. Confirm that created_at remains unchanged
 * 7. Validate the updated category properties
 */
export async function test_api_category_update_timestamp_behavior(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a new category
  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Record the initial timestamps
  const initialCreatedAt: string = createdCategory.created_at;
  const initialUpdatedAt: string = createdCategory.updated_at;

  // Verify that created_at and updated_at are the same initially
  TestValidator.equals(
    "initial created_at and updated_at should be equal",
    initialCreatedAt,
    initialUpdatedAt,
  );

  // Step 3: Wait a brief interval to ensure time progression
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Step 4: Update the category with new property values
  const updatedCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: createdCategory.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: 2,
        } satisfies IDiscussionBoardCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 5: Verify that updated_at reflects the new modification time
  TestValidator.notEquals(
    "updated_at should be different after update",
    initialUpdatedAt,
    updatedCategory.updated_at,
  );

  // Step 6: Confirm that created_at remains unchanged
  TestValidator.equals(
    "created_at should remain unchanged after update",
    initialCreatedAt,
    updatedCategory.created_at,
  );

  // Step 7: Validate the updated category properties
  TestValidator.equals(
    "category id should match",
    createdCategory.id,
    updatedCategory.id,
  );

  TestValidator.predicate(
    "updated_at should be greater than initial updated_at",
    new Date(updatedCategory.updated_at).getTime() >
      new Date(initialUpdatedAt).getTime(),
  );

  TestValidator.predicate(
    "is_active should be true",
    updatedCategory.is_active === true,
  );
}
