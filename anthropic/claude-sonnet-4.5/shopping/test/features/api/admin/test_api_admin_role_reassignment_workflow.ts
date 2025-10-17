import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin profile update workflow with role persistence validation.
 *
 * This test validates the admin update workflow where:
 *
 * 1. Creates an admin account with order_manager role
 * 2. Updates the admin's name through the update endpoint
 * 3. Validates the name change was applied correctly
 * 4. Ensures the role level remains unchanged after profile update
 * 5. Verifies all other admin properties remain consistent
 *
 * Note: The IShoppingMallAdmin.IUpdate DTO only supports name updates. Role
 * reassignment requires separate dedicated endpoints not available in the
 * provided API materials.
 */
export async function test_api_admin_role_reassignment_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create an admin account with order_manager role
  const createAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "order_manager",
  } satisfies IShoppingMallAdmin.ICreate;

  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createAdminBody,
    });

  typia.assert(createdAdmin);

  // Validate the created admin has the correct initial role
  TestValidator.equals(
    "created admin should have order_manager role",
    createdAdmin.role_level,
    "order_manager",
  );

  // Step 2: Update the admin's name (only field available in IUpdate DTO)
  const newName = RandomGenerator.name();
  const updateBody = {
    name: newName,
  } satisfies IShoppingMallAdmin.IUpdate;

  const updatedAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.update(connection, {
      adminId: createdAdmin.id,
      body: updateBody,
    });

  typia.assert(updatedAdmin);

  // Step 3: Validate the name update was applied correctly
  TestValidator.equals(
    "admin ID should remain the same after update",
    updatedAdmin.id,
    createdAdmin.id,
  );

  TestValidator.equals(
    "admin email should remain unchanged",
    updatedAdmin.email,
    createdAdmin.email,
  );

  TestValidator.equals(
    "admin name should be updated to new value",
    updatedAdmin.name,
    newName,
  );

  // Step 4: Validate role level remains unchanged after profile update
  TestValidator.equals(
    "admin role should remain order_manager after name update",
    updatedAdmin.role_level,
    "order_manager",
  );
}
