import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

export async function test_api_administrator_creation_complete_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create existing administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const existingAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password_hash: "secureAdminPassword123",
      first_name: "John",
      last_name: "Doe",
      role_level: "super_admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(existingAdmin);

  // Step 2: Create new administrator account using authenticated connection
  const newAdminEmail = typia.random<string & tags.Format<"email">>();
  const newAdministrator = await api.functional.todoApp.administrators.create(
    connection,
    {
      body: {
        email: newAdminEmail,
        password_hash: "newAdminPassword456",
        first_name: "Jane",
        last_name: "Smith",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    },
  );
  typia.assert(newAdministrator);

  // Step 3: Validate the created administrator account
  TestValidator.equals(
    "created administrator has valid UUID",
    newAdministrator.id,
    newAdministrator.id,
  );
  TestValidator.equals(
    "administrator email matches input",
    newAdministrator.email,
    newAdminEmail,
  );
  TestValidator.equals(
    "administrator first name matches",
    newAdministrator.first_name,
    "Jane",
  );
  TestValidator.equals(
    "administrator last name matches",
    newAdministrator.last_name,
    "Smith",
  );
  TestValidator.equals(
    "administrator role level matches",
    newAdministrator.role_level,
    "admin",
  );
  TestValidator.equals(
    "administrator status is active",
    newAdministrator.status,
    "active",
  );
  TestValidator.predicate(
    "administrator has creation timestamp",
    newAdministrator.created_at !== null &&
      newAdministrator.created_at !== undefined,
  );
  TestValidator.predicate(
    "administrator has update timestamp",
    newAdministrator.updated_at !== null &&
      newAdministrator.updated_at !== undefined,
  );
  TestValidator.predicate(
    "administrator is not soft deleted",
    newAdministrator.deleted_at === null ||
      newAdministrator.deleted_at === undefined,
  );
}
