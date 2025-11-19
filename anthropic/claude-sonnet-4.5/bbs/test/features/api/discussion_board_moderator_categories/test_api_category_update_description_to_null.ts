import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test updating a category description to null to remove explanatory text.
 *
 * This test validates that moderators can successfully clear a category's
 * description field by setting it to null, which is useful for removing
 * outdated guidance or simplifying category listings.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator for category modification privileges
 * 2. Create a category with an initial description value
 * 3. Update the category setting description explicitly to null
 * 4. Verify the update succeeds and description is now null
 * 5. Confirm other category fields remain unchanged
 */
export async function test_api_category_update_description_to_null(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create category with initial description
  const initialDescription =
    "Topics covering economic policy and fiscal matters";
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: initialDescription,
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Verify initial description is set
  TestValidator.equals(
    "initial description matches",
    category.description,
    initialDescription,
  );

  // Step 3: Update category setting description to null
  const updatedCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: category.id,
        body: {
          description: null,
        } satisfies IDiscussionBoardArticleCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 4: Verify description is now null
  TestValidator.equals(
    "description is now null",
    updatedCategory.description,
    null,
  );

  // Step 5: Verify other fields remain unchanged
  TestValidator.equals(
    "category id unchanged",
    updatedCategory.id,
    category.id,
  );
  TestValidator.equals(
    "category name unchanged",
    updatedCategory.name,
    category.name,
  );
  TestValidator.equals(
    "category slug unchanged",
    updatedCategory.slug,
    category.slug,
  );
  TestValidator.equals(
    "sort order unchanged",
    updatedCategory.sort_order,
    category.sort_order,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedCategory.created_at,
    category.created_at,
  );

  // Verify updated_at has changed (was modified)
  TestValidator.predicate(
    "updated_at timestamp has changed",
    updatedCategory.updated_at !== category.updated_at,
  );
}
