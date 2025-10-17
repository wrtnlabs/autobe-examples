import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test retrieving complete detailed information for a specific product
 * category.
 *
 * This test validates the category detail retrieval endpoint by:
 *
 * 1. Creating an admin account to enable category management operations
 * 2. Creating a test category with complete attributes via admin API
 * 3. Retrieving the category details by ID through the public endpoint
 * 4. Validating that all category information is correctly returned
 *
 * The test ensures proper category data retrieval including all attributes such
 * as category ID, name, and proper type validation of the response structure.
 */
export async function test_api_category_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create test category with complete attributes
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(createdCategory);

  // Step 3: Retrieve category details by ID
  const retrievedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.categories.at(connection, {
      categoryId: createdCategory.id,
    });
  typia.assert(retrievedCategory);

  // Step 4: Validate retrieved category matches created category
  TestValidator.equals(
    "retrieved category id matches created category",
    retrievedCategory.id,
    createdCategory.id,
  );

  TestValidator.equals(
    "retrieved category name matches created category",
    retrievedCategory.name,
    createdCategory.name,
  );
}
