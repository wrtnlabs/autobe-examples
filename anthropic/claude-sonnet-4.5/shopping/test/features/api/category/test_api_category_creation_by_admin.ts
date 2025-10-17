import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test the complete workflow for administrators to create a new product
 * category.
 *
 * This test validates that an authenticated admin can successfully create a
 * root-level category in the hierarchical taxonomy structure. The test ensures
 * proper authentication, category creation with required fields, and validates
 * the response structure including generated ID and provided category details.
 *
 * Workflow Steps:
 *
 * 1. Create and authenticate an admin user via the admin join endpoint
 * 2. Create a new product category with a unique name
 * 3. Validate the response structure and data integrity
 */
export async function test_api_category_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminName = RandomGenerator.name();
  const adminRoleLevel = "super_admin";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role_level: adminRoleLevel,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Validate admin authentication response
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals("admin name matches", admin.name, adminName);
  TestValidator.equals(
    "admin role level matches",
    admin.role_level,
    adminRoleLevel,
  );
  TestValidator.predicate(
    "admin token exists",
    admin.token !== null && admin.token !== undefined,
  );

  // Step 2: Create a new product category
  const categoryName = RandomGenerator.name(2);

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: categoryName,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Validate category creation response
  TestValidator.equals("category name matches", category.name, categoryName);
}
