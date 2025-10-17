import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test updating basic category properties including name.
 *
 * This test validates that administrators can modify category metadata without
 * affecting the category's identity. The test performs the following steps:
 *
 * 1. Create and authenticate as admin to obtain necessary permissions
 * 2. Create an initial category with baseline properties
 * 3. Update the category's basic properties (name)
 * 4. Verify that the updated category information is correctly reflected
 * 5. Ensure that the id remains unchanged after the update
 */
export async function test_api_category_update_basic_properties(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create an initial category
  const originalCategoryName = RandomGenerator.name(2);
  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: originalCategoryName,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(createdCategory);
  TestValidator.equals(
    "created category name matches",
    createdCategory.name,
    originalCategoryName,
  );

  // Step 3: Update the category's basic properties
  const updatedCategoryName = RandomGenerator.name(2);
  const updatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: createdCategory.id,
      body: {
        name: updatedCategoryName,
      } satisfies IShoppingMallCategory.IUpdate,
    });
  typia.assert(updatedCategory);

  // Step 4: Verify the updated category information
  TestValidator.equals(
    "category id remains unchanged",
    updatedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name is updated",
    updatedCategory.name,
    updatedCategoryName,
  );
  TestValidator.notEquals(
    "category name has changed",
    updatedCategory.name,
    originalCategoryName,
  );
}
