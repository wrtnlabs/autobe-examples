import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

export async function test_api_administrator_profile_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to establish administrative privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const authenticatedAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "adminPassword123",
        first_name: "System",
        last_name: "Administrator",
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(authenticatedAdmin);

  // Step 2: Create a new administrator account to serve as the target for profile update testing
  const targetAdminEmail = typia.random<string & tags.Format<"email">>();
  const createdAdmin: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: targetAdminEmail,
        password_hash: "targetPassword123",
        first_name: "Target",
        last_name: "Administrator",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 3: Update various profile fields of the newly created administrator
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedAdmin: ITodoAppAdministrator =
    await api.functional.todoApp.admin.administrators.update(connection, {
      administratorId: createdAdmin.id,
      body: {
        email: updatedEmail,
        first_name: "Updated",
        last_name: "Target",
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.IUpdate,
    });
  typia.assert(updatedAdmin);

  // Step 4: Validate that all updates are properly reflected in the system
  TestValidator.equals(
    "administrator ID remains unchanged",
    updatedAdmin.id,
    createdAdmin.id,
  );
  TestValidator.equals("email is updated", updatedAdmin.email, updatedEmail);
  TestValidator.equals(
    "first name is updated",
    updatedAdmin.first_name,
    "Updated",
  );
  TestValidator.equals(
    "last name is updated",
    updatedAdmin.last_name,
    "Target",
  );
  TestValidator.equals(
    "role level is updated",
    updatedAdmin.role_level,
    "super_admin",
  );
  TestValidator.equals("status remains active", updatedAdmin.status, "active");

  // Step 5: Verify timestamps are properly updated
  const originalUpdatedAt = new Date(createdAdmin.updated_at).getTime();
  const newUpdatedAt = new Date(updatedAdmin.updated_at).getTime();
  TestValidator.predicate(
    "updated_at timestamp is changed",
    newUpdatedAt > originalUpdatedAt,
  );

  // Step 6: Test role level change validation - update to moderator
  const moderatorAdmin: ITodoAppAdministrator =
    await api.functional.todoApp.admin.administrators.update(connection, {
      administratorId: createdAdmin.id,
      body: {
        role_level: "moderator",
        status: "suspended",
      } satisfies ITodoAppAdministrator.IUpdate,
    });
  typia.assert(moderatorAdmin);

  TestValidator.equals(
    "role level changed to moderator",
    moderatorAdmin.role_level,
    "moderator",
  );
  TestValidator.equals(
    "status changed to suspended",
    moderatorAdmin.status,
    "suspended",
  );
  TestValidator.equals(
    "email remains unchanged",
    moderatorAdmin.email,
    updatedEmail,
  );
  TestValidator.equals(
    "names remain unchanged",
    moderatorAdmin.first_name,
    "Updated",
  );
  TestValidator.equals(
    "last name remains unchanged",
    moderatorAdmin.last_name,
    "Target",
  );

  // Step 7: Test partial updates - only email change
  const finalEmail = typia.random<string & tags.Format<"email">>();
  const finalAdmin: ITodoAppAdministrator =
    await api.functional.todoApp.admin.administrators.update(connection, {
      administratorId: createdAdmin.id,
      body: {
        email: finalEmail,
      } satisfies ITodoAppAdministrator.IUpdate,
    });
  typia.assert(finalAdmin);

  TestValidator.equals("email updated again", finalAdmin.email, finalEmail);
  TestValidator.equals(
    "role level preserved",
    finalAdmin.role_level,
    "moderator",
  );
  TestValidator.equals("status preserved", finalAdmin.status, "suspended");
  TestValidator.equals("names preserved", finalAdmin.first_name, "Updated");
  TestValidator.equals("last name preserved", finalAdmin.last_name, "Target");
}
