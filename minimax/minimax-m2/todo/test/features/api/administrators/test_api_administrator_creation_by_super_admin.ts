import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

export async function test_api_administrator_creation_by_super_admin(
  connection: api.IConnection,
) {
  // Step 1: Create a super admin account to establish administrative context
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphabets(10);

  const superAdminAuth: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: superAdminEmail,
        password_hash: superAdminPassword,
        first_name: "Super",
        last_name: "Admin",
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(superAdminAuth);
  TestValidator.equals(
    "super admin ID should exist",
    superAdminAuth.id !== undefined,
    true,
  );

  // Step 2: Create a new administrator account with moderator role level
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(10);

  const newAdministrator: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPassword,
        first_name: "Moderator",
        last_name: "User",
        role_level: "moderator",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(newAdministrator);

  // Step 3: Validate that the administrator was created successfully
  TestValidator.equals(
    "new administrator email should match input",
    newAdministrator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "new administrator role level should be moderator",
    newAdministrator.role_level,
    "moderator",
  );
  TestValidator.equals(
    "new administrator status should be active",
    newAdministrator.status,
    "active",
  );
  TestValidator.equals(
    "new administrator first name should be set",
    newAdministrator.first_name,
    "Moderator",
  );
  TestValidator.equals(
    "new administrator last name should be set",
    newAdministrator.last_name,
    "User",
  );
  TestValidator.equals(
    "new administrator ID should exist",
    newAdministrator.id !== undefined,
    true,
  );
  TestValidator.equals(
    "new administrator created_at should exist",
    newAdministrator.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "new administrator updated_at should exist",
    newAdministrator.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "new administrator should not be deleted",
    newAdministrator.deleted_at,
    null,
  );
}
