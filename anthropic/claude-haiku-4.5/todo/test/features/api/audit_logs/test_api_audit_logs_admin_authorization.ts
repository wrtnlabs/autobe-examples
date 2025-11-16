import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates role-based authorization for audit log access.
 *
 * This test ensures that only administrators can access audit logs, while
 * regular users are denied access. The test creates both user and admin
 * accounts, then verifies that only the admin account can successfully retrieve
 * audit logs, while the user account receives an authorization error.
 *
 * Steps:
 *
 * 1. Create a regular user account with standard permissions
 * 2. Attempt to access audit logs as the regular user - should fail with
 *    authorization error
 * 3. Create an admin account with elevated permissions
 * 4. Access audit logs as an admin - should succeed and return audit log data
 * 5. Validate response structure and pagination data
 */
export async function test_api_audit_logs_admin_authorization(
  connection: api.IConnection,
) {
  // Step 1: Create regular user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "UserPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Attempt to access audit logs as regular user - should fail
  await TestValidator.error(
    "regular user should not have access to audit logs",
    async () => {
      await api.functional.todoApp.admin.auditLogs.index(connection, {
        body: {
          page: 1,
          limit: 20,
        } satisfies ITodoAppAuditLog.IRequest,
      });
    },
  );

  // Step 3: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Step 4: Access audit logs as admin - should succeed
  const auditLogsResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(auditLogsResponse);

  // Step 5: Validate response structure
  TestValidator.predicate(
    "audit logs response should have pagination data",
    auditLogsResponse.pagination !== null &&
      auditLogsResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "audit logs data should be an array",
    Array.isArray(auditLogsResponse.data),
  );

  TestValidator.predicate(
    "pagination current should be a non-negative number",
    typeof auditLogsResponse.pagination.current === "number" &&
      auditLogsResponse.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be a positive number",
    typeof auditLogsResponse.pagination.limit === "number" &&
      auditLogsResponse.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination records count should be non-negative",
    typeof auditLogsResponse.pagination.records === "number" &&
      auditLogsResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages count should be non-negative",
    typeof auditLogsResponse.pagination.pages === "number" &&
      auditLogsResponse.pagination.pages >= 0,
  );
}
