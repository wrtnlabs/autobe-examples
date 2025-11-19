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
 * Test category sorting by sort_order field in both ascending and descending
 * order.
 *
 * This test validates that article categories can be properly sorted by their
 * sort_order field, which controls category display priority in the user
 * interface. The test creates multiple categories with different sort_order
 * values and verifies that they appear in the correct sequence when retrieved
 * with different sort directions.
 *
 * Steps:
 *
 * 1. Create moderator account for authentication
 * 2. Create three categories with sort_order values: 1, 3, 2
 * 3. Retrieve categories sorted by sort_order ascending, verify order: 1, 2, 3
 * 4. Retrieve categories sorted by sort_order descending, verify order: 3, 2, 1
 * 5. Validate that administrators can control category display priority through
 *    sort_order
 */
export async function test_api_category_sorting_by_sort_order(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "testPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create three categories with non-sequential sort_order values (1, 3, 2)
  const category1: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Category with Order 1",
          slug: `category-order-1-${RandomGenerator.alphaNumeric(6)}`,
          description: "First category in display order",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category1);

  const category3: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Category with Order 3",
          slug: `category-order-3-${RandomGenerator.alphaNumeric(6)}`,
          description: "Third category in display order",
          sort_order: 3,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category3);

  const category2: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Category with Order 2",
          slug: `category-order-2-${RandomGenerator.alphaNumeric(6)}`,
          description: "Second category in display order",
          sort_order: 2,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category2);

  // Step 3: Retrieve categories sorted by sort_order in ascending order
  const ascendingResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "sort_order",
        order: "asc",
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(ascendingResult);

  // Find our created categories in the results
  const createdIds = [category1.id, category2.id, category3.id];
  const ascendingCategories = ascendingResult.data.filter((cat) =>
    createdIds.includes(cat.id),
  );

  // Verify ascending order: should be category1 (1), category2 (2), category3 (3)
  TestValidator.equals(
    "should have 3 created categories in ascending results",
    ascendingCategories.length,
    3,
  );

  TestValidator.equals(
    "first category should have sort_order 1",
    ascendingCategories[0].id,
    category1.id,
  );

  TestValidator.equals(
    "second category should have sort_order 2",
    ascendingCategories[1].id,
    category2.id,
  );

  TestValidator.equals(
    "third category should have sort_order 3",
    ascendingCategories[2].id,
    category3.id,
  );

  // Step 4: Retrieve categories sorted by sort_order in descending order
  const descendingResult: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "sort_order",
        order: "desc",
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(descendingResult);

  // Find our created categories in the descending results
  const descendingCategories = descendingResult.data.filter((cat) =>
    createdIds.includes(cat.id),
  );

  // Verify descending order: should be category3 (3), category2 (2), category1 (1)
  TestValidator.equals(
    "should have 3 created categories in descending results",
    descendingCategories.length,
    3,
  );

  TestValidator.equals(
    "first category in descending should have sort_order 3",
    descendingCategories[0].id,
    category3.id,
  );

  TestValidator.equals(
    "second category in descending should have sort_order 2",
    descendingCategories[1].id,
    category2.id,
  );

  TestValidator.equals(
    "third category in descending should have sort_order 1",
    descendingCategories[2].id,
    category1.id,
  );
}
