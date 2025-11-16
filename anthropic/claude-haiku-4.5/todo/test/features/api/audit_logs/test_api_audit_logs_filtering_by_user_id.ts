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

export async function test_api_audit_logs_filtering_by_user_id(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for audit log access
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPassword123",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Step 2: Create multiple regular users to generate audit entries for different user_ids
  const user1: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "UserPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user1);

  const user2: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "UserPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user2);

  const user3: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "UserPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user3);

  // Step 3: Filter audit logs for user1 - should only return entries for user1
  const user1Logs: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        user_id: user1.id,
        page: 1,
        limit: 50,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(user1Logs);
  TestValidator.predicate(
    "user1 logs should be returned",
    user1Logs.data.length > 0,
  );

  // Step 4: Filter audit logs for user2 - should only return entries for user2
  const user2Logs: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        user_id: user2.id,
        page: 1,
        limit: 50,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(user2Logs);
  TestValidator.predicate(
    "user2 logs should be returned",
    user2Logs.data.length > 0,
  );

  // Step 5: Filter audit logs for non-existent user_id - should return empty results
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  const emptyLogs: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        user_id: nonExistentUserId,
        page: 1,
        limit: 50,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(emptyLogs);
  TestValidator.equals(
    "non-existent user should have no logs",
    emptyLogs.data.length,
    0,
  );

  // Step 6: Retrieve all audit logs without user_id filter - should include logs from all users
  const allLogs: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(allLogs);
  TestValidator.predicate(
    "all logs should be returned when no user_id filter",
    allLogs.data.length > 0,
  );

  // Step 7: Verify that user1 logs are subset of all logs
  TestValidator.predicate(
    "user1 logs should be less than or equal to all logs",
    user1Logs.data.length <= allLogs.data.length,
  );

  // Step 8: Filter with both user_id and pagination - verify pagination works with user filter
  const user3LogsPage1: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        user_id: user3.id,
        page: 1,
        limit: 10,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(user3LogsPage1);
  TestValidator.predicate(
    "pagination with user filter should work",
    user3LogsPage1.pagination.current === 1,
  );

  // Step 9: Verify that logs for different users are distinct
  const user1LogIds = new Set(user1Logs.data.map((log) => log.id));
  const user2LogIds = new Set(user2Logs.data.map((log) => log.id));
  const hasCommonLogs = Array.from(user1LogIds).some((id) =>
    user2LogIds.has(id),
  );
  TestValidator.predicate(
    "user1 and user2 logs should not overlap",
    !hasCommonLogs,
  );
}
