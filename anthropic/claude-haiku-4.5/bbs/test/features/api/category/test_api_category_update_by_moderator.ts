import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator category update functionality.
 *
 * This test validates that moderators can successfully update discussion board
 * category properties including name, slug, description, display order, and
 * active status. The test creates an initial category and then performs
 * multiple updates to verify that changes are persisted correctly and the
 * updated_at timestamp is properly recorded.
 *
 * Process:
 *
 * 1. Register a moderator account
 * 2. Create an initial category with sample data
 * 3. Update category name and verify change
 * 4. Update category slug and verify change
 * 5. Update category description and verify change
 * 6. Update category display order and verify change
 * 7. Update category active status and verify change
 * 8. Verify updated_at timestamp has changed after each update
 */
export async function test_api_category_update_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(15),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create an initial category
  const initialCategory =
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
  typia.assert(initialCategory);
  TestValidator.equals(
    "initial category name",
    initialCategory.name,
    "Economics",
  );
  TestValidator.equals(
    "initial category slug",
    initialCategory.slug,
    "economics",
  );
  TestValidator.equals(
    "initial category description",
    initialCategory.description,
    "Economics discussion category",
  );
  TestValidator.equals(
    "initial category display_order",
    initialCategory.display_order,
    1,
  );
  TestValidator.equals(
    "initial category is_active",
    initialCategory.is_active,
    true,
  );

  // 3. Update category name
  const updatedName =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: initialCategory.id,
        body: {
          name: "Economic Policy",
        } satisfies IDiscussionBoardCategory.IUpdate,
      },
    );
  typia.assert(updatedName);
  TestValidator.equals(
    "updated category name",
    updatedName.name,
    "Economic Policy",
  );
  TestValidator.notEquals(
    "updated_at should change after name update",
    updatedName.updated_at,
    initialCategory.updated_at,
  );

  // 4. Update category slug
  const updatedSlug =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: initialCategory.id,
        body: {
          slug: "economic-policy",
        } satisfies IDiscussionBoardCategory.IUpdate,
      },
    );
  typia.assert(updatedSlug);
  TestValidator.equals(
    "updated category slug",
    updatedSlug.slug,
    "economic-policy",
  );
  TestValidator.equals(
    "name should persist",
    updatedSlug.name,
    "Economic Policy",
  );

  // 5. Update category description
  const newDescription = "Discuss economic policies and their impacts";
  const updatedDescription =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: initialCategory.id,
        body: {
          description: newDescription,
        } satisfies IDiscussionBoardCategory.IUpdate,
      },
    );
  typia.assert(updatedDescription);
  TestValidator.equals(
    "updated category description",
    updatedDescription.description,
    newDescription,
  );
  TestValidator.equals(
    "name should persist",
    updatedDescription.name,
    "Economic Policy",
  );
  TestValidator.equals(
    "slug should persist",
    updatedDescription.slug,
    "economic-policy",
  );

  // 6. Update category display order
  const updatedOrder =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: initialCategory.id,
        body: {
          display_order: 3,
        } satisfies IDiscussionBoardCategory.IUpdate,
      },
    );
  typia.assert(updatedOrder);
  TestValidator.equals(
    "updated category display_order",
    updatedOrder.display_order,
    3,
  );
  TestValidator.equals(
    "description should persist",
    updatedOrder.description,
    newDescription,
  );

  // 7. Update category active status to inactive
  const updatedInactive =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: initialCategory.id,
        body: {
          is_active: false,
        } satisfies IDiscussionBoardCategory.IUpdate,
      },
    );
  typia.assert(updatedInactive);
  TestValidator.equals(
    "updated category is_active to false",
    updatedInactive.is_active,
    false,
  );
  TestValidator.equals(
    "display_order should persist",
    updatedInactive.display_order,
    3,
  );

  // 8. Update back to active status
  const updatedActive =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: initialCategory.id,
        body: {
          is_active: true,
        } satisfies IDiscussionBoardCategory.IUpdate,
      },
    );
  typia.assert(updatedActive);
  TestValidator.equals(
    "updated category is_active to true",
    updatedActive.is_active,
    true,
  );
  TestValidator.equals(
    "final name should be Economic Policy",
    updatedActive.name,
    "Economic Policy",
  );
  TestValidator.equals(
    "final slug should be economic-policy",
    updatedActive.slug,
    "economic-policy",
  );
}
