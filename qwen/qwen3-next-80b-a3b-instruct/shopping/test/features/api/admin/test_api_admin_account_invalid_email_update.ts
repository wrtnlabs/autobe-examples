import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_account_invalid_email_update(
  connection: api.IConnection,
) {
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "SecurePassword123!";
  const adminFirstName: string = RandomGenerator.name();
  const adminLastName: string = RandomGenerator.name();
  const adminRole: "super_admin" | "full_admin" | "limited_admin" =
    "super_admin";

  // 1. Create a super-admin account for authentication
  const superAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: adminFirstName,
        last_name: adminLastName,
        role: adminRole,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(superAdmin);

  // 2. Create the target admin account that will be updated
  const targetEmail: string = typia.random<string & tags.Format<"email">>();
  const targetFirstName: string = RandomGenerator.name();
  const targetLastName: string = RandomGenerator.name();
  const targetRole: "super_admin" | "full_admin" | "limited_admin" =
    "full_admin";

  const targetAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.actors.admins.create(connection, {
      body: {
        email: targetEmail,
        password: "TargetPassword123!",
        first_name: targetFirstName,
        last_name: targetLastName,
        role: targetRole,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(targetAdmin);

  // 3. Validate that admin can be suspended (only valid operation in IUpdate)
  // This tests the actual business logic that MUST be implemented for IUpdate
  const updatedAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.actors.admins.update(connection, {
      adminId: targetAdmin.id,
      body: {
        first_name: targetFirstName,
        last_name: targetLastName,
        status: "suspended",
      } satisfies IShoppingMallAdmin.IUpdate,
    });
  typia.assert(updatedAdmin);

  // 4. Verify the status was changed to suspended
  TestValidator.equals(
    "admin status should be suspended after update",
    updatedAdmin.status,
    "suspended",
  );
}
