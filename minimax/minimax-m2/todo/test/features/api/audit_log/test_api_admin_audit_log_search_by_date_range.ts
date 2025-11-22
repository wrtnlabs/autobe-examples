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
 * Validate audit log search functionality with temporal filtering using date
 * ranges.
 *
 * This test scenario validates the comprehensive audit log filtering
 * capabilities of the TodoApp administrative system. The test creates an
 * authenticated admin session, performs various administrative activities to
 * generate audit log entries across different time periods, and then validates
 * that the audit log search API correctly filters results based on temporal
 * constraints using created_after and created_before parameters.
 *
 * The scenario tests the system's ability to:
 *
 * 1. Maintain comprehensive audit trails across all administrative actions
 * 2. Provide accurate temporal filtering for security monitoring
 * 3. Support compliance reporting with precise time-based queries
 * 4. Enable effective operational oversight through time-based log analysis
 *
 * This validation ensures the audit logging system meets enterprise-grade
 * requirements for security monitoring, regulatory compliance, and operational
 * transparency in the TodoApp platform.
 */
export async function test_api_admin_audit_log_search_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to establish session and permissions
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphabets(12);

  const adminSession: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        role_level: "admin",
        status: "active",
        first_name: "Admin",
        last_name: "User",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(adminSession);

  // Step 2: Create a new administrator account to generate audit log entries
  // This will create the first set of audit logs with initial timestamps
  const createdAdministrator: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphabets(12),
        role_level: "moderator",
        status: "active",
        first_name: "Test",
        last_name: "Administrator",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(createdAdministrator);

  // Step 3: Wait a moment to ensure distinct timestamps for audit log entries
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 4: Perform additional administrative activities to generate more audit logs
  // Creating another administrator to generate a second set of audit entries
  const secondAdministrator: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphabets(12),
        role_level: "super_admin",
        status: "active",
        first_name: "Second",
        last_name: "Admin",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(secondAdministrator);

  // Step 5: Wait to establish clear time separation for date range testing
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 6: Capture current timestamp for date range boundaries
  const middleTimestamp: string = new Date().toISOString();

  // Step 7: Perform more activities to create later audit log entries
  // Update the first created administrator to generate additional audit logs
  // Note: We need to find an appropriate update endpoint or create more administrators
  const thirdAdministrator: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphabets(12),
        role_level: "admin",
        status: "active",
        first_name: "Third",
        last_name: "Admin",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(thirdAdministrator);

  // Step 8: Wait and capture final timestamp for date range testing
  await new Promise((resolve) => setTimeout(resolve, 100));
  const finalTimestamp: string = new Date().toISOString();

  // Step 9: Test 1 - Search with both created_after and created_before filters
  // This should return only audit logs within the specified time window
  const rangeSearchResult: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.administrators.auditLogs.search(
      connection,
      {
        administratorId: adminSession.id,
        body: {
          page: 1,
          limit: 50,
          created_after: middleTimestamp,
          created_before: finalTimestamp,
        } satisfies ITodoAppAuditLog.IRequest,
      },
    );
  typia.assert(rangeSearchResult);

  // Validate that the search results contain logs within the specified date range
  TestValidator.predicate(
    "date range search should return logs within specified timeframe",
    rangeSearchResult.data.length > 0,
  );

  // Step 10: Test 2 - Search with only created_after filter
  // This should return all logs created after the specified timestamp
  const afterSearchResult: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.administrators.auditLogs.search(
      connection,
      {
        administratorId: adminSession.id,
        body: {
          page: 1,
          limit: 50,
          created_after: middleTimestamp,
        } satisfies ITodoAppAuditLog.IRequest,
      },
    );
  typia.assert(afterSearchResult);

  // The after-only search should include more or equal logs than the range search
  TestValidator.predicate(
    "created_after filter should include logs from the middle timestamp onwards",
    afterSearchResult.data.length >= rangeSearchResult.data.length,
  );

  // Step 11: Test 3 - Search with only created_before filter
  // This should return all logs created before the specified timestamp
  const beforeSearchResult: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.administrators.auditLogs.search(
      connection,
      {
        administratorId: adminSession.id,
        body: {
          page: 1,
          limit: 50,
          created_before: finalTimestamp,
        } satisfies ITodoAppAuditLog.IRequest,
      },
    );
  typia.assert(beforeSearchResult);

  // The before-only search should include more or equal logs than the range search
  TestValidator.predicate(
    "created_before filter should include logs up to the final timestamp",
    beforeSearchResult.data.length >= rangeSearchResult.data.length,
  );

  // Step 12: Test 4 - Validate temporal filtering accuracy
  // Verify that all returned logs in range search have timestamps within the specified bounds
  const allLogsInRange: boolean = rangeSearchResult.data.every((log) => {
    const logTimestamp: Date = new Date(log.created_at);
    const afterBound: Date = new Date(middleTimestamp);
    const beforeBound: Date = new Date(finalTimestamp);
    return logTimestamp >= afterBound && logTimestamp <= beforeBound;
  });

  TestValidator.predicate(
    "all returned audit logs should fall within the specified date range",
    allLogsInRange,
  );

  // Step 13: Test 5 - Search with a narrow date range to test precision
  const narrowStartTime: string = new Date(Date.now() - 50).toISOString();
  const narrowEndTime: string = new Date(Date.now() - 25).toISOString();

  const narrowRangeResult: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.administrators.auditLogs.search(
      connection,
      {
        administratorId: adminSession.id,
        body: {
          page: 1,
          limit: 50,
          created_after: narrowStartTime,
          created_before: narrowEndTime,
        } satisfies ITodoAppAuditLog.IRequest,
      },
    );
  typia.assert(narrowRangeResult);

  // Validate that narrow range search works correctly
  const narrowLogsInRange: boolean = narrowRangeResult.data.every((log) => {
    const logTimestamp: Date = new Date(log.created_at);
    const startBound: Date = new Date(narrowStartTime);
    const endBound: Date = new Date(narrowEndTime);
    return logTimestamp >= startBound && logTimestamp <= endBound;
  });

  TestValidator.predicate(
    "narrow date range search should accurately filter audit logs by precise time window",
    narrowLogsInRange,
  );

  // Step 14: Validate pagination works correctly with date filters
  // Ensure that pagination maintains proper date filtering across pages
  const secondPageResult: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.administrators.auditLogs.search(
      connection,
      {
        administratorId: adminSession.id,
        body: {
          page: 2,
          limit: 10,
          created_after: middleTimestamp,
          created_before: finalTimestamp,
        } satisfies ITodoAppAuditLog.IRequest,
      },
    );
  typia.assert(secondPageResult);

  // Verify that second page results also respect date filtering
  const secondPageLogsInRange: boolean = secondPageResult.data.every((log) => {
    const logTimestamp: Date = new Date(log.created_at);
    const afterBound: Date = new Date(middleTimestamp);
    const beforeBound: Date = new Date(finalTimestamp);
    return logTimestamp >= afterBound && logTimestamp <= beforeBound;
  });

  TestValidator.predicate(
    "pagination should maintain date filtering constraints across all pages",
    secondPageLogsInRange,
  );
}
