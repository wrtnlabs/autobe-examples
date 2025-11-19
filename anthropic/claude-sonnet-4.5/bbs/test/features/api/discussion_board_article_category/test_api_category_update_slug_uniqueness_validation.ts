import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category slug uniqueness constraint during update operations.
 *
 * This test validates that the discussion board system enforces slug uniqueness
 * across all article categories when performing update operations. Category
 * slugs are used in URL routing and must be unique to prevent conflicts.
 *
 * Test workflow:
 *
 * 1. Authenticate as moderator with category management privileges
 * 2. Create first category with slug "economic-discussion"
 * 3. Create second category with slug "political-discussion"
 * 4. Attempt to update second category's slug to "economic-discussion" (must fail)
 * 5. Update second category's slug to "political-analysis" (must succeed)
 * 6. Verify successful update by validating response data
 */
export async function test_api_category_update_slug_uniqueness_validation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "https://discussion-board.example.com/moderator/signup",
        referrer: "https://discussion-board.example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create first category with slug "economic-discussion"
  const firstCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description:
            "Discussions about economic policy, markets, and fiscal topics",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(firstCategory);
  TestValidator.equals(
    "first category slug",
    firstCategory.slug,
    "economic-discussion",
  );

  // Step 3: Create second category with slug "political-discussion"
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
    "second category slug",
    secondCategory.slug,
    "political-discussion",
  );

  // Step 4: Attempt to update second category's slug to conflict with first category
  await TestValidator.error(
    "updating category slug to duplicate value should fail",
    async () => {
      await api.functional.discussionBoard.moderator.categories.update(
        connection,
        {
          categoryId: secondCategory.id,
          body: {
            slug: "economic-discussion",
          } satisfies IDiscussionBoardArticleCategory.IUpdate,
        },
      );
    },
  );

  // Step 5: Update second category's slug to unique value "political-analysis"
  const updatedCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: secondCategory.id,
        body: {
          slug: "political-analysis",
        } satisfies IDiscussionBoardArticleCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 6: Verify successful update
  TestValidator.equals(
    "updated category id unchanged",
    updatedCategory.id,
    secondCategory.id,
  );
  TestValidator.equals(
    "updated category slug",
    updatedCategory.slug,
    "political-analysis",
  );
  TestValidator.equals(
    "category name unchanged",
    updatedCategory.name,
    secondCategory.name,
  );
  TestValidator.equals(
    "category description unchanged",
    updatedCategory.description,
    secondCategory.description,
  );
  TestValidator.equals(
    "category sort order unchanged",
    updatedCategory.sort_order,
    secondCategory.sort_order,
  );
}
