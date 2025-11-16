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
 * Test filtering audit logs by resource_type.
 *
 * Validates that the audit logs API correctly filters entries by resource type
 * (user, todo, authentication, etc.). The test creates various audit log
 * entries through admin and user account creation, then systematically filters
 * by each resource type to ensure only relevant entries are returned.
 *
 * Steps:
 *
 * 1. Create admin account to generate authentication audit entries
 * 2. Create user accounts to generate user and authentication audit entries
 * 3. Query audit logs with resource_type='user' and verify only user-related
 *    entries
 * 4. Query audit logs with resource_type='authentication' and verify only auth
 *    entries
 * 5. Query audit logs with resource_type=null and verify all resource types
 *    returned
 * 6. Validate filtering combines correctly with pagination
 * 7. Verify each entry's resource_type matches the filter criteria
 */
export async function test_api_audit_logs_filtering_by_resource_type(
  connection: api.IConnection,
) {
  // Step 1: Create admin account to generate authentication audit entries
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "adminPassword123",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Step 2: Create user accounts to generate user and authentication audit entries
  const userEmails = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"email">>(),
  );

  const users: ITodoAppUser.IAuthorized[] = [];
  for (const userEmail of userEmails) {
    const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
      connection,
      {
        body: {
          email: userEmail,
          password: "userPassword123",
          href: "http://localhost/register",
          referrer: "http://localhost/",
        } satisfies ITodoAppUser.ICreate,
      },
    );
    typia.assert(user);
    users.push(user);
  }

  // Step 3: Query audit logs with resource_type='user'
  const userResourceLogs: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        resource_type: "user",
        page: 1,
        limit: 50,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(userResourceLogs);

  // Verify all returned entries have resource_type='user'
  TestValidator.predicate(
    "all user resource logs have resource_type='user'",
    userResourceLogs.data.every((log) => log.resource_type === "user"),
  );

  TestValidator.predicate(
    "user resource logs contain entries",
    userResourceLogs.data.length > 0,
  );

  // Step 4: Query audit logs with resource_type='authentication'
  const authResourceLogs: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        resource_type: "authentication",
        page: 1,
        limit: 50,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(authResourceLogs);

  // Verify all returned entries have resource_type='authentication'
  TestValidator.predicate(
    "all authentication resource logs have resource_type='authentication'",
    authResourceLogs.data.every(
      (log) => log.resource_type === "authentication",
    ),
  );

  TestValidator.predicate(
    "authentication resource logs contain entries",
    authResourceLogs.data.length > 0,
  );

  // Step 5: Query audit logs with null resource_type (all types)
  const allResourceLogs: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        resource_type: null,
        page: 1,
        limit: 100,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(allResourceLogs);

  // Verify all logs are returned when resource_type is null
  TestValidator.predicate(
    "null resource_type returns logs with various resource types",
    allResourceLogs.data.length >= userResourceLogs.data.length,
  );

  // Step 6: Query audit logs without resource_type parameter (all types)
  const allResourceLogsOmitted: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(allResourceLogsOmitted);

  TestValidator.predicate(
    "omitted resource_type returns all resource types",
    allResourceLogsOmitted.data.length > 0,
  );

  // Step 7: Verify filtering combines with pagination
  const pagedUserLogs: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        resource_type: "user",
        page: 1,
        limit: 10,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(pagedUserLogs);

  TestValidator.predicate(
    "pagination limit is respected",
    pagedUserLogs.data.length <= 10,
  );

  TestValidator.predicate(
    "paginated results still filter by resource_type",
    pagedUserLogs.data.every((log) => log.resource_type === "user"),
  );

  // Step 8: Verify distinct resource types are separated
  const resourceTypes = new Set(
    allResourceLogs.data.map((log) => log.resource_type),
  );
  TestValidator.predicate(
    "multiple resource types exist in all logs",
    resourceTypes.size > 1,
  );

  // Verify filtering results in subset of all logs
  TestValidator.predicate(
    "user filtered logs are subset of all logs",
    userResourceLogs.data.length <= allResourceLogs.data.length,
  );

  TestValidator.predicate(
    "authentication filtered logs are subset of all logs",
    authResourceLogs.data.length <= allResourceLogs.data.length,
  );
}
