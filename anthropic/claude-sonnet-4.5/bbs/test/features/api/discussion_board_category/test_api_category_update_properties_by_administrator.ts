import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test administrator updating existing category properties including name,
 * description, display order, and active status.
 *
 * This test validates the category maintenance workflow as the platform
 * evolves.
 *
 * Workflow steps:
 *
 * 1. Administrator registers and authenticates to obtain management authorization
 * 2. Administrator creates an initial category with baseline properties
 * 3. Administrator updates multiple category properties (name, description,
 *    display_order, is_active)
 * 4. System validates all updates are correctly applied
 * 5. System confirms updated_at timestamp is refreshed
 * 6. System validates category ID remains unchanged
 * 7. Test confirms category updates maintain referential integrity
 */
export async function test_api_category_update_properties_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Administrator registers and authenticates
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const authenticatedAdmin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(authenticatedAdmin);

  // Step 2: Administrator creates an initial category with baseline properties
  const initialCategoryData = {
    name: "Initial Category Name",
    slug: "initial-category-slug",
    description: "Initial category description for testing updates",
    parent_category_id: null,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: initialCategoryData,
      },
    );
  typia.assert(createdCategory);

  // Validate initial category creation
  TestValidator.equals(
    "initial category name matches",
    createdCategory.name,
    initialCategoryData.name,
  );
  TestValidator.equals(
    "initial slug matches",
    createdCategory.slug,
    initialCategoryData.slug,
  );
  TestValidator.equals(
    "initial description matches",
    createdCategory.description,
    initialCategoryData.description,
  );
  TestValidator.equals(
    "initial display order matches",
    createdCategory.display_order,
    initialCategoryData.display_order,
  );
  TestValidator.equals(
    "initial is_active matches",
    createdCategory.is_active,
    initialCategoryData.is_active,
  );

  // Record initial created_at timestamp for later comparison
  const initialCreatedAt = createdCategory.created_at;
  const initialUpdatedAt = createdCategory.updated_at;

  // Step 3: Administrator updates multiple category properties
  const updatedCategoryData = {
    name: "Updated Category Name",
    slug: "updated-category-slug",
    description: "Updated category description reflecting platform evolution",
    display_order: 5,
    is_active: false,
  } satisfies IDiscussionBoardCategory.IUpdate;

  const updatedCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.update(
      connection,
      {
        categoryId: createdCategory.id,
        body: updatedCategoryData,
      },
    );
  typia.assert(updatedCategory);

  // Step 4: Validate all updates are correctly applied
  TestValidator.equals(
    "updated category name matches",
    updatedCategory.name,
    updatedCategoryData.name,
  );
  TestValidator.equals(
    "updated slug matches",
    updatedCategory.slug,
    updatedCategoryData.slug,
  );
  TestValidator.equals(
    "updated description matches",
    updatedCategory.description,
    updatedCategoryData.description,
  );
  TestValidator.equals(
    "updated display_order matches",
    updatedCategory.display_order,
    updatedCategoryData.display_order,
  );
  TestValidator.equals(
    "updated is_active matches",
    updatedCategory.is_active,
    updatedCategoryData.is_active,
  );

  // Step 5: Confirm updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at timestamp is refreshed after update",
    new Date(updatedCategory.updated_at).getTime() >
      new Date(initialUpdatedAt).getTime(),
  );

  // Step 6: Validate category ID remains unchanged
  TestValidator.equals(
    "category ID remains unchanged after update",
    updatedCategory.id,
    createdCategory.id,
  );

  // Step 7: Validate created_at timestamp remains unchanged
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedCategory.created_at,
    initialCreatedAt,
  );

  // Validate topic_count is preserved (should still be 0 since no topics were created)
  TestValidator.equals(
    "topic_count preserved after update",
    updatedCategory.topic_count,
    0,
  );
}
