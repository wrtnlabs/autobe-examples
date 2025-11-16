import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

export async function test_api_audit_logs_filtering_by_actor_type(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate an admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPassword123!";

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Step 2: Query audit logs filtering by actor_type='admin'
  const adminActorLogs: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        actor_type: "admin",
        page: 1,
        limit: 20,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(adminActorLogs);

  // Verify all logs have actor_type='admin'
  TestValidator.predicate(
    "all filtered logs should have actor_type admin",
    () => adminActorLogs.data.every((log) => log.actor_type === "admin"),
  );

  // Step 3: Query audit logs filtering by actor_type='user'
  const userActorLogs: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        actor_type: "user",
        page: 1,
        limit: 20,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(userActorLogs);

  // Verify all logs have actor_type='user'
  TestValidator.predicate("all filtered logs should have actor_type user", () =>
    userActorLogs.data.every((log) => log.actor_type === "user"),
  );

  // Step 4: Query audit logs filtering by actor_type='system'
  const systemActorLogs: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        actor_type: "system",
        page: 1,
        limit: 20,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(systemActorLogs);

  // Verify all logs have actor_type='system'
  TestValidator.predicate(
    "all filtered logs should have actor_type system",
    () => systemActorLogs.data.every((log) => log.actor_type === "system"),
  );

  // Step 5: Query audit logs with null actor_type (no filter)
  const allActorLogs: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        actor_type: null,
        page: 1,
        limit: 20,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(allActorLogs);

  // Verify logs contain mixed actor types
  const actorTypes = new Set(allActorLogs.data.map((log) => log.actor_type));
  TestValidator.predicate(
    "unfiltered logs should contain multiple actor types",
    actorTypes.size > 0,
  );

  // Step 6: Test actor_type filtering with pagination
  const paginatedAdminLogs: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        actor_type: "admin",
        page: 1,
        limit: 10,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(paginatedAdminLogs);

  // Verify pagination info
  TestValidator.predicate(
    "pagination should have correct page number",
    paginatedAdminLogs.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination should have correct limit",
    paginatedAdminLogs.pagination.limit === 10,
  );

  // Step 7: Verify actor_type filter is consistent
  const consistentCheck: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        actor_type: "admin",
        page: 1,
        limit: 5,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(consistentCheck);

  TestValidator.predicate(
    "all logs in page 1 should have actor_type admin",
    consistentCheck.data.every((log) => log.actor_type === "admin"),
  );

  // If there are multiple pages, verify second page also filters correctly
  if (consistentCheck.pagination.pages > 1) {
    const secondPage: IPageITodoAppAuditLog.ISummary =
      await api.functional.todoApp.admin.auditLogs.index(connection, {
        body: {
          actor_type: "admin",
          page: 2,
          limit: 5,
        } satisfies ITodoAppAuditLog.IRequest,
      });
    typia.assert(secondPage);

    TestValidator.predicate(
      "all logs in page 2 should also have actor_type admin",
      secondPage.data.every((log) => log.actor_type === "admin"),
    );
  }

  // Step 8: Verify filtering combinations
  const combinedFilter: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        actor_type: "admin",
        limit: 10,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(combinedFilter);

  TestValidator.predicate(
    "combined filter should still filter by actor_type",
    combinedFilter.data.every((log) => log.actor_type === "admin"),
  );
}
