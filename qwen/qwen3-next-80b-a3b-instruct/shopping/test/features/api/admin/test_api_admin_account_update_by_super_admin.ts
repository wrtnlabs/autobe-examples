import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_account_update_by_super_admin(
  connection: api.IConnection,
) {
  // Step 1: Create a super-admin account for authentication
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(12);
  const superAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(superAdmin);

  // Step 2: Create a target admin account to be updated (using super-admin auth context)
  const targetAdminEmail = typia.random<string & tags.Format<"email">>();
  const targetAdminPassword = RandomGenerator.alphaNumeric(12);
  const targetAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.actors.admins.create(connection, {
      body: {
        email: targetAdminEmail,
        password: targetAdminPassword,
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(targetAdmin);

  // Step 3: Verify the update endpoint can modify name fields and status
  const newFirstName = RandomGenerator.name();
  const newLastName = RandomGenerator.name();
  const updatedStatus = "suspended" as const; // Only permitted update value

  // Perform the update operation
  const updatedAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.actors.admins.update(connection, {
      adminId: targetAdmin.id,
      body: {
        first_name: newFirstName,
        last_name: newLastName,
        status: updatedStatus,
      } satisfies IShoppingMallAdmin.IUpdate,
    });
  typia.assert(updatedAdmin);

  // Step 4: Validate that the update was successful and only permitted fields were modified
  TestValidator.equals(
    "first_name was updated correctly",
    updatedAdmin.first_name,
    newFirstName,
  );
  TestValidator.equals(
    "last_name was updated correctly",
    updatedAdmin.last_name,
    newLastName,
  );
  TestValidator.equals(
    "status was changed to suspended",
    updatedAdmin.status,
    updatedStatus,
  );

  // Step 5: Verify that email remains unchanged (security requirement)
  TestValidator.equals(
    "email was not modified during update",
    updatedAdmin.email,
    targetAdminEmail,
  );

  // Step 6: Confirm the update is logged in audit trail by comparing timestamps
  // The updated_at should be different from the original created_at
  TestValidator.notEquals(
    "updated_at timestamp changed after modification",
    updatedAdmin.updated_at,
    targetAdmin.created_at,
  );
}
