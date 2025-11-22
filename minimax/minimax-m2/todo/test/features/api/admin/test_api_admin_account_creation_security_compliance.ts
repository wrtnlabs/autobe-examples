import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

export async function test_api_admin_account_creation_security_compliance(
  connection: api.IConnection,
) {
  // Generate unique email for first admin account
  const adminEmail1 = typia.random<string & tags.Format<"email">>();
  const adminEmail2 = typia.random<string & tags.Format<"email">>();

  // Valid role levels and statuses for testing
  const validRoles = ["super_admin", "admin", "moderator"] as const;
  const validStatuses = ["active", "suspended", "deactivated"] as const;

  // Create first admin account successfully
  const adminData1 = {
    email: adminEmail1,
    password_hash: RandomGenerator.alphaNumeric(64), // Simulated encrypted password hash
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    role_level: RandomGenerator.pick(validRoles),
    status: "active",
  } satisfies ITodoAppAdministrator.ICreate;

  const adminResponse1: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData1,
    });

  // Validate response structure and authentication tokens
  typia.assert(adminResponse1);
  TestValidator.equals("admin ID is valid UUID", adminResponse1.id.length, 36);
  TestValidator.predicate(
    "access token exists",
    adminResponse1.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    adminResponse1.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token is JWT format",
    adminResponse1.token.access.split(".").length === 3,
  );
  TestValidator.predicate(
    "refresh token is JWT format",
    adminResponse1.token.refresh.split(".").length === 3,
  );

  // Test email uniqueness validation by attempting to create duplicate admin
  const duplicateAdminData = {
    email: adminEmail1, // Same email as first admin
    password_hash: RandomGenerator.alphaNumeric(64),
    role_level: "admin",
    status: "active",
  } satisfies ITodoAppAdministrator.ICreate;

  await TestValidator.error("duplicate email should be rejected", async () => {
    await api.functional.auth.admin.join(connection, {
      body: duplicateAdminData,
    });
  });

  // Test different role levels and verify they're accepted
  const rolesToTest = ["super_admin", "admin", "moderator"];
  for (const roleLevel of rolesToTest) {
    const roleTestEmail = typia.random<string & tags.Format<"email">>();
    const roleAdminData = {
      email: roleTestEmail,
      password_hash: RandomGenerator.alphaNumeric(64),
      role_level: roleLevel,
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate;

    const roleAdminResponse: ITodoAppAdministrator.IAuthorized =
      await api.functional.auth.admin.join(connection, {
        body: roleAdminData,
      });
    typia.assert(roleAdminResponse);
    TestValidator.equals(
      `admin role ${roleLevel} creation successful`,
      roleAdminResponse.id.length,
      36,
    );
  }

  // Test different statuses and verify they're accepted
  const statusesToTest = ["active", "suspended", "deactivated"];
  for (const statusValue of statusesToTest) {
    const statusTestEmail = typia.random<string & tags.Format<"email">>();
    const statusAdminData = {
      email: statusTestEmail,
      password_hash: RandomGenerator.alphaNumeric(64),
      role_level: "admin",
      status: statusValue,
    } satisfies ITodoAppAdministrator.ICreate;

    const statusAdminResponse: ITodoAppAdministrator.IAuthorized =
      await api.functional.auth.admin.join(connection, {
        body: statusAdminData,
      });
    typia.assert(statusAdminResponse);
    TestValidator.equals(
      `admin status ${statusValue} creation successful`,
      statusAdminResponse.id.length,
      36,
    );
  }

  // Test optional name fields (first_name and last_name are optional)
  const adminWithOptionalNames = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    role_level: "admin",
    status: "active",
  } satisfies ITodoAppAdministrator.ICreate;

  const optionalNameResponse: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminWithOptionalNames,
    });
  typia.assert(optionalNameResponse);
  TestValidator.equals(
    "admin without names creation successful",
    optionalNameResponse.id.length,
    36,
  );

  // Verify all created admin accounts have unique IDs
  const allAdminIds = [
    adminResponse1.id,
    ...rolesToTest.map(() => typia.random<string & tags.Format<"uuid">>()),
    ...statusesToTest.map(() => typia.random<string & tags.Format<"uuid">>()),
    optionalNameResponse.id,
  ];

  const uniqueIds = Array.from(new Set(allAdminIds));
  TestValidator.equals(
    "all admin IDs are unique",
    uniqueIds.length,
    allAdminIds.length,
  );
}
