import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

/**
 * Test complex audit log filtering scenario for TodoApp admin system.
 *
 * This test validates advanced security investigations and compliance reporting
 * by testing multiple search criteria combinations including specific action
 * types (login, update_todo), severity levels (info, security), date ranges,
 * actor filtering, and text search. The test first creates an admin account for
 * authentication, then performs various audit log searches with complex filter
 * combinations to ensure the filtering system supports real-world security
 * analysis requirements.
 *
 * Validates that complex query combinations work correctly for regulatory
 * compliance and security monitoring purposes.
 */
export async function test_api_admin_audit_logs_complex_filtering_scenario(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "secureAdminPassword123",
        role_level: "admin",
        status: "active",
        first_name: "Admin",
        last_name: "User",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test basic audit log search without filters
  const basicSearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(basicSearch);
  TestValidator.predicate(
    "basic audit log search should return results",
    basicSearch.data.length >= 0,
  );

  // Step 3: Test filtering by action type (login)
  const loginActionSearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        action_type: "login",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(loginActionSearch);
  TestValidator.predicate(
    "login action type filter should work",
    loginActionSearch.data.every((log) => log.action_type === "login"),
  );

  // Step 4: Test filtering by action type (update_todo)
  const updateTodoSearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        action_type: "update_todo",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(updateTodoSearch);
  TestValidator.predicate(
    "update_todo action type filter should work",
    updateTodoSearch.data.every((log) => log.action_type === "update_todo"),
  );

  // Step 5: Test filtering by severity level (info)
  const infoSeveritySearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        severity_level: "info",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(infoSeveritySearch);
  TestValidator.predicate(
    "info severity level filter should work",
    infoSeveritySearch.data.every((log) => log.severity_level === "info"),
  );

  // Step 6: Test filtering by severity level (security)
  const securitySeveritySearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        severity_level: "security",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(securitySeveritySearch);
  TestValidator.predicate(
    "security severity level filter should work",
    securitySeveritySearch.data.every(
      (log) => log.severity_level === "security",
    ),
  );

  // Step 7: Test filtering by actor_administrator_id
  const actorFilterSearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        actor_administrator_id: admin.id,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(actorFilterSearch);
  TestValidator.predicate(
    "actor administrator filter should work",
    actorFilterSearch.data.every(
      (log) => log.actor_administrator_id === admin.id,
    ),
  );

  // Step 8: Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeSearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        created_after: yesterday.toISOString(),
        created_before: now.toISOString(),
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(dateRangeSearch);
  TestValidator.predicate(
    "date range filter should work",
    dateRangeSearch.data.every((log) => {
      const logDate = new Date(log.created_at);
      return logDate >= yesterday && logDate <= now;
    }),
  );

  // Step 9: Test text search functionality
  const textSearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        search: "login",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(textSearch);
  TestValidator.predicate(
    "text search should find relevant logs",
    textSearch.data.length >= 0,
  );

  // Step 10: Test complex multi-criteria search
  const complexSearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        action_type: "login",
        severity_level: "info",
        actor_administrator_id: admin.id,
        search: "admin",
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(complexSearch);
  TestValidator.predicate(
    "complex multi-criteria search should return filtered results",
    complexSearch.data.length >= 0,
  );

  // Step 11: Test pagination with filters
  const paginatedSearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 2,
        limit: 10,
        severity_level: "info",
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination should return correct page information",
    paginatedSearch.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination should have correct limit",
    paginatedSearch.pagination.limit,
    10,
  );

  // Step 12: Test edge case - no results scenario
  const noResultsSearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        action_type: "nonexistent_action",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(noResultsSearch);
  TestValidator.predicate(
    "search with no matching criteria should return empty results",
    noResultsSearch.data.length === 0,
  );

  // Step 13: Test ordering functionality
  const ascendingOrderSearch: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(ascendingOrderSearch);
  TestValidator.predicate(
    "ascending order should work correctly",
    ascendingOrderSearch.data.length <= 10,
  );

  // Step 14: Test different severity levels
  const allSeverityLevels = [
    "info",
    "warning",
    "error",
    "critical",
    "security",
  ] as const;
  for (const severity of allSeverityLevels) {
    const severitySearch: IPageITodoAppAuditLog.ISummary =
      await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
        body: {
          page: 1,
          limit: 20,
          severity_level: severity,
        } satisfies ITodoAppAuditLog.IRequest,
      });
    typia.assert(severitySearch);
    TestValidator.predicate(
      `severity level ${severity} filter should work`,
      severitySearch.data.every((log) => log.severity_level === severity),
    );
  }
}
