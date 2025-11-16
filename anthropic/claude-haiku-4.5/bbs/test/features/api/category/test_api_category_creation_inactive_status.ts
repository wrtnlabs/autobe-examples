import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category creation with is_active=false to validate inactive category
 * lifecycle management.
 *
 * This test verifies that moderators can create inactive categories to retire
 * unused categories without data loss. The system should persist inactive
 * categories and preserve their is_active=false status, allowing category
 * hierarchy to be managed through activation/deactivation rather than
 * deletion.
 *
 * Test flow:
 *
 * 1. Authenticate moderator account via join endpoint
 * 2. Create an inactive category (is_active=false)
 * 3. Validate the response contains the created category with is_active=false
 * 4. Verify all category properties are correctly set
 */
export async function test_api_category_creation_inactive_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(15),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should be authenticated with valid token",
    moderator.token.access.length > 0,
  );

  // Step 2: Create inactive category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    display_order: 1,
    is_active: false,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Validate inactive category was created with is_active=false
  TestValidator.equals(
    "created category should have is_active=false",
    createdCategory.is_active,
    false,
  );

  // Step 4: Verify all category properties
  TestValidator.equals(
    "category name should match request",
    createdCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category slug should match request",
    createdCategory.slug,
    categoryData.slug,
  );
  TestValidator.equals(
    "category display_order should match request",
    createdCategory.display_order,
    categoryData.display_order,
  );
  TestValidator.equals(
    "category description should match request",
    createdCategory.description,
    categoryData.description,
  );
  TestValidator.equals(
    "category article_count should initialize to 0",
    createdCategory.article_count,
    0,
  );

  // Step 5: Verify category has been assigned an id (UUID)
  TestValidator.predicate(
    "category should have been assigned a unique id",
    createdCategory.id.length > 0,
  );
}
