import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that category creation enforces unique name constraint.
 *
 * Validates that the system prevents creation of duplicate categories with the
 * same name. This test ensures data integrity by verifying the unique
 * constraint on the name field in the discussion_board_categories table.
 *
 * Test workflow:
 *
 * 1. Create a moderator account for authentication
 * 2. Create a category with a specific name
 * 3. Attempt to create another category with the same name
 * 4. Verify that the second creation fails with an appropriate error
 * 5. Confirm that the first category was successfully created
 */
export async function test_api_category_creation_unique_name_constraint(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<100>
        >(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a category with a specific name
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const firstCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(firstCategory);
  TestValidator.equals("first category name", firstCategory.name, categoryName);

  // Step 3 & 4: Attempt to create another category with the same name and verify it fails
  await TestValidator.error("duplicate category name should fail", async () => {
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  });
}
