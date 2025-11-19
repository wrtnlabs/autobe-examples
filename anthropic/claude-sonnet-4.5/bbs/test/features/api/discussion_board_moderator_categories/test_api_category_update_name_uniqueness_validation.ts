import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category name uniqueness constraint during update operations.
 *
 * This test validates that the category update operation properly enforces name
 * uniqueness constraints. The test scenario involves:
 *
 * 1. Moderator Authentication: Register and authenticate as a moderator to gain
 *    permissions for category management operations
 * 2. Create First Category: Create a category with name 'Economic Discussion' to
 *    establish an existing category name in the system
 * 3. Create Second Category: Create another category with name 'Political
 *    Discussion' to have a target category for update testing
 * 4. Attempt Invalid Update: Try to update the second category's name to 'Economic
 *    Discussion' (which conflicts with the first category's name), expecting
 *    this operation to fail with an error due to uniqueness constraint
 *    violation
 * 5. Perform Valid Update: Successfully update the second category's name to
 *    'Political Analysis' (a unique name that doesn't conflict), verifying that
 *    valid updates work correctly
 * 6. Verify Final State: Retrieve the updated category and confirm that its name
 *    has been changed to 'Political Analysis'
 *
 * This comprehensive test ensures the system correctly prevents duplicate
 * category names during updates while allowing valid name changes.
 */
export async function test_api_category_update_name_uniqueness_validation(
  connection: api.IConnection,
) {
  // Step 1: Moderator Authentication
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(2),
        ip: "127.0.0.1",
        href: "https://example.com/register" as string & tags.Format<"uri">,
        referrer: "https://example.com" as string & tags.Format<"uri">,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create First Category with name 'Economic Discussion'
  const firstCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description:
            "Discussions about economic policies, markets, and fiscal topics",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(firstCategory);
  TestValidator.equals(
    "first category name",
    firstCategory.name,
    "Economic Discussion",
  );

  // Step 3: Create Second Category with name 'Political Discussion'
  const secondCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Discussion",
          slug: "political-discussion",
          description:
            "Discussions about governance, elections, and political systems",
          sort_order: 2,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(secondCategory);
  TestValidator.equals(
    "second category name",
    secondCategory.name,
    "Political Discussion",
  );

  // Step 4: Attempt Invalid Update - try to update second category name to conflict with first
  await TestValidator.error("duplicate category name should fail", async () => {
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: secondCategory.id,
        body: {
          name: "Economic Discussion",
        } satisfies IDiscussionBoardArticleCategory.IUpdate,
      },
    );
  });

  // Step 5: Perform Valid Update - update second category to a unique name
  const updatedCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: secondCategory.id,
        body: {
          name: "Political Analysis",
        } satisfies IDiscussionBoardArticleCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 6: Verify Final State
  TestValidator.equals(
    "updated category id matches",
    updatedCategory.id,
    secondCategory.id,
  );
  TestValidator.equals(
    "updated category name",
    updatedCategory.name,
    "Political Analysis",
  );
  TestValidator.predicate(
    "updated_at timestamp changed",
    new Date(updatedCategory.updated_at).getTime() >
      new Date(secondCategory.updated_at).getTime(),
  );
}
