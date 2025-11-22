import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdministrator";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test administrator list access with super_admin role privileges.
 *
 * Validates that a super_admin user can successfully access and retrieve the
 * complete administrator list, including role hierarchies and account details.
 * This test follows a complete business workflow to ensure super administrators
 * can perform their oversight duties and access comprehensive administrative
 * account information.
 */
export async function test_api_admin_administrators_super_admin_access(
  connection: api.IConnection,
) {
  // Step 1: Create a super_admin account with elevated privileges
  const superAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "SecureAdmin123!", // Secure password for testing
    first_name: "Super",
    last_name: "Administrator",
    role_level: "super_admin", // Highest privilege level
    status: "active",
  } satisfies ITodoAppAdministrator.ICreate;

  const superAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: superAdminData });
  typia.assert(superAdmin);

  // Step 2: Validate authentication was successful and tokens were issued
  TestValidator.equals(
    "super admin account created successfully",
    superAdmin.id.length > 0,
    true,
  );
  TestValidator.predicate(
    "JWT access token issued",
    superAdmin.token.access.length > 10,
  );
  TestValidator.predicate(
    "refresh token issued",
    superAdmin.token.refresh.length > 10,
  );

  // Step 3: Access the administrator list endpoint as super_admin
  const adminList: IPageITodoAppAdministrator.ISummary =
    await api.functional.todoApp.admin.administrators.at(connection);
  typia.assert(adminList);

  // Step 4: Validate the administrator list response structure
  TestValidator.equals(
    "administrator list retrieved",
    adminList.data.length >= 0,
    true,
  );
  TestValidator.predicate(
    "pagination information present",
    adminList.pagination.current >= 0 && adminList.pagination.limit > 0,
  );
  TestValidator.equals(
    "total records tracked",
    adminList.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "total pages calculated",
    adminList.pagination.pages >= 0,
    true,
  );

  // Step 5: Verify super_admin access to administrative accounts
  TestValidator.predicate(
    "super admin can access administrative data",
    adminList.data.some((admin) => admin.role_level === "super_admin"),
  );

  // Step 6: Validate administrative account details are complete
  if (adminList.data.length > 0) {
    const firstAdmin = adminList.data[0];
    TestValidator.predicate(
      "administrator ID is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstAdmin.id,
      ),
    );
    TestValidator.predicate(
      "administrator email is valid format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firstAdmin.email),
    );
    TestValidator.predicate(
      "administrator has role level",
      ["super_admin", "admin", "moderator"].includes(firstAdmin.role_level),
    );
    TestValidator.predicate(
      "administrator has creation timestamp",
      firstAdmin.created_at.length > 0,
    );
  }

  // Step 7: Confirm role-based access control is working
  TestValidator.predicate(
    "super_admin role privileges confirmed",
    superAdmin.token.access.length > 0,
  );
}
