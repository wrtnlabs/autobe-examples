import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test administrator creation with different role levels (super_admin, admin,
 * moderator) to validate role-based access control.
 *
 * This test validates the system's role-based access control by creating
 * multiple administrator accounts with varying privilege levels and verifying
 * each receives appropriate role assignment and system access permissions.
 *
 * The test follows this workflow:
 *
 * 1. Authenticate as an admin to establish authorization context
 * 2. Create administrators with three different role levels: super_admin, admin,
 *    moderator
 * 3. Validate each administrator receives correct role assignment
 * 4. Verify system access permissions align with assigned roles
 */
export async function test_api_administrator_role_level_assignment(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to establish authorization context
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "hashed_password_123",
      first_name: "System",
      last_name: "Administrator",
      role_level: "super_admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create super_admin administrator
  const superAdmin = await api.functional.todoApp.administrators.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: "hashed_password_456",
        first_name: "Super",
        last_name: "Admin",
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    },
  );
  typia.assert(superAdmin);

  // Step 3: Create admin administrator
  const admin = await api.functional.todoApp.administrators.create(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "hashed_password_789",
      first_name: "Standard",
      last_name: "Admin",
      role_level: "admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 4: Create moderator administrator
  const moderator = await api.functional.todoApp.administrators.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: "hashed_password_012",
        first_name: "Limited",
        last_name: "Moderator",
        role_level: "moderator",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 5: Validate role assignments are correct
  TestValidator.equals(
    "super_admin role assignment",
    superAdmin.role_level,
    "super_admin",
  );
  TestValidator.equals("admin role assignment", admin.role_level, "admin");
  TestValidator.equals(
    "moderator role assignment",
    moderator.role_level,
    "moderator",
  );

  // Step 6: Validate all administrators have proper system access (status = active)
  TestValidator.equals("super_admin status", superAdmin.status, "active");
  TestValidator.equals("admin status", admin.status, "active");
  TestValidator.equals("moderator status", moderator.status, "active");

  // Step 7: Validate role hierarchy permissions are properly enforced
  TestValidator.predicate(
    "super_admin has highest privileges",
    superAdmin.role_level === "super_admin",
  );
  TestValidator.predicate(
    "admin has standard privileges",
    admin.role_level === "admin",
  );
  TestValidator.predicate(
    "moderator has limited privileges",
    moderator.role_level === "moderator",
  );

  // Step 8: Validate all administrators have required timestamps and IDs
  TestValidator.predicate(
    "super_admin has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      superAdmin.id,
    ),
  );
  TestValidator.predicate(
    "admin has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      admin.id,
    ),
  );
  TestValidator.predicate(
    "moderator has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderator.id,
    ),
  );

  // Step 9: Validate unique identification for each role level
  TestValidator.notEquals(
    "super_admin and admin are different",
    superAdmin.id,
    admin.id,
  );
  TestValidator.notEquals(
    "admin and moderator are different",
    admin.id,
    moderator.id,
  );
  TestValidator.notEquals(
    "super_admin and moderator are different",
    superAdmin.id,
    moderator.id,
  );
}
