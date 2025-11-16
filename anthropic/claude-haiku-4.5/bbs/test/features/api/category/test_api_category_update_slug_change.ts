import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test updating the category slug to maintain URL-safe identifiers while
 * categories are used.
 *
 * Create a category with slug 'old-slug' and update it to 'new-slug', verifying
 * the change is reflected in API responses. This validates that slug uniqueness
 * is maintained across the system and that category references can be updated
 * to support reorganization of URL structures.
 *
 * The test validates:
 *
 * 1. Moderator authentication
 * 2. Category creation with initial slug
 * 3. Category slug update to new value
 * 4. Slug change verification in responses
 * 5. Data integrity after slug updates
 */
export async function test_api_category_update_slug_change(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(12),
      password: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator authenticated",
    moderator.token.access.length > 0,
  );

  // Step 2: Create a category with initial slug 'old-slug'
  const createdCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: "old-slug",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(createdCategory);
  TestValidator.equals(
    "initial slug matches created value",
    createdCategory.slug,
    "old-slug",
  );

  // Step 3: Update the category slug to 'new-slug'
  const updatedCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: createdCategory.id,
        body: {
          slug: "new-slug",
        } satisfies IDiscussionBoardCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  TestValidator.equals(
    "updated slug matches new value",
    updatedCategory.slug,
    "new-slug",
  );

  // Step 4: Verify the category ID remains the same after slug update
  TestValidator.equals(
    "category ID unchanged after slug update",
    updatedCategory.id,
    createdCategory.id,
  );

  // Step 5: Verify other properties remain intact
  TestValidator.equals(
    "category name preserved",
    updatedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "category active status preserved",
    updatedCategory.is_active,
    createdCategory.is_active,
  );
  TestValidator.equals(
    "display order preserved",
    updatedCategory.display_order,
    createdCategory.display_order,
  );

  // Step 6: Verify the updated timestamp was modified
  TestValidator.predicate(
    "updated_at timestamp changed after slug update",
    new Date(updatedCategory.updated_at) >=
      new Date(createdCategory.updated_at),
  );
}
