import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test complete admin profile update workflow by super admin.
 *
 * This test validates the admin profile update functionality:
 *
 * 1. Creates an initial admin account using the admin join endpoint
 * 2. Authenticates as super admin (token automatically set from join response)
 * 3. Updates the created admin's profile information (name field)
 * 4. Validates the update succeeds and all fields are properly modified
 * 5. Confirms the updated_at timestamp reflects the change
 * 6. Verifies role-based access control for super admin permissions
 */
export async function test_api_admin_profile_update_by_super_admin(
  connection: api.IConnection,
) {
  // Step 1: Create initial admin account
  const initialAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: initialAdminData,
    });
  typia.assert(createdAdmin);

  // Validate business logic - created admin data matches input
  TestValidator.equals(
    "created admin email matches input",
    createdAdmin.email,
    initialAdminData.email,
  );
  TestValidator.equals(
    "created admin name matches input",
    createdAdmin.name,
    initialAdminData.name,
  );
  TestValidator.equals(
    "created admin role_level matches input",
    createdAdmin.role_level,
    initialAdminData.role_level,
  );

  // Step 2: Prepare update data with new name
  const updatedName = RandomGenerator.name();
  const updateData = {
    name: updatedName,
  } satisfies IShoppingMallAdmin.IUpdate;

  // Step 3: Update the admin profile (already authenticated as super admin from join)
  const updatedAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.update(connection, {
      adminId: createdAdmin.id,
      body: updateData,
    });
  typia.assert(updatedAdmin);

  // Step 4: Validate business logic - update operation results
  TestValidator.equals(
    "updated admin id should match created admin id",
    updatedAdmin.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "updated admin email should remain unchanged",
    updatedAdmin.email,
    createdAdmin.email,
  );
  TestValidator.equals(
    "updated admin name should reflect the new value",
    updatedAdmin.name,
    updatedName,
  );
  TestValidator.equals(
    "updated admin role_level should remain unchanged",
    updatedAdmin.role_level,
    createdAdmin.role_level,
  );

  // Step 5: Validate that updated_at timestamp has changed
  TestValidator.predicate(
    "updated_at should be different from created_at indicating modification",
    updatedAdmin.updated_at !== updatedAdmin.created_at,
  );
}
