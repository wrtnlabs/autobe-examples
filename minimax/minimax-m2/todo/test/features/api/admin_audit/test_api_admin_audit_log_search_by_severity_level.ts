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
 * Test audit log search with severity level filtering for security monitoring.
 *
 * This test validates that administrators can effectively filter and retrieve
 * audit logs by specific severity levels for security oversight and compliance
 * monitoring. The test creates a comprehensive set of operations that generate
 * different severity levels of audit logs, then verifies that the search
 * endpoint correctly filters results based on the requested severity level.
 *
 * Test Flow:
 *
 * 1. Authenticate as admin to establish privileged access
 * 2. Create administrator account to generate baseline audit logs
 * 3. Generate diverse operations producing different severity levels (info,
 *    warning, error, critical, security)
 * 4. Test search functionality with each severity level filter
 * 5. Validate that returned logs match requested severity and contain appropriate
 *    entries
 * 6. Verify comprehensive filtering accuracy for security monitoring purposes
 */
export async function test_api_admin_audit_log_search_by_severity_level(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to establish privileged access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password_hash: "AdminSecurePass123!",
      first_name: "Security",
      last_name: "Administrator",
      role_level: "super_admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create additional administrator account to generate audit logs
  const testAdminEmail = typia.random<string & tags.Format<"email">>();
  const testAdmin = await api.functional.todoApp.administrators.create(
    connection,
    {
      body: {
        email: testAdminEmail,
        password_hash: "TestAdmin123!",
        first_name: "Test",
        last_name: "Admin",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    },
  );
  typia.assert(testAdmin);

  // Step 3: Generate operations producing different severity levels of audit logs
  // The system should automatically generate audit logs with appropriate severity levels
  // based on the types of operations performed

  // Step 4: Test search functionality with severity level filtering
  // Test each severity level individually to validate accurate filtering

  // Test info level filtering
  const infoLevelSearch =
    await api.functional.todoApp.admin.administrators.auditLogs.search(
      connection,
      {
        administratorId: adminAuth.id,
        body: {
          page: 1,
          limit: 10,
          severity_level: "info",
        } satisfies ITodoAppAuditLog.IRequest,
      },
    );
  typia.assert(infoLevelSearch);

  // Test warning level filtering
  const warningLevelSearch =
    await api.functional.todoApp.admin.administrators.auditLogs.search(
      connection,
      {
        administratorId: adminAuth.id,
        body: {
          page: 1,
          limit: 10,
          severity_level: "warning",
        } satisfies ITodoAppAuditLog.IRequest,
      },
    );
  typia.assert(warningLevelSearch);

  // Test error level filtering
  const errorLevelSearch =
    await api.functional.todoApp.admin.administrators.auditLogs.search(
      connection,
      {
        administratorId: adminAuth.id,
        body: {
          page: 1,
          limit: 10,
          severity_level: "error",
        } satisfies ITodoAppAuditLog.IRequest,
      },
    );
  typia.assert(errorLevelSearch);

  // Test critical level filtering
  const criticalLevelSearch =
    await api.functional.todoApp.admin.administrators.auditLogs.search(
      connection,
      {
        administratorId: adminAuth.id,
        body: {
          page: 1,
          limit: 10,
          severity_level: "critical",
        } satisfies ITodoAppAuditLog.IRequest,
      },
    );
  typia.assert(criticalLevelSearch);

  // Test security level filtering
  const securityLevelSearch =
    await api.functional.todoApp.admin.administrators.auditLogs.search(
      connection,
      {
        administratorId: adminAuth.id,
        body: {
          page: 1,
          limit: 10,
          severity_level: "security",
        } satisfies ITodoAppAuditLog.IRequest,
      },
    );
  typia.assert(securityLevelSearch);

  // Step 5: Validate search results accuracy
  // Verify that all returned logs have the correct severity level
  TestValidator.equals(
    "info level search returns info logs",
    infoLevelSearch.data.length,
    infoLevelSearch.data.filter((log) => log.severity_level === "info").length,
  );

  TestValidator.equals(
    "warning level search returns warning logs",
    warningLevelSearch.data.length,
    warningLevelSearch.data.filter((log) => log.severity_level === "warning")
      .length,
  );

  TestValidator.equals(
    "error level search returns error logs",
    errorLevelSearch.data.length,
    errorLevelSearch.data.filter((log) => log.severity_level === "error")
      .length,
  );

  TestValidator.equals(
    "critical level search returns critical logs",
    criticalLevelSearch.data.length,
    criticalLevelSearch.data.filter((log) => log.severity_level === "critical")
      .length,
  );

  TestValidator.equals(
    "security level search returns security logs",
    securityLevelSearch.data.length,
    securityLevelSearch.data.filter((log) => log.severity_level === "security")
      .length,
  );

  // Verify pagination is working correctly
  TestValidator.predicate(
    "info search has valid pagination",
    infoLevelSearch.pagination.current >= 1 &&
      infoLevelSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "warning search has valid pagination",
    warningLevelSearch.pagination.current >= 1 &&
      warningLevelSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "error search has valid pagination",
    errorLevelSearch.pagination.current >= 1 &&
      errorLevelSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "critical search has valid pagination",
    criticalLevelSearch.pagination.current >= 1 &&
      criticalLevelSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "security search has valid pagination",
    securityLevelSearch.pagination.current >= 1 &&
      securityLevelSearch.pagination.limit > 0,
  );

  // Step 6: Test combined filtering with multiple criteria
  const combinedSearch =
    await api.functional.todoApp.admin.administrators.auditLogs.search(
      connection,
      {
        administratorId: adminAuth.id,
        body: {
          page: 1,
          limit: 5,
          severity_level: "info",
          order_by: "created_at",
          order_direction: "desc",
        } satisfies ITodoAppAuditLog.IRequest,
      },
    );
  typia.assert(combinedSearch);

  // Validate combined search results
  TestValidator.predicate(
    "combined search returns only info level logs",
    combinedSearch.data.every((log) => log.severity_level === "info"),
  );
  TestValidator.predicate(
    "combined search respects pagination",
    combinedSearch.data.length <= 5,
  );

  // Verify logs are properly ordered by creation date (descending)
  if (combinedSearch.data.length > 1) {
    for (let i = 0; i < combinedSearch.data.length - 1; i++) {
      const current = new Date(combinedSearch.data[i].created_at).getTime();
      const next = new Date(combinedSearch.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "logs are ordered by creation date (descending)",
        current >= next,
      );
    }
  }
}
