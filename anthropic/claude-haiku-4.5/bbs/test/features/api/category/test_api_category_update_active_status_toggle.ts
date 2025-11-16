import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test toggling category active status to manage category availability.
 *
 * This test validates that administrators can toggle a category's active status
 * to retire unused categories without deletion and restore them when needed.
 * The test covers the complete workflow:
 *
 * 1. Authenticate as moderator
 * 2. Create a new active category
 * 3. Update it to inactive state
 * 4. Update it back to active state
 * 5. Verify status changes are reflected correctly
 *
 * This ensures that category availability management maintains discussion
 * continuity for articles in archived categories.
 */
export async function test_api_category_update_active_status_toggle(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator for category management authorization
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

  // 2. Create a new discussion board category with active status
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);

  // 3. Verify the created category is active
  TestValidator.equals(
    "created category should be active",
    createdCategory.is_active,
    true,
  );
  TestValidator.equals(
    "category name should match input",
    createdCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category slug should match input",
    createdCategory.slug,
    categoryData.slug,
  );

  // 4. Update the category to inactive state
  const inactiveUpdate = {
    is_active: false,
  } satisfies IDiscussionBoardCategory.IUpdate;

  const inactiveCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: createdCategory.id,
        body: inactiveUpdate,
      },
    );
  typia.assert(inactiveCategory);

  // 5. Verify the category is now inactive
  TestValidator.equals(
    "updated category should be inactive",
    inactiveCategory.is_active,
    false,
  );
  TestValidator.equals(
    "inactive category ID should remain same",
    inactiveCategory.id,
    createdCategory.id,
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    inactiveCategory.updated_at,
    createdCategory.updated_at,
  );

  // 6. Update the category back to active state
  const activeUpdate = {
    is_active: true,
  } satisfies IDiscussionBoardCategory.IUpdate;

  const reactivatedCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: inactiveCategory.id,
        body: activeUpdate,
      },
    );
  typia.assert(reactivatedCategory);

  // 7. Verify the category is active again
  TestValidator.equals(
    "reactivated category should be active",
    reactivatedCategory.is_active,
    true,
  );
  TestValidator.equals(
    "reactivated category ID should remain same",
    reactivatedCategory.id,
    createdCategory.id,
  );
  TestValidator.notEquals(
    "updated_at should change again after reactivation",
    reactivatedCategory.updated_at,
    inactiveCategory.updated_at,
  );

  // 8. Verify the status toggle sequence was completed successfully
  TestValidator.predicate(
    "category active status toggled from true to false to true",
    createdCategory.is_active === true &&
      inactiveCategory.is_active === false &&
      reactivatedCategory.is_active === true,
  );
}
