import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test category management operations through admin interface.
 *
 * This test validates the admin's ability to create and update product
 * categories in the shopping mall system. The workflow includes:
 *
 * 1. Admin Authentication - Create and authenticate an admin user with category
 *    management permissions
 * 2. Category Creation - Create a new product category with a descriptive name
 * 3. Category Update - Modify the category name to test update functionality
 * 4. Validation - Verify all operations complete successfully and data integrity
 *    is maintained
 *
 * Note: The original scenario requested testing category activation status
 * toggling via an is_active flag, but this property does not exist in the
 * current DTO definitions. This test focuses on the available category
 * management operations instead.
 */
export async function test_api_category_activation_status_toggle(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new category
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: categoryName,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  TestValidator.equals(
    "created category name matches input",
    category.name,
    categoryName,
  );

  // 3. Update the category with a new name
  const updatedName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const updatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: category.id,
      body: {
        name: updatedName,
      } satisfies IShoppingMallCategory.IUpdate,
    });
  typia.assert(updatedCategory);

  // 4. Verify the update was successful
  TestValidator.equals(
    "category ID remains unchanged after update",
    updatedCategory.id,
    category.id,
  );

  TestValidator.equals(
    "updated category name matches new value",
    updatedCategory.name,
    updatedName,
  );

  TestValidator.notEquals(
    "category name changed from original",
    updatedCategory.name,
    categoryName,
  );
}
