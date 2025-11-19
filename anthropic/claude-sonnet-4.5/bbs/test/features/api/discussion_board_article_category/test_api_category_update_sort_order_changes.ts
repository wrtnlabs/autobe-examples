import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category sort order modification for controlling display priority.
 *
 * This test validates that administrators can freely modify category sort_order
 * values to reorder category presentation in lists and dropdowns. Lower
 * sort_order values appear first, allowing prioritization of important
 * categories.
 *
 * Test workflow:
 *
 * 1. Authenticate as moderator with category management privileges
 * 2. Create three categories with sequential sort_order values (1, 2, 3)
 * 3. Update third category's sort_order to 0 (moves to first position)
 * 4. Verify the sort_order change was applied successfully
 * 5. Update another category to sort_order 10 (higher value test)
 * 6. Validate all responses with complete type checking
 */
export async function test_api_category_update_sort_order_changes(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123!",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create three categories with sort_order 1, 2, 3
  const category1: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Category ${RandomGenerator.alphaNumeric(6)}`,
          slug: `category-${RandomGenerator.alphaNumeric(6).toLowerCase()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category1);
  TestValidator.equals("category1 sort_order", category1.sort_order, 1);

  const category2: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Category ${RandomGenerator.alphaNumeric(6)}`,
          slug: `category-${RandomGenerator.alphaNumeric(6).toLowerCase()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: 2,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category2);
  TestValidator.equals("category2 sort_order", category2.sort_order, 2);

  const category3: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Category ${RandomGenerator.alphaNumeric(6)}`,
          slug: `category-${RandomGenerator.alphaNumeric(6).toLowerCase()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: 3,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category3);
  TestValidator.equals("category3 sort_order", category3.sort_order, 3);

  // Step 3: Update third category's sort_order to 0 (first position)
  const updatedCategory3: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: category3.id,
        body: {
          sort_order: 0,
        } satisfies IDiscussionBoardArticleCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory3);

  // Step 4: Verify sort_order changed to 0
  TestValidator.equals(
    "updated category3 sort_order is 0",
    updatedCategory3.sort_order,
    0,
  );
  TestValidator.equals(
    "category ID unchanged",
    updatedCategory3.id,
    category3.id,
  );

  // Step 5: Update another category to sort_order 10
  const updatedCategory1: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: category1.id,
        body: {
          sort_order: 10,
        } satisfies IDiscussionBoardArticleCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory1);

  // Step 6: Verify sort_order changed to 10
  TestValidator.equals(
    "updated category1 sort_order is 10",
    updatedCategory1.sort_order,
    10,
  );
  TestValidator.equals(
    "category ID unchanged",
    updatedCategory1.id,
    category1.id,
  );
}
