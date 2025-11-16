import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category name validation constraints.
 *
 * This test validates that the category creation endpoint properly enforces
 * name field constraints. The name field is a required string with minLength 1
 * and maxLength 255 characters. This test ensures:
 *
 * 1. Empty names (length < 1) are rejected
 * 2. Excessively long names (length > 255) are rejected
 * 3. Valid names with special and unicode characters are accepted
 * 4. Valid standard names are accepted
 *
 * Categories are fundamental organizational structures in the discussion board
 * system. The name field is the primary display identifier for users browsing
 * and selecting categories. Proper name validation ensures data quality and
 * system stability.
 *
 * Test flow:
 *
 * 1. Authenticate moderator account
 * 2. Attempt category creation with empty name (should fail)
 * 3. Attempt category creation with excessively long name (should fail)
 * 4. Create category with valid name containing special characters (should
 *    succeed)
 * 5. Create category with valid unicode name (should succeed)
 * 6. Create category with valid standard name (should succeed)
 * 7. Verify successful categories were created with correct data
 */
export async function test_api_category_creation_invalid_name(
  connection: api.IConnection,
) {
  // Step 1: Authenticate moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test empty name validation - should fail
  await TestValidator.error(
    "empty category name should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: "",
            slug: RandomGenerator.alphabets(10),
            display_order: 1,
            is_active: true,
          } satisfies IDiscussionBoardCategory.ICreate,
        },
      );
    },
  );

  // Step 3: Test excessively long name validation - should fail
  const longName = RandomGenerator.alphabets(256);
  await TestValidator.error(
    "excessively long category name should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: longName,
            slug: RandomGenerator.alphabets(10),
            display_order: 2,
            is_active: true,
          } satisfies IDiscussionBoardCategory.ICreate,
        },
      );
    },
  );

  // Step 4: Create category with valid name containing special characters - should succeed
  const specialCharName = "Economic Policy & Analysis!";
  const specialCharCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: specialCharName,
          slug: "economic-policy-analysis",
          display_order: 3,
          is_active: true,
          description: "Category for economic policies",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(specialCharCategory);
  TestValidator.equals(
    "special character category name matches input",
    specialCharCategory.name,
    specialCharName,
  );

  // Step 5: Create category with valid unicode name - should succeed
  const unicodeName = "政治分析 Politics";
  const unicodeCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: unicodeName,
          slug: "unicode-category",
          display_order: 4,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(unicodeCategory);
  TestValidator.equals(
    "unicode category name matches input",
    unicodeCategory.name,
    unicodeName,
  );

  // Step 6: Create category with valid standard name - should succeed
  const standardName = "Economics";
  const standardCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: standardName,
          slug: "economics",
          display_order: 5,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(standardCategory);
  TestValidator.equals(
    "standard category name matches input",
    standardCategory.name,
    standardName,
  );
}
