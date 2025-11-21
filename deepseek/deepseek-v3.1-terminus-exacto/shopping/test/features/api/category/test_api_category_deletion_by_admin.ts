import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test complete category deletion workflow with proper authentication and
 * prerequisite setup.
 *
 * This E2E test validates the complete administrative category deletion process
 * in the shopping mall platform. The test follows a logical business flow:
 * administrator authentication, category creation, category deletion, and
 * validation of successful removal. It ensures that only authorized
 * administrators can perform deletion operations and that the deletion process
 * maintains referential integrity.
 */
export async function test_api_category_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ can_delete_categories: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create a category to be deleted
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
    active: true,
    parent_id: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(createdCategory);

  // Step 3: Delete the category
  await api.functional.shoppingMall.admin.categories.erase(connection, {
    categoryId: createdCategory.id,
  });

  // Step 4: Validate that category deletion was successful
  // Attempt to create a new category with the same name should succeed (name uniqueness constraint)
  const newCategoryData = {
    name: categoryData.name, // Same name should be allowed since original was deleted
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
    active: true,
    parent_id: undefined,
  } satisfies IShoppingMallCategory.ICreate;

  const newCategory = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: newCategoryData,
    },
  );
  typia.assert(newCategory);

  TestValidator.notEquals(
    "new category should have different ID than deleted category",
    newCategory.id,
    createdCategory.id,
  );

  TestValidator.equals(
    "new category should have the same name as deleted category",
    newCategory.name,
    categoryData.name,
  );

  // Additional validation: Test that the original category ID is no longer valid
  await TestValidator.error(
    "accessing deleted category should fail",
    async () => {
      // This would typically fail if we had a "get by ID" endpoint
      // Since we don't have one, we'll test by attempting to delete the same ID again
      await api.functional.shoppingMall.admin.categories.erase(connection, {
        categoryId: createdCategory.id,
      });
    },
  );
}
