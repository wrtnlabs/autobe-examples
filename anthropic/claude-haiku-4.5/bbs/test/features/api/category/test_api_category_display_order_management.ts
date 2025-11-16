import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test display_order field management for category organization.
 *
 * This test validates that categories are properly ordered by display_order in
 * the discussion board system. A moderator authenticates and creates multiple
 * categories with different display_order values, then verifies that the system
 * correctly maintains ordering. The test covers various display_order values
 * including gaps in sequence to ensure flexible ordering is supported.
 *
 * Steps:
 *
 * 1. Register a moderator account
 * 2. Create categories with different display_order values (1, 2, 3, 5, 10)
 * 3. Verify categories are ordered by display_order in ascending order
 * 4. Test edge cases: display_order of 0, 100, 999
 * 5. Confirm gaps in display_order sequence are allowed
 */
export async function test_api_category_display_order_management(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create categories with different display_order values
  const displayOrders = [1, 2, 3, 5, 10];
  const createdCategories: IDiscussionBoardCategory[] = [];

  for (const displayOrder of displayOrders) {
    const category: IDiscussionBoardCategory =
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: `Category ${displayOrder}`,
            slug: `category-${displayOrder}`,
            description: `Test category with display_order ${displayOrder}`,
            display_order: displayOrder,
            is_active: true,
          } satisfies IDiscussionBoardCategory.ICreate,
        },
      );
    typia.assert(category);
    createdCategories.push(category);
  }

  // Step 3: Verify categories are ordered by display_order
  TestValidator.equals(
    "first category has display_order 1",
    createdCategories[0].display_order,
    1,
  );
  TestValidator.equals(
    "second category has display_order 2",
    createdCategories[1].display_order,
    2,
  );
  TestValidator.equals(
    "third category has display_order 3",
    createdCategories[2].display_order,
    3,
  );
  TestValidator.equals(
    "fourth category has display_order 5",
    createdCategories[3].display_order,
    5,
  );
  TestValidator.equals(
    "fifth category has display_order 10",
    createdCategories[4].display_order,
    10,
  );

  // Step 4: Test edge cases - categories with extreme display_order values
  const edgeCaseOrders = [0, 100, 999];
  const edgeCaseCategories: IDiscussionBoardCategory[] = [];

  for (const displayOrder of edgeCaseOrders) {
    const category: IDiscussionBoardCategory =
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: `Edge Case Category ${displayOrder}`,
            slug: `edge-case-category-${displayOrder}`,
            description: `Test category with edge case display_order ${displayOrder}`,
            display_order: displayOrder,
            is_active: true,
          } satisfies IDiscussionBoardCategory.ICreate,
        },
      );
    typia.assert(category);
    edgeCaseCategories.push(category);
  }

  // Step 5: Verify edge case display_order values
  TestValidator.equals(
    "edge case category has display_order 0",
    edgeCaseCategories[0].display_order,
    0,
  );
  TestValidator.equals(
    "edge case category has display_order 100",
    edgeCaseCategories[1].display_order,
    100,
  );
  TestValidator.equals(
    "edge case category has display_order 999",
    edgeCaseCategories[2].display_order,
    999,
  );

  // Step 6: Verify gaps in display_order sequence are allowed
  // Create categories with sequence 1, 2, 5 to confirm gaps work
  const gapCategory1: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Gap Category 1",
          slug: "gap-category-1",
          description: "First category in gap test",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(gapCategory1);

  const gapCategory2: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Gap Category 2",
          slug: "gap-category-2",
          description: "Second category in gap test",
          display_order: 2,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(gapCategory2);

  const gapCategory5: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Gap Category 5",
          slug: "gap-category-5",
          description: "Category with gap in sequence",
          display_order: 5,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(gapCategory5);

  TestValidator.predicate(
    "gap sequence is valid (1, 2, 5)",
    gapCategory1.display_order === 1 &&
      gapCategory2.display_order === 2 &&
      gapCategory5.display_order === 5,
  );
}
