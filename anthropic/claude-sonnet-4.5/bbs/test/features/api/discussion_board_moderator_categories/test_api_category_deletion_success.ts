import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful deletion of an unused category by a moderator.
 *
 * This test validates the complete category deletion workflow for categories
 * that have no associated articles. It ensures that moderators can successfully
 * remove categories from the discussion board taxonomy when those categories
 * are no longer needed.
 *
 * Test Steps:
 *
 * 1. Register and authenticate as a moderator to obtain moderation privileges
 * 2. Create a new test category (General Discussion)
 * 3. Verify the category was created successfully
 * 4. Delete the category using its unique identifier
 * 5. Verify the deletion operation completes without errors
 *
 * This test confirms that the category management system properly handles
 * deletion operations for unused categories while maintaining referential
 * integrity constraints.
 */
export async function test_api_category_deletion_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
        display_name: RandomGenerator.name(2),
        ip: "192.168.1.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(moderator);

  // Step 2: Create a new category
  const categoryName = "General Discussion";
  const categorySlug = "general-discussion";
  const categoryDescription = "General topics";
  const categorySortOrder = 5;

  const createdCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: categoryDescription,
          sort_order: categorySortOrder,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );

  // Step 3: Verify the category was created successfully
  typia.assert(createdCategory);
  TestValidator.equals(
    "category name matches",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches",
    createdCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category description matches",
    createdCategory.description,
    categoryDescription,
  );
  TestValidator.equals(
    "category sort_order matches",
    createdCategory.sort_order,
    categorySortOrder,
  );

  // Step 4: Delete the category
  await api.functional.discussionBoard.moderator.categories.erase(connection, {
    categoryId: createdCategory.id,
  });

  // Step 5: Deletion succeeded (no error thrown)
  // If deletion failed, the erase operation would have thrown an error
}
