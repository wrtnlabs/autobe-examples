import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test creating multiple categories in the shopping mall system.
 *
 * This test validates the category creation workflow for admin users. Since the
 * current API does not support specifying parent-child relationships (the
 * ICreate DTO only has a name field), this test focuses on validating that
 * multiple categories can be created successfully with unique identifiers.
 *
 * Test Flow:
 *
 * 1. Authenticate as admin to obtain necessary permissions
 * 2. Create first category
 * 3. Create second category
 * 4. Validate both categories are created successfully with unique IDs
 *
 * Note: The API schema does not currently support hierarchical parent-child
 * relationships through a parent_id field in the creation request.
 */
export async function test_api_category_subcategory_creation_hierarchy(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create first category
  const firstCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(firstCategory);

  // Step 3: Create second category
  const secondCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(secondCategory);

  // Step 4: Validate categories have unique identifiers
  TestValidator.notEquals(
    "categories have different IDs",
    firstCategory.id,
    secondCategory.id,
  );
}
