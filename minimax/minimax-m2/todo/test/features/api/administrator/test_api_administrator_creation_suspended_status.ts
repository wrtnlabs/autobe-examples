import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test creating administrator accounts with different status values to validate
 * account lifecycle management. The scenario includes: 1) Creating a super
 * admin account through join, 2) Creating a new administrator with 'suspended'
 * status instead of active, 3) Validating that the suspended administrator is
 * created successfully but marked as suspended for controlled access
 * management. This tests the system's ability to manage administrator account
 * statuses beyond just active accounts.
 */
export async function test_api_administrator_creation_suspended_status(
  connection: api.IConnection,
) {
  // Step 1: Create a super admin account to establish administrative privileges
  const superAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const superAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: superAdminEmail,
        password_hash: "hashedPassword123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(superAdmin);

  // Step 2: Create a new administrator with 'suspended' status
  const suspendedAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const suspendedAdmin: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: suspendedAdminEmail,
        password_hash: "hashedPassword456",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role_level: "admin",
        status: "suspended",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(suspendedAdmin);

  // Step 3: Validate that the suspended administrator is created successfully
  TestValidator.equals(
    "suspended administrator has correct email",
    suspendedAdmin.email,
    suspendedAdminEmail,
  );

  TestValidator.equals(
    "suspended administrator has correct role level",
    suspendedAdmin.role_level,
    "admin",
  );

  // Step 4: Validate that the suspended administrator is marked as suspended
  TestValidator.equals(
    "suspended administrator has suspended status",
    suspendedAdmin.status,
    "suspended",
  );

  TestValidator.predicate(
    "suspended administrator has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      suspendedAdmin.id,
    ),
  );

  TestValidator.predicate(
    "suspended administrator has creation timestamp",
    typeof suspendedAdmin.created_at === "string" &&
      suspendedAdmin.created_at.length > 0,
  );

  TestValidator.predicate(
    "suspended administrator is not null or undefined",
    suspendedAdmin !== null && suspendedAdmin !== undefined,
  );
}
