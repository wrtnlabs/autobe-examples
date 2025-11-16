import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that newly created discussion board categories initialize article_count
 * to zero.
 *
 * This test validates that when a new category is created in the discussion
 * board system, the denormalized article_count field is properly initialized to
 * 0. This ensures that the system correctly tracks the number of published
 * articles in each category from the moment of creation, and provides accurate
 * counts for display purposes.
 *
 * The test flow:
 *
 * 1. Create a moderator account to authenticate for category creation
 * 2. Create a new discussion board category with required information
 * 3. Verify that the created category has article_count initialized to 0
 * 4. Validate the category response structure and all expected fields
 */
export async function test_api_category_creation_initializes_article_count(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a new discussion board category
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphabets(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Step 3: Verify that article_count is initialized to 0
  TestValidator.equals(
    "article_count should be initialized to 0",
    createdCategory.article_count,
    0,
  );

  // Step 4: Validate other category properties
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category slug matches input",
    createdCategory.slug,
    categoryData.slug,
  );
  TestValidator.equals(
    "category is_active matches input",
    createdCategory.is_active,
    categoryData.is_active,
  );
  TestValidator.equals(
    "category display_order matches input",
    createdCategory.display_order,
    categoryData.display_order,
  );
}
