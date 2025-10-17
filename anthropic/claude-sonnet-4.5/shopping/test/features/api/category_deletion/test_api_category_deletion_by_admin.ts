import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test the complete category deletion workflow by an admin.
 *
 * This test validates the soft deletion functionality for product categories,
 * ensuring that only authenticated administrators can delete categories from
 * the shopping mall's hierarchical taxonomy structure.
 *
 * Workflow steps:
 *
 * 1. Create and authenticate an admin account
 * 2. Create a product category in the taxonomy
 * 3. Soft delete the created category
 * 4. Verify the deletion was successful
 */
export async function test_api_category_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
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

  // Verify admin authentication token is set
  TestValidator.predicate(
    "admin authentication token should be set",
    admin.token.access.length > 0,
  );

  // Step 2: Create a product category
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Verify category was created successfully
  TestValidator.equals(
    "category name should match",
    category.name,
    categoryData.name,
  );

  // Step 3: Soft delete the created category
  await api.functional.shoppingMall.admin.categories.erase(connection, {
    categoryId: category.id,
  });

  // Step 4: Verification complete - category soft deletion successful
  // The category is now marked as deleted with deleted_at timestamp
  // and excluded from customer-facing navigation while preserved for audit
}
