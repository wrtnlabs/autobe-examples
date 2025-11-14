import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";

export async function test_api_audit_logs_search_by_action_and_date(
  connection: api.IConnection,
) {
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: "hashed_password",
        role: "admin",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Ensure we have audit logs for test
  const actionTypes = [
    "USER_CREATE",
    "USER_UPDATE",
    "USER_DELETE",
    "TODO_CREATE",
    "TODO_UPDATE",
    "TODO_DELETE",
  ];
  const auditLogs: ITodoAppAuditLog[] = ArrayUtil.repeat(20, (i) => {
    const now = new Date();
    const timestamp = new Date(
      now.getTime() - (i * 24 * 60 * 60 * 1000 - 1000),
    ).toISOString();

    return {
      id: typia.random<string>(),
      adminId: admin.id,
      userId: i % 2 === 0 ? typia.random<string>() : undefined,
      todoId: i % 3 === 0 ? typia.random<string>() : undefined,
      actionType: actionTypes[i % actionTypes.length],
      entityType: i % 2 === 0 ? "User" : "Todo",
      oldData: i % 4 === 0 ? '{"status": "inactive"}' : undefined,
      newData: i % 4 === 0 ? '{"status": "active"}' : undefined,
      ipAddress: typia.random<string>(),
      userAgent: typia.random<string>(),
      createdAt: timestamp,
    } satisfies ITodoAppAuditLog;
  });

  // Test: Search by action type = USER_CREATE
  const searchResult: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.audit.auditLogs.patch(connection, {
      body: "action=USER_CREATE" satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(searchResult);

  typia.assert(searchResult.pagination);
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    0,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);

  // Filter expected results
  const expectedResults = auditLogs.filter(
    (log) => log.actionType === "USER_CREATE",
  );
  TestValidator.equals(
    "search results count",
    searchResult.items.length,
    expectedResults.length,
  );
  searchResult.items.forEach((item) => {
    TestValidator.equals("action type matches", item.actionType, "USER_CREATE");
  });

  // Test: Search by date range
  const now = new Date();
  const startDate = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(); // 2 days ago
  const endDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago

  const dateRangeResult =
    await api.functional.todoApp.admin.audit.auditLogs.patch(connection, {
      body: `start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}` satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(dateRangeResult);
  typia.assert(dateRangeResult.pagination);

  dateRangeResult.items.forEach((item) => {
    TestValidator.predicate(
      "date within range",
      item.createdAt >= endDate && item.createdAt <= startDate,
    );
  });

  // Test: Search by action type and date range combined
  const combinedResult =
    await api.functional.todoApp.admin.audit.auditLogs.patch(connection, {
      body: `action=USER_CREATE&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}` satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(combinedResult);
  typia.assert(combinedResult.pagination);

  combinedResult.items.forEach((item) => {
    TestValidator.equals("action type matches", item.actionType, "USER_CREATE");
    TestValidator.predicate(
      "date within range",
      item.createdAt >= endDate && item.createdAt <= startDate,
    );
  });

  // Test: Edge case - search with exact date boundary
  const boundaryDate = auditLogs[0].createdAt;
  const boundaryResult =
    await api.functional.todoApp.admin.audit.auditLogs.patch(connection, {
      body: `start_date=${encodeURIComponent(boundaryDate)}&end_date=${encodeURIComponent(boundaryDate)}` satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(boundaryResult);
  typia.assert(boundaryResult.pagination);

  const boundaryMatches = auditLogs.filter(
    (log) => log.createdAt === boundaryDate,
  );
  TestValidator.equals(
    "boundary search results",
    boundaryResult.items.length,
    boundaryMatches.length,
  );

  // Test: Search with no matching criteria returns empty array
  const emptyResult = await api.functional.todoApp.admin.audit.auditLogs.patch(
    connection,
    {
      body: "action=NON_EXISTENT_ACTION" satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(emptyResult);
  typia.assert(emptyResult.pagination);
  TestValidator.equals("empty search results", emptyResult.items.length, 0);

  // Test: Search with empty request body (all records)
  const allResult = await api.functional.todoApp.admin.audit.auditLogs.patch(
    connection,
    {
      body: "" satisfies ITodoAppAuditLog.IRequest,
    },
  );
  typia.assert(allResult);
  typia.assert(allResult.pagination);
  TestValidator.equals(
    "all records count",
    allResult.items.length,
    auditLogs.length,
  );
}
