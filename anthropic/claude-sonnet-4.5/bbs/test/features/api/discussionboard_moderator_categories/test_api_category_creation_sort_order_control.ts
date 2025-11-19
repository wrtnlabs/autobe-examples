import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category creation with different sort_order values to validate display
 * priority control.
 *
 * This test ensures moderators can control the presentation order of categories
 * in selection dropdowns and browsing interfaces through the sort_order field.
 * The test creates multiple categories with different sort_order values (e.g.,
 * 1, 5, 10) and verifies each category is created successfully with the
 * specified sort_order preserved.
 *
 * Test workflow:
 *
 * 1. Authenticate as moderator to gain category creation privileges
 * 2. Create first category with sort_order = 1 (highest priority)
 * 3. Create second category with sort_order = 5 (medium priority)
 * 4. Create third category with sort_order = 10 (lower priority)
 * 5. Validate each category preserves its sort_order value exactly
 *
 * This confirms that administrators can prioritize category presentation based
 * on importance or popularity by assigning appropriate sort_order values.
 */
export async function test_api_category_creation_sort_order_control(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create first category with sort_order = 1 (highest priority)
  const category1 = {
    name: "Economic Discussion",
    slug: "economic-discussion",
    description:
      "Discussions about economic policy, markets, and fiscal topics",
    sort_order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const createdCategory1: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: category1,
      },
    );
  typia.assert(createdCategory1);

  // Validate category 1 sort_order
  TestValidator.equals(
    "category 1 sort_order should be 1",
    createdCategory1.sort_order,
    1,
  );
  TestValidator.equals(
    "category 1 name matches",
    createdCategory1.name,
    category1.name,
  );
  TestValidator.equals(
    "category 1 slug matches",
    createdCategory1.slug,
    category1.slug,
  );

  // Step 3: Create second category with sort_order = 5 (medium priority)
  const category2 = {
    name: "Political Discussion",
    slug: "political-discussion",
    description:
      "Discussions about governance, elections, and political systems",
    sort_order: 5,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const createdCategory2: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: category2,
      },
    );
  typia.assert(createdCategory2);

  // Validate category 2 sort_order
  TestValidator.equals(
    "category 2 sort_order should be 5",
    createdCategory2.sort_order,
    5,
  );
  TestValidator.equals(
    "category 2 name matches",
    createdCategory2.name,
    category2.name,
  );
  TestValidator.equals(
    "category 2 slug matches",
    createdCategory2.slug,
    category2.slug,
  );

  // Step 4: Create third category with sort_order = 10 (lower priority)
  const category3 = {
    name: "General Discussion",
    slug: "general-discussion",
    description: "General topics and community discussions",
    sort_order: 10,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const createdCategory3: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: category3,
      },
    );
  typia.assert(createdCategory3);

  // Validate category 3 sort_order
  TestValidator.equals(
    "category 3 sort_order should be 10",
    createdCategory3.sort_order,
    10,
  );
  TestValidator.equals(
    "category 3 name matches",
    createdCategory3.name,
    category3.name,
  );
  TestValidator.equals(
    "category 3 slug matches",
    createdCategory3.slug,
    category3.slug,
  );
}
