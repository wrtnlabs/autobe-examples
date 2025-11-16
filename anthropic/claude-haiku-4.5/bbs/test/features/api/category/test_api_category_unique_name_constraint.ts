import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that category names must be unique across the system.
 *
 * This test validates the unique name constraint for discussion board
 * categories. It creates categories with various name combinations to ensure:
 *
 * 1. Duplicate category names are rejected
 * 2. Case-sensitive uniqueness is enforced
 * 3. Partial name matches are allowed
 * 4. The uniqueness constraint is properly enforced at the API level
 *
 * Process:
 *
 * 1. Moderator authenticates to the system
 * 2. Create first category with name 'Science & Technology'
 * 3. Attempt to create second category with same name and verify error
 * 4. Test case sensitivity by creating 'science & technology' (lowercase)
 * 5. Test partial matches by creating 'Science' alone
 * 6. Verify all successful creations and proper error handling
 */
export async function test_api_category_unique_name_constraint(
  connection: api.IConnection,
) {
  // Step 1: Authenticate moderator
  const moderatorCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphabets(10),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authenticated: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(authenticated);

  // Step 2: Create first category with name 'Science & Technology'
  const firstCategoryCreate = {
    name: "Science & Technology",
    slug: "science-technology",
    display_order: 1,
    is_active: true,
    description: "Discussion about science and technology topics",
  } satisfies IDiscussionBoardCategory.ICreate;

  const firstCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: firstCategoryCreate,
      },
    );
  typia.assert(firstCategory);
  TestValidator.equals(
    "first category name matches",
    firstCategory.name,
    "Science & Technology",
  );

  // Step 3: Attempt to create duplicate category with same name
  await TestValidator.error(
    "duplicate category name should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: "Science & Technology",
            slug: "science-technology-2",
            display_order: 2,
            is_active: true,
          } satisfies IDiscussionBoardCategory.ICreate,
        },
      );
    },
  );

  // Step 4: Test case sensitivity - create 'science & technology' (lowercase)
  const lowercaseCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "science & technology",
          slug: "science-technology-lower",
          display_order: 3,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(lowercaseCategory);
  TestValidator.notEquals(
    "lowercase name is different from mixed case",
    lowercaseCategory.name,
    firstCategory.name,
  );

  // Step 5: Test partial name matches - create 'Science' alone
  const partialCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Science",
          slug: "science-only",
          display_order: 4,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(partialCategory);
  TestValidator.equals(
    "partial name is allowed",
    partialCategory.name,
    "Science",
  );

  // Step 6: Verify attempting duplicate of the lowercase variant also fails
  await TestValidator.error(
    "duplicate lowercase category name should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: "science & technology",
            slug: "science-technology-dup",
            display_order: 5,
            is_active: true,
          } satisfies IDiscussionBoardCategory.ICreate,
        },
      );
    },
  );
}
