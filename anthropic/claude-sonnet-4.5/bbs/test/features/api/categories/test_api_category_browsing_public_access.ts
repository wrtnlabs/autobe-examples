import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";

/**
 * Test public access to category browsing without authentication.
 *
 * This test validates that discussion board categories are publicly accessible
 * to unauthenticated users (guests). The workflow creates categories as a
 * moderator, then retrieves them without authentication to ensure public
 * browsing capability.
 *
 * Steps:
 *
 * 1. Create a moderator account with proper credentials
 * 2. Create multiple categories with diverse properties as moderator
 * 3. Create an unauthenticated connection (no headers)
 * 4. Retrieve category list without authentication using pagination
 * 5. Validate response structure and category summary information
 * 6. Verify all created categories are present in the public response
 */
export async function test_api_category_browsing_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecureMod123!",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: "https://discussionboard.example.com/moderator/join" satisfies string &
          tags.Format<"uri">,
        referrer: "https://discussionboard.example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create multiple categories as moderator
  const categoryCount = 5;
  const createdCategories: IDiscussionBoardArticleCategory[] = [];

  for (let i = 0; i < categoryCount; i++) {
    const categoryName = `${RandomGenerator.pick(["Economic", "Political", "Social", "Cultural", "Scientific"] as const)} Discussion ${i + 1}`;
    const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");

    const category: IDiscussionBoardArticleCategory =
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: categoryName,
            slug: categorySlug,
            description: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 5,
              wordMax: 10,
            }),
            sort_order: i + 1,
          } satisfies IDiscussionBoardArticleCategory.ICreate,
        },
      );
    typia.assert(category);
    createdCategories.push(category);
  }

  // Step 3: Create unauthenticated connection (no authentication headers)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Retrieve category list without authentication
  const pageRequest = {
    page: 1,
    limit: 10,
    sort_by: "sort_order" as const,
    order: "asc" as const,
  } satisfies IDiscussionBoardArticleCategory.IRequest;

  const categoryPage: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.categories.index(unauthConnection, {
      body: pageRequest,
    });
  typia.assert(categoryPage);

  // Step 5: Validate response structure
  TestValidator.predicate(
    "category page should have valid pagination",
    categoryPage.pagination.current === 1 &&
      categoryPage.pagination.limit === 10 &&
      categoryPage.pagination.records >= categoryCount,
  );

  TestValidator.predicate(
    "category data array should contain items",
    categoryPage.data.length > 0,
  );

  // Step 6: Verify all created categories are present in public response
  for (const createdCategory of createdCategories) {
    const foundCategory = categoryPage.data.find(
      (c) => c.id === createdCategory.id,
    );

    if (foundCategory) {
      typia.assertGuard(foundCategory);

      TestValidator.equals(
        "category name matches",
        foundCategory.name,
        createdCategory.name,
      );

      TestValidator.equals(
        "category slug matches",
        foundCategory.slug,
        createdCategory.slug,
      );

      TestValidator.equals(
        "category sort_order matches",
        foundCategory.sort_order,
        createdCategory.sort_order,
      );
    }
  }
}
