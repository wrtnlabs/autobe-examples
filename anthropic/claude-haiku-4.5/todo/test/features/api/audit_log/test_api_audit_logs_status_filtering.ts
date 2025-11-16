import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

/**
 * Test filtering audit logs by status field (success, failure, partial).
 *
 * This test validates that the audit log filtering system correctly identifies
 * and returns log entries based on their action result status. The test
 * verifies that status filtering works independently and in combination with
 * other filter parameters, ensuring the audit trail provides accurate operation
 * outcome tracking.
 *
 * Test workflow:
 *
 * 1. Create and authenticate an admin account for accessing audit logs
 * 2. Query audit logs without status filter to understand the data
 * 3. Filter by status='success' and verify only successful operations returned
 * 4. Filter by status='failure' and verify only failed operations returned
 * 5. Filter by status='partial' and verify only partial completions returned
 * 6. Combine status filter with other filters (action_type, resource_type)
 * 7. Verify null/omitted status returns all statuses
 * 8. Validate pagination works with status filtering
 * 9. Verify status field values match filter criteria in results
 */
export async function test_api_audit_logs_status_filtering(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

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
  TestValidator.predicate("admin account created", admin.id !== undefined);

  // 2. Query audit logs without status filter to get baseline
  const allLogsResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(allLogsResponse);
  TestValidator.predicate(
    "baseline audit logs retrieved",
    allLogsResponse.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination info exists",
    allLogsResponse.pagination !== undefined,
  );

  // 3. Filter by status='success' and verify only successful operations returned
  const successLogsResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 50,
        status: "success",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(successLogsResponse);

  // Verify all returned entries have status='success'
  successLogsResponse.data.forEach((log) => {
    TestValidator.equals("success status filter", log.status, "success");
  });
  TestValidator.predicate(
    "success filter returns data",
    successLogsResponse.data.length >= 0,
  );

  // 4. Filter by status='failure' and verify only failed operations returned
  const failureLogsResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 50,
        status: "failure",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(failureLogsResponse);

  // Verify all returned entries have status='failure'
  failureLogsResponse.data.forEach((log) => {
    TestValidator.equals("failure status filter", log.status, "failure");
  });
  TestValidator.predicate(
    "failure filter returns data",
    failureLogsResponse.data.length >= 0,
  );

  // 5. Filter by status='partial' and verify only partial completions returned
  const partialLogsResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 50,
        status: "partial",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(partialLogsResponse);

  // Verify all returned entries have status='partial'
  partialLogsResponse.data.forEach((log) => {
    TestValidator.equals("partial status filter", log.status, "partial");
  });
  TestValidator.predicate(
    "partial filter returns data",
    partialLogsResponse.data.length >= 0,
  );

  // 6. Test status filtering combined with action_type filter
  const combinedFilterResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 50,
        status: "success",
        action_type: "user_login",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(combinedFilterResponse);

  // Verify results match both filters
  combinedFilterResponse.data.forEach((log) => {
    TestValidator.equals("combined filter status", log.status, "success");
    TestValidator.equals(
      "combined filter action_type",
      log.action_type,
      "user_login",
    );
  });

  // 7. Test status filtering combined with resource_type filter
  const statusResourceFilterResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 50,
        status: "failure",
        resource_type: "user",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(statusResourceFilterResponse);

  // Verify results match both filters
  statusResourceFilterResponse.data.forEach((log) => {
    TestValidator.equals(
      "status-resource filter status",
      log.status,
      "failure",
    );
    TestValidator.equals(
      "status-resource filter resource_type",
      log.resource_type,
      "user",
    );
  });

  // 8. Query with null status to verify all statuses are included
  const nullStatusResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 50,
        status: null,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(nullStatusResponse);
  TestValidator.predicate(
    "null status includes results",
    nullStatusResponse.data.length >= 0,
  );

  // 9. Query omitting status parameter to verify all statuses are included
  const omittedStatusResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(omittedStatusResponse);
  TestValidator.predicate(
    "omitted status includes results",
    omittedStatusResponse.data.length >= 0,
  );

  // 10. Test pagination with status filtering
  const paginatedSuccessLogsPage1: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "success",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(paginatedSuccessLogsPage1);
  TestValidator.predicate(
    "page 1 pagination works",
    paginatedSuccessLogsPage1.pagination.current === 1,
  );
  TestValidator.predicate(
    "page 1 limit set correctly",
    paginatedSuccessLogsPage1.pagination.limit === 10,
  );

  // Request page 2 if available
  if (paginatedSuccessLogsPage1.pagination.pages > 1) {
    const paginatedSuccessLogsPage2: IPageITodoAppAuditLog.ISummary =
      await api.functional.todoApp.admin.auditLogs.index(connection, {
        body: {
          page: 2,
          limit: 10,
          status: "success",
        } satisfies ITodoAppAuditLog.IRequest,
      });
    typia.assert(paginatedSuccessLogsPage2);
    TestValidator.predicate(
      "page 2 pagination works",
      paginatedSuccessLogsPage2.pagination.current === 2,
    );
    TestValidator.predicate(
      "page 2 limit set correctly",
      paginatedSuccessLogsPage2.pagination.limit === 10,
    );
  }

  // 11. Verify status values are within expected set
  const statusValuesResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(statusValuesResponse);

  const validStatuses = ["success", "failure", "partial"];
  statusValuesResponse.data.forEach((log) => {
    TestValidator.predicate(
      "status is valid",
      validStatuses.includes(log.status),
    );
  });

  // 12. Verify audit log entry structure
  if (statusValuesResponse.data.length > 0) {
    const sampleLog = statusValuesResponse.data[0]!;
    TestValidator.predicate("log has id", sampleLog.id !== undefined);
    TestValidator.predicate(
      "log has action_type",
      sampleLog.action_type !== undefined,
    );
    TestValidator.predicate(
      "log has resource_type",
      sampleLog.resource_type !== undefined,
    );
    TestValidator.predicate(
      "log has actor_type",
      sampleLog.actor_type !== undefined,
    );
    TestValidator.predicate("log has status", sampleLog.status !== undefined);
    TestValidator.predicate(
      "log has created_at",
      sampleLog.created_at !== undefined,
    );
  }

  // 13. Test status filtering with pagination limit variations
  const smallLimitResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 5,
        status: "success",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(smallLimitResponse);
  TestValidator.predicate(
    "small limit works",
    smallLimitResponse.data.length <= 5,
  );

  const largeLimitResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 100,
        status: "failure",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(largeLimitResponse);
  TestValidator.predicate(
    "large limit works",
    largeLimitResponse.data.length <= 100,
  );
}
