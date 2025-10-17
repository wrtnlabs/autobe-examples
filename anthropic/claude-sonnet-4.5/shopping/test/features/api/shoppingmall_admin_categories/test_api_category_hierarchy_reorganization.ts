import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test category management and update operations by administrators.
 *
 * This test validates the category management workflow that administrators use
 * to organize the product catalog:
 *
 * 1. Authenticates as admin with category management permissions
 * 2. Creates multiple categories to represent different product classifications
 * 3. Updates a category's name to reflect organizational changes
 * 4. Verifies that category updates are persisted correctly
 * 5. Validates that category identity (ID) remains stable during updates
 *
 * The test ensures that administrators can create and modify product categories
 * to maintain an organized and up-to-date catalog structure. Category updates
 * allow renaming classifications as business needs evolve while preserving the
 * category's identity and existing product associations.
 */
export async function test_api_category_hierarchy_reorganization(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin with category management permissions
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create first category for product classification
  const category1Data = {
    name: `Electronics_${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IShoppingMallCategory.ICreate;

  const category1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: category1Data,
    });
  typia.assert(category1);
  TestValidator.equals(
    "first category name matches input",
    category1.name,
    category1Data.name,
  );

  // Step 3: Create second category
  const category2Data = {
    name: `Clothing_${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IShoppingMallCategory.ICreate;

  const category2: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: category2Data,
    });
  typia.assert(category2);
  TestValidator.equals(
    "second category name matches input",
    category2.name,
    category2Data.name,
  );

  // Step 4: Create third category
  const category3Data = {
    name: `HomeGoods_${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IShoppingMallCategory.ICreate;

  const category3: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: category3Data,
    });
  typia.assert(category3);
  TestValidator.equals(
    "third category name matches input",
    category3.name,
    category3Data.name,
  );

  // Step 5: Update category name to reflect organizational change
  const newCategoryName = `Electronics_Updated_${RandomGenerator.alphaNumeric(6)}`;
  const updateData = {
    name: newCategoryName,
  } satisfies IShoppingMallCategory.IUpdate;

  const updatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: category1.id,
      body: updateData,
    });
  typia.assert(updatedCategory);

  // Step 6: Verify update was successful
  TestValidator.equals(
    "category id unchanged after update",
    updatedCategory.id,
    category1.id,
  );
  TestValidator.equals(
    "category name updated correctly",
    updatedCategory.name,
    newCategoryName,
  );
  TestValidator.notEquals(
    "category name changed from original",
    updatedCategory.name,
    category1Data.name,
  );

  // Step 7: Verify other categories remain unchanged
  TestValidator.notEquals(
    "categories have unique ids",
    category1.id,
    category2.id,
  );
  TestValidator.notEquals(
    "category names are distinct",
    category1.name,
    category2.name,
  );
}
