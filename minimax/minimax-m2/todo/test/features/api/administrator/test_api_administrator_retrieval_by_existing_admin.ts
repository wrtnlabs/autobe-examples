import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

export async function test_api_administrator_retrieval_by_existing_admin(
  connection: api.IConnection,
) {
  // Step 1: Create super admin account for authentication context
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: superAdminEmail,
        password_hash: "hashed_super_admin_password_123",
        role_level: "super_admin",
        status: "active",
        first_name: "Super",
        last_name: "Admin",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(superAdmin);

  // Step 2: Create administrator account to be retrieved
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const createdAdministrator: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: adminEmail,
        password_hash: "hashed_admin_password_456",
        role_level: "admin",
        status: "active",
        first_name: "Test",
        last_name: "Administrator",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(createdAdministrator);

  // Step 3: Retrieve the created administrator using their ID
  const retrievedAdministrator: ITodoAppAdministrator.ISummary =
    await api.functional.todoApp.administrators.at(connection, {
      administratorId: createdAdministrator.id,
    });
  typia.assert(retrievedAdministrator);

  // Step 4: Validate all administrator details are correctly returned
  TestValidator.equals(
    "administrator ID should match created ID",
    retrievedAdministrator.id,
    createdAdministrator.id,
  );

  TestValidator.equals(
    "administrator email should match created email",
    retrievedAdministrator.email,
    createdAdministrator.email,
  );

  TestValidator.equals(
    "administrator first name should match created first name",
    retrievedAdministrator.first_name,
    createdAdministrator.first_name,
  );

  TestValidator.equals(
    "administrator last name should match created last name",
    retrievedAdministrator.last_name,
    createdAdministrator.last_name,
  );

  TestValidator.equals(
    "administrator role level should match created role level",
    retrievedAdministrator.role_level,
    createdAdministrator.role_level,
  );

  TestValidator.equals(
    "administrator creation timestamp should be present",
    retrievedAdministrator.created_at,
    createdAdministrator.created_at,
  );
}
