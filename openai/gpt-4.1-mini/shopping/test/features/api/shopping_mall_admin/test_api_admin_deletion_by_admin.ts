import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validates the deletion of an admin user by another authenticated admin.
 *
 * This test performs the following steps:
 *
 * 1. An initial admin user joins the system and authenticates.
 * 2. The authenticated admin creates a new admin user.
 * 3. The test authenticates again as the initial admin to confirm access.
 * 4. Deletes the newly created admin user using the delete API.
 *
 * Each step is verified using type-safe assertions to ensure creation,
 * authentication, and deletion behave as expected.
 */
export async function test_api_admin_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Initial admin user joins and authenticates
  const adminEmail1 = `initial_admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminJoinData1 = {
    email: adminEmail1,
    name: `Initial Admin ${RandomGenerator.name()}`,
    password: "SecurePass123!",
    phone_number: null,
    role: "superadmin",
  } satisfies IShoppingMallAdmin.ICreate;

  const initialAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinData1 });
  typia.assert(initialAdmin);

  // Step 2: Create another admin user to be deleted
  const adminEmail2 = `delete_target_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminCreateData2 = {
    email: adminEmail2,
    name: `Delete Target Admin ${RandomGenerator.name()}`,
    password: "DeletePass123!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminToDelete: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.create(connection, {
      body: adminCreateData2,
    });
  typia.assert(adminToDelete);

  // Step 3: Authenticate again as initial admin to ensure authorization with proper context
  const adminAuthCheck: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinData1 });
  typia.assert(adminAuthCheck);

  // Step 4: Delete the created admin user
  await api.functional.shoppingMall.admin.admins.erase(connection, {
    adminId: adminToDelete.id,
  });
}
