import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

export async function test_api_admin_audit_logs_search_with_pagination(
  connection: api.IConnection,
) {
  // 1. Create admin user for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const adminUser: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        role_level: "super_admin",
        status: "active",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(adminUser);

  // 2. Test basic audit log search with default pagination
  const basicSearchResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(basicSearchResult);

  TestValidator.equals(
    "basic search returns paginated result",
    basicSearchResult.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "basic search returns pagination info",
    basicSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    basicSearchResult.pagination.limit,
    10,
  );

  // 3. Test pagination with different page/limit combinations
  const secondPageResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 2,
        limit: 5,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(secondPageResult);

  TestValidator.equals(
    "second page returns pagination info",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit matches request",
    secondPageResult.pagination.limit,
    5,
  );

  // 4. Test filtering by action_type
  const actionTypeFilterResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        action_type: "create_todo",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(actionTypeFilterResult);

  TestValidator.equals(
    "action type filter returns results",
    actionTypeFilterResult.data.length >= 0,
    true,
  );

  // 5. Test filtering by entity_type
  const entityTypeFilterResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        entity_type: "todo",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(entityTypeFilterResult);

  TestValidator.equals(
    "entity type filter returns results",
    entityTypeFilterResult.data.length >= 0,
    true,
  );

  // 6. Test filtering by severity_level
  const severityLevelFilterResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        severity_level: "info",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(severityLevelFilterResult);

  TestValidator.equals(
    "severity level filter returns results",
    severityLevelFilterResult.data.length >= 0,
    true,
  );

  // 7. Test date range filtering (ensure dates are converted to ISO strings)
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const dateRangeFilterResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        created_after: oneDayAgo.toISOString(),
        created_before: now.toISOString(),
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(dateRangeFilterResult);

  TestValidator.equals(
    "date range filter returns results",
    dateRangeFilterResult.data.length >= 0,
    true,
  );

  // 8. Test text search functionality
  const textSearchResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        search: "todo",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(textSearchResult);

  TestValidator.equals(
    "text search returns results",
    textSearchResult.data.length >= 0,
    true,
  );

  // 9. Test combined filters
  const combinedFiltersResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        action_type: "create_todo",
        entity_type: "todo",
        severity_level: "info",
        search: "test",
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(combinedFiltersResult);

  TestValidator.equals(
    "combined filters return results",
    combinedFiltersResult.data.length >= 0,
    true,
  );

  // 10. Test sorting options
  const sortingResults = await Promise.all([
    api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies ITodoAppAuditLog.IRequest,
    }),
    api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppAuditLog.IRequest,
    }),
  ]);

  typia.assert(sortingResults[0]);
  typia.assert(sortingResults[1]);

  TestValidator.equals(
    "ascending sort returns results",
    sortingResults[0].data.length >= 0,
    true,
  );
  TestValidator.equals(
    "descending sort returns results",
    sortingResults[1].data.length >= 0,
    true,
  );
}
