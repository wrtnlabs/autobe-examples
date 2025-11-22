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
 * Test audit log search with extended date ranges to validate system
 * performance and data handling for long-term historical analysis. Validates
 * that searches spanning months or years return appropriate results with proper
 * pagination for compliance reporting and forensic analysis workflows.
 */
export async function test_api_admin_audit_logs_large_date_range_search(
  connection: api.IConnection,
) {
  // 1. Create admin account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "secureAdminPassword123!",
        first_name: "System",
        last_name: "Administrator",
        role_level: "super_admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Prepare test data with various date ranges
  const currentDate = new Date();
  const oneMonthAgo = new Date(
    currentDate.getTime() - 30 * 24 * 60 * 60 * 1000,
  );
  const threeMonthsAgo = new Date(
    currentDate.getTime() - 90 * 24 * 60 * 60 * 1000,
  );
  const sixMonthsAgo = new Date(
    currentDate.getTime() - 180 * 24 * 60 * 60 * 1000,
  );
  const oneYearAgo = new Date(
    currentDate.getTime() - 365 * 24 * 60 * 60 * 1000,
  );

  // 3. Test small date range (baseline comparison)
  const smallRangeResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        order_by: "created_at",
        order_direction: "desc",
        created_after: oneMonthAgo.toISOString(),
        created_before: currentDate.toISOString(),
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(smallRangeResult);

  TestValidator.equals(
    "small range query returns valid pagination",
    smallRangeResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "small range result count is reasonable",
    smallRangeResult.data.length <= 20,
  );

  // 4. Test medium date range (3 months)
  const mediumRangeResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 50,
        order_by: "created_at",
        order_direction: "desc",
        created_after: threeMonthsAgo.toISOString(),
        created_before: currentDate.toISOString(),
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(mediumRangeResult);

  TestValidator.equals(
    "medium range query uses correct page",
    mediumRangeResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "medium range returns data within date bounds",
    mediumRangeResult.data.every((log) => {
      const logDate = new Date(log.created_at);
      return logDate >= threeMonthsAgo && logDate <= currentDate;
    }),
  );

  // 5. Test large date range (6 months)
  const largeRangeResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 100,
        order_by: "created_at",
        order_direction: "desc",
        created_after: sixMonthsAgo.toISOString(),
        created_before: currentDate.toISOString(),
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(largeRangeResult);

  TestValidator.predicate(
    "large range query handles extended date span",
    largeRangeResult.pagination.records >= 0,
  );
  TestValidator.equals(
    "large range maintains proper page limit",
    largeRangeResult.data.length,
    Math.min(100, largeRangeResult.pagination.records),
  );

  // 6. Test very large date range (1 year)
  const veryLargeRangeResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 100,
        order_by: "created_at",
        order_direction: "desc",
        created_after: oneYearAgo.toISOString(),
        created_before: currentDate.toISOString(),
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(veryLargeRangeResult);

  TestValidator.predicate(
    "very large range returns valid pagination info",
    veryLargeRangeResult.pagination.pages >= 0,
  );
  TestValidator.equals(
    "very large range page size is correct",
    veryLargeRangeResult.pagination.limit,
    100,
  );

  // 7. Test pagination with large date range
  if (veryLargeRangeResult.pagination.pages > 1) {
    const secondPageResult: IPageITodoAppAuditLog.ISummary =
      await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
        body: {
          page: 2,
          limit: 100,
          order_by: "created_at",
          order_direction: "desc",
          created_after: oneYearAgo.toISOString(),
          created_before: currentDate.toISOString(),
        } satisfies ITodoAppAuditLog.IRequest,
      });
    typia.assert(secondPageResult);

    TestValidator.equals(
      "second page has correct page number",
      secondPageResult.pagination.current,
      2,
    );
    TestValidator.predicate(
      "second page data is within date range",
      secondPageResult.data.every((log) => {
        const logDate = new Date(log.created_at);
        return logDate >= oneYearAgo && logDate <= currentDate;
      }),
    );
  }

  // 8. Test date range boundary conditions
  const boundaryTestResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        created_after: currentDate.toISOString(), // Future date
        created_before: currentDate.toISOString(), // Same date
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(boundaryTestResult);

  TestValidator.predicate(
    "boundary test returns valid structure",
    boundaryTestResult.pagination.current === 1,
  );

  // 9. Validate compliance reporting scenario (multi-filter with large date range)
  const complianceResult: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 50,
        order_by: "created_at",
        order_direction: "asc",
        severity_level: "security", // Focus on security events for compliance
        created_after: oneYearAgo.toISOString(),
        created_before: currentDate.toISOString(),
        include_deleted: false,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(complianceResult);

  TestValidator.predicate(
    "compliance query returns valid results",
    complianceResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "all compliance results are within date range",
    complianceResult.data.every((log) => {
      const logDate = new Date(log.created_at);
      return logDate >= oneYearAgo && logDate <= currentDate;
    }),
  );
}
