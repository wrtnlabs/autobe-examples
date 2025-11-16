import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test reorganizing category display order in navigation menus.
 *
 * This test validates that moderators can reorganize categories by updating
 * their display_order values. The display_order field controls how categories
 * appear in navigation menus and category listings, with lower numbers
 * appearing first.
 *
 * The test workflow:
 *
 * 1. Register a moderator account for category management
 * 2. Create three categories with initial display orders (1, 2, 3)
 * 3. Update the first category's display order from 1 to 3
 * 4. Verify the updated category reflects the new display order
 * 5. Confirm that display order changes persist correctly
 */
export async function test_api_category_update_display_order(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(12),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create three categories with different display orders
  const category1: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economics",
          slug: "economics",
          description: "Economics discussion category",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category1);
  TestValidator.equals(
    "first category has display_order 1",
    category1.display_order,
    1,
  );

  const category2: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Politics",
          slug: "politics",
          description: "Politics discussion category",
          display_order: 2,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category2);
  TestValidator.equals(
    "second category has display_order 2",
    category2.display_order,
    2,
  );

  const category3: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Policy",
          slug: "economic-policy",
          description: "Economic policy discussion category",
          display_order: 3,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category3);
  TestValidator.equals(
    "third category has display_order 3",
    category3.display_order,
    3,
  );

  // Step 3: Update the first category's display order from 1 to 3
  const updatedCategory1: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: category1.id,
        body: {
          display_order: 3,
        } satisfies IDiscussionBoardCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory1);

  // Step 4: Verify the updated category reflects the new display order
  TestValidator.equals(
    "first category display_order updated to 3",
    updatedCategory1.display_order,
    3,
  );

  // Verify other properties remain unchanged
  TestValidator.equals(
    "category name unchanged after update",
    updatedCategory1.name,
    category1.name,
  );
  TestValidator.equals(
    "category slug unchanged after update",
    updatedCategory1.slug,
    category1.slug,
  );
  TestValidator.equals(
    "category is_active unchanged after update",
    updatedCategory1.is_active,
    category1.is_active,
  );

  // Verify the updated timestamp reflects the change
  TestValidator.predicate(
    "updated_at timestamp is after created_at",
    new Date(updatedCategory1.updated_at) >= new Date(category1.created_at),
  );
}
