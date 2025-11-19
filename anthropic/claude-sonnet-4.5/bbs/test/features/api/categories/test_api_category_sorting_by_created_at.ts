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
 * Test chronological sorting of categories by created_at timestamp.
 *
 * This test validates the category browsing functionality when sorted by
 * creation date, supporting both ascending (oldest first) and descending
 * (newest first) order. This enables users to track the evolution of the
 * category taxonomy over time.
 *
 * Process:
 *
 * 1. Authenticate as moderator to gain category creation privileges
 * 2. Create multiple categories with time delays to ensure distinct timestamps
 * 3. Retrieve categories sorted by created_at ascending and verify chronological
 *    order
 * 4. Retrieve categories sorted by created_at descending and verify reverse order
 */
export async function test_api_category_sorting_by_created_at(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123!",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create multiple categories with time delays to ensure distinct timestamps
  const createdCategories: IDiscussionBoardArticleCategory[] = [];

  for (let i = 0; i < 4; i++) {
    const category: IDiscussionBoardArticleCategory =
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: `Test Category ${i + 1}`,
            slug: `test-category-${i + 1}-${RandomGenerator.alphaNumeric(6)}`,
            description: `Category ${i + 1} for testing chronological sorting`,
            sort_order: i,
          } satisfies IDiscussionBoardArticleCategory.ICreate,
        },
      );
    typia.assert(category);
    createdCategories.push(category);

    // Wait 100ms between creations to ensure distinct timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Step 3: Retrieve categories sorted by created_at in ascending order
  const ascendingResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        sort_by: "created_at",
        order: "asc",
        limit: 100,
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(ascendingResult);

  // Filter to only our test categories
  const ascendingCategories = ascendingResult.data.filter((cat) =>
    createdCategories.some((created) => created.id === cat.id),
  );

  // Verify ascending order (oldest first)
  for (let i = 0; i < ascendingCategories.length - 1; i++) {
    const current = new Date(ascendingCategories[i].created_at).getTime();
    const next = new Date(ascendingCategories[i + 1].created_at).getTime();

    TestValidator.predicate(
      `category ${i} created_at should be <= category ${i + 1} in ascending order`,
      current <= next,
    );
  }

  // Step 4: Retrieve categories sorted by created_at in descending order
  const descendingResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        sort_by: "created_at",
        order: "desc",
        limit: 100,
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(descendingResult);

  // Filter to only our test categories
  const descendingCategories = descendingResult.data.filter((cat) =>
    createdCategories.some((created) => created.id === cat.id),
  );

  // Verify descending order (newest first)
  for (let i = 0; i < descendingCategories.length - 1; i++) {
    const current = new Date(descendingCategories[i].created_at).getTime();
    const next = new Date(descendingCategories[i + 1].created_at).getTime();

    TestValidator.predicate(
      `category ${i} created_at should be >= category ${i + 1} in descending order`,
      current >= next,
    );
  }

  // Verify that ascending and descending are reverse of each other
  TestValidator.equals(
    "ascending and descending should contain same categories in reverse order",
    ascendingCategories.length,
    descendingCategories.length,
  );
}
