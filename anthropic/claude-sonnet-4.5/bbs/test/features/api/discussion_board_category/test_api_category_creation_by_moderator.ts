import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the complete workflow of creating a new article category as a moderator.
 *
 * This test validates that moderators can successfully create categories for
 * organizing economic and political discussion topics. The workflow includes
 * moderator registration, authentication, category creation, and validation of
 * the created category structure.
 *
 * Steps:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Create a new category with unique name and description
 * 3. Validate the category response structure and auto-generated fields
 * 4. Verify business logic (name and description matching)
 */
export async function test_api_category_creation_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });

  // Validate moderator creation response
  typia.assert(moderator);
  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    moderatorData.username,
  );
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorData.email,
  );

  // Step 2: Create a new category using the moderator's authentication
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );

  // Step 3: Validate the category response structure
  typia.assert(category);

  // Step 4: Verify business logic - name and description match input
  TestValidator.equals(
    "category name matches input",
    category.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category description matches input",
    category.description,
    categoryData.description,
  );
}
