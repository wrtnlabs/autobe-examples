import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test partial category update with only specific fields modified. Verify that
 * only provided fields are updated while others retain their original values.
 * Test updating just the name, just the description, and just the display order
 * separately to ensure partial update functionality works correctly.
 *
 * The test workflow includes:
 *
 * 1. Create moderator account for authentication
 * 2. Create test category with all fields
 * 3. Update only the category name
 * 4. Update only the category description
 * 5. Update only the display order
 * 6. Verify that unchanged fields keep original values
 */
export async function test_api_category_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password_hash: RandomGenerator.alphaNumeric(16),
      moderation_level: "category",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create test category with all fields
  const originalName = "Original Category Name";
  const originalDescription = "Original category description for testing";
  const originalDisplayOrder = 5;

  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: `test-category-${RandomGenerator.alphaNumeric(8)}`,
          name: originalName,
          description: originalDescription,
          display_order: originalDisplayOrder,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category);

  TestValidator.equals("initial category name", category.name, originalName);
  TestValidator.equals(
    "initial category description",
    category.description,
    originalDescription,
  );
  TestValidator.equals(
    "initial display order",
    category.display_order,
    originalDisplayOrder,
  );

  // Step 3: Update only the category name
  const newName = "Updated Category Name";
  const updatedNameState =
    await api.functional.economicDiscussion.moderator.categories.update(
      connection,
      {
        categoryCode: category.code,
        body: {
          name: newName,
        } satisfies IEconomicDiscussionCategory.IUpdate,
      },
    );
  typia.assert(updatedNameState);

  TestValidator.equals("name updated only", updatedNameState.name, newName);
  TestValidator.equals(
    "description unchanged after name update",
    updatedNameState.description,
    originalDescription,
  );
  TestValidator.equals(
    "display order unchanged after name update",
    updatedNameState.display_order,
    originalDisplayOrder,
  );

  // Step 4: Update only the category description
  const newDescription =
    "Updated category description for testing partial updates";
  const updatedDescriptionState =
    await api.functional.economicDiscussion.moderator.categories.update(
      connection,
      {
        categoryCode: category.code,
        body: {
          description: newDescription,
        } satisfies IEconomicDiscussionCategory.IUpdate,
      },
    );
  typia.assert(updatedDescriptionState);

  TestValidator.equals(
    "description updated only",
    updatedDescriptionState.description,
    newDescription,
  );
  TestValidator.equals(
    "name remains from previous update",
    updatedDescriptionState.name,
    newName,
  );
  TestValidator.equals(
    "display order unchanged after description update",
    updatedDescriptionState.display_order,
    originalDisplayOrder,
  );

  // Step 5: Update only the display order
  const newDisplayOrder = 10;
  const finalState =
    await api.functional.economicDiscussion.moderator.categories.update(
      connection,
      {
        categoryCode: category.code,
        body: {
          display_order: newDisplayOrder,
        } satisfies IEconomicDiscussionCategory.IUpdate,
      },
    );
  typia.assert(finalState);

  TestValidator.equals(
    "display order updated only",
    finalState.display_order,
    newDisplayOrder,
  );
  TestValidator.equals(
    "name remains from previous update",
    finalState.name,
    newName,
  );
  TestValidator.equals(
    "description remains from previous update",
    finalState.description,
    newDescription,
  );

  // Step 6: Verify core fields and metadata remain consistent
  TestValidator.equals(
    "category ID remains unchanged",
    finalState.id,
    category.id,
  );
  TestValidator.equals(
    "category code remains unchanged",
    finalState.code,
    category.code,
  );
  TestValidator.equals(
    "article count updated correctly",
    finalState.article_count,
    category.article_count,
  );
}
