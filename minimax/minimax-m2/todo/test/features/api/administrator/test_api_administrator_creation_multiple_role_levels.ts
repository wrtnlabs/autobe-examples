import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

export async function test_api_administrator_creation_multiple_role_levels(
  connection: api.IConnection,
) {
  // Step 1: Create a super admin account through join endpoint
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);

  const superAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: superAdminEmail,
        password_hash: superAdminPassword,
        first_name: "Super",
        last_name: "Administrator",
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(superAdmin);

  // Step 2: Create an administrator with 'admin' role level
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);

  const adminAdministrator: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: "Regular",
        last_name: "Admin",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(adminAdministrator);

  // Step 3: Create another administrator with 'moderator' role level
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);

  const moderatorAdministrator: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPassword,
        first_name: "System",
        last_name: "Moderator",
        role_level: "moderator",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(moderatorAdministrator);

  // Step 4: Validate that all accounts are created successfully with appropriate role assignments and status
  TestValidator.equals(
    "super admin has correct role level",
    superAdmin.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "admin has correct role level",
    adminAdministrator.role_level,
    "admin",
  );
  TestValidator.equals(
    "moderator has correct role level",
    moderatorAdministrator.role_level,
    "moderator",
  );
  TestValidator.equals(
    "admin has active status",
    adminAdministrator.status,
    "active",
  );
  TestValidator.equals(
    "moderator has active status",
    moderatorAdministrator.status,
    "active",
  );
  TestValidator.predicate(
    "all administrators have unique IDs",
    superAdmin.id !== adminAdministrator.id &&
      adminAdministrator.id !== moderatorAdministrator.id &&
      superAdmin.id !== moderatorAdministrator.id,
  );
}
