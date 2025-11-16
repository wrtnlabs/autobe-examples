import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category slug uniqueness constraint enforcement.
 *
 * Validates that the discussion board system enforces slug uniqueness across
 * all categories. The test creates a category with a specific slug and then
 * attempts to create a second category with the identical slug. The system must
 * reject the duplicate slug creation with an appropriate error.
 *
 * Steps:
 *
 * 1. Authenticate moderator account for category creation
 * 2. Create first category with slug 'economics'
 * 3. Attempt to create second category with same slug 'economics'
 * 4. Verify error occurs and slug uniqueness is enforced
 */
export async function test_api_category_creation_slug_uniqueness(
  connection: api.IConnection,
) {
  // Step 1: Authenticate moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(12),
        password: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create first category with slug 'economics'
  const firstCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economics",
          slug: "economics",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(firstCategory);
  TestValidator.equals("first category slug", firstCategory.slug, "economics");

  // Step 3: Attempt to create second category with same slug 'economics'
  // This should fail with an error due to slug uniqueness constraint
  await TestValidator.error("duplicate slug should be rejected", async () => {
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economics Second",
          slug: "economics",
          display_order: 2,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  });

  // Step 4: Verify that creating category with different slug succeeds
  const secondCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Politics",
          slug: "politics",
          display_order: 2,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(secondCategory);
  TestValidator.notEquals(
    "second category slug differs from first",
    secondCategory.slug,
    firstCategory.slug,
  );
}
