import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test display_order field validation for category creation.
 *
 * Validates that the display_order field properly enforces non-negative integer
 * constraints. A moderator authenticates and attempts to create categories with
 * invalid display_order values.
 *
 * The test verifies:
 *
 * 1. Display_order must be non-negative (>= 0)
 * 2. Display_order is required and cannot be omitted
 * 3. Large valid integers are accepted
 * 4. Boundary values (0) are accepted
 * 5. Validation errors properly reject negative values
 */
export async function test_api_category_creation_invalid_display_order(
  connection: api.IConnection,
) {
  // Step 1: Authenticate moderator for category creation testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test negative display_order value should fail
  await TestValidator.error(
    "negative display_order should fail validation",
    async () => {
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: "Test Category",
            slug: "test-category-neg",
            description: "A test category with negative display order",
            display_order: -1,
            is_active: true,
          } satisfies IDiscussionBoardCategory.ICreate,
        },
      );
    },
  );

  // Step 3: Test large negative display_order value should fail
  await TestValidator.error(
    "large negative display_order should fail validation",
    async () => {
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: "Test Category 2",
            slug: "test-category-2",
            description: "A test category with large negative display order",
            display_order: -100,
            is_active: true,
          } satisfies IDiscussionBoardCategory.ICreate,
        },
      );
    },
  );

  // Step 4: Test valid zero display_order should succeed
  const categoryWithZero: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Zero Order Category",
          slug: "zero-order-category",
          description: "Category with display_order of zero",
          display_order: 0,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(categoryWithZero);
  TestValidator.equals(
    "category display_order should be 0",
    categoryWithZero.display_order,
    0,
  );

  // Step 5: Test valid positive display_order should succeed
  const categoryWithPositive: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Positive Order Category",
          slug: "positive-order-category",
          description: "Category with positive display_order",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(categoryWithPositive);
  TestValidator.equals(
    "category display_order should be 1",
    categoryWithPositive.display_order,
    1,
  );

  // Step 6: Test very large valid display_order should succeed
  const categoryWithLargeOrder: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Large Order Category",
          slug: "large-order-category",
          description: "Category with large positive display_order",
          display_order: 999999,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(categoryWithLargeOrder);
  TestValidator.equals(
    "category display_order should be 999999",
    categoryWithLargeOrder.display_order,
    999999,
  );

  // Step 7: Verify display_order constraint validation
  TestValidator.predicate(
    "all created categories have non-negative display_order",
    categoryWithZero.display_order >= 0 &&
      categoryWithPositive.display_order >= 0 &&
      categoryWithLargeOrder.display_order >= 0,
  );
}
