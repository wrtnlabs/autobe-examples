import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_category_update_name_change(
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

  // Step 2: Create a category with initial name 'Economics'
  const originalCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economics",
          slug: "economics",
          description: "Discussion about economic policies and theories",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(originalCategory);

  // Step 3: Update only the category name to 'Economic Analysis'
  const updatedCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: originalCategory.id,
        body: {
          name: "Economic Analysis",
        } satisfies IDiscussionBoardCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 4: Verify that only the name changed
  TestValidator.equals(
    "category name should be updated to 'Economic Analysis'",
    updatedCategory.name,
    "Economic Analysis",
  );

  // Step 5: Verify that other properties remain unchanged
  TestValidator.equals(
    "category slug should remain unchanged",
    updatedCategory.slug,
    originalCategory.slug,
  );

  TestValidator.equals(
    "category description should remain unchanged",
    updatedCategory.description,
    originalCategory.description,
  );

  TestValidator.equals(
    "category display_order should remain unchanged",
    updatedCategory.display_order,
    originalCategory.display_order,
  );

  TestValidator.equals(
    "category is_active should remain unchanged",
    updatedCategory.is_active,
    originalCategory.is_active,
  );

  // Step 6: Verify that the ID remains the same
  TestValidator.equals(
    "category id should remain unchanged",
    updatedCategory.id,
    originalCategory.id,
  );
}
