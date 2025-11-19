import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category creation with duplicate name to validate uniqueness constraint.
 *
 * This test ensures the system prevents creating multiple categories with the
 * same name, which would cause confusion in category identification and violate
 * database integrity constraints.
 *
 * Test workflow:
 *
 * 1. Authenticate as moderator to obtain category creation privileges
 * 2. Create initial category with a unique name successfully
 * 3. Attempt to create another category with the same name but different slug
 * 4. Verify the duplicate name attempt is rejected with an error
 */
export async function test_api_category_creation_duplicate_name(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create the first category successfully
  const categoryName = "Economic Discussion";
  const firstCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: "economic-discussion",
          description:
            "Category for economic policy, markets, and fiscal topics",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(firstCategory);

  // Validate the first category was created with correct data
  TestValidator.equals(
    "first category name matches",
    firstCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "first category slug matches",
    firstCategory.slug,
    "economic-discussion",
  );
  TestValidator.equals(
    "first category sort order",
    firstCategory.sort_order,
    1,
  );

  // Step 3: Attempt to create a second category with duplicate name but different slug
  await TestValidator.error(
    "duplicate category name should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: categoryName,
            slug: "economics-forum",
            description: "Another economic category with different slug",
            sort_order: 2,
          } satisfies IDiscussionBoardArticleCategory.ICreate,
        },
      );
    },
  );
}
