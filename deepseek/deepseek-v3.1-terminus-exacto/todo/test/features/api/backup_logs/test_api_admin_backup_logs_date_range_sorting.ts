import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoBackupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoBackupLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoBackupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoBackupLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test backup logs date range filtering and sorting capabilities.
 *
 * As an admin, filter backup logs by started_at and completed_at date ranges
 * and test various sorting configurations. Validates that:
 * 1. Date range filters work correctly (started_after, started_before, completed_after, completed_before)
 * 2. Sorting by started_at, completed_at, backup_type works in both ascending and descending directions
 * 3. Pagination works correctly with date filters
 * 4. Edge cases like null completed_at values are handled properly
 */
export async function test_api_admin_backup_logs_date_range_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Get baseline backup logs to understand available data
  const baseline = await api.functional.multiUserTodo.admin.backup_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoBackupLog.IRequest,
    },
  );
  typia.assert(baseline);
  if (baseline.data.length === 0) {
    // No backup logs available - test cannot proceed meaningfully
    console.log("No backup logs available for testing");
    return;
  }
  // 3. Test date range filtering with started_after (last 24 hours)
  const now = new Date();
  const twentyFourHoursAgo = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const recentLogs = await api.functional.multiUserTodo.admin.backup_logs.index(
    adminConnection,
    {
      body: {
        started_after: twentyFourHoursAgo satisfies string &
          tags.Format<"date-time">,
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoBackupLog.IRequest,
    },
  );
  typia.assert(recentLogs);
  // Validate all returned logs are within the date range
  for (const log of recentLogs.data) {
    const startedAt = new Date(log.started_at);
    const filterDate = new Date(twentyFourHoursAgo);
    TestValidator.predicate(
      "log started within last 24 hours",
      startedAt >= filterDate,
    );
  }
  // 4. Test specific date range (last week to now)
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const weekRangeLogs =
    await api.functional.multiUserTodo.admin.backup_logs.index(
      adminConnection,
      {
        body: {
          started_after: oneWeekAgo satisfies string & tags.Format<"date-time">,
          started_before: now.toISOString() satisfies string &
            tags.Format<"date-time">,
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoBackupLog.IRequest,
      },
    );
  typia.assert(weekRangeLogs);
  // Validate date range constraints
  for (const log of weekRangeLogs.data) {
    const startedAt = new Date(log.started_at);
    const startDate = new Date(oneWeekAgo);
    const endDate = new Date(now.toISOString());
    TestValidator.predicate(
      "log within week range",
      startedAt >= startDate && startedAt <= endDate,
    );
  }
  // 5. Test completed logs filtering
  const completedLogs =
    await api.functional.multiUserTodo.admin.backup_logs.index(
      adminConnection,
      {
        body: {
          status: "completed",
          completed_after: oneWeekAgo satisfies string &
            tags.Format<"date-time">,
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoBackupLog.IRequest,
      },
    );
  typia.assert(completedLogs);
  // Validate all are completed and have completed_at timestamps
  for (const log of completedLogs.data) {
    TestValidator.equals("log status is completed", log.status, "completed");
    TestValidator.predicate(
      "completed_at exists",
      log.completed_at !== null && log.completed_at !== undefined,
    );
    if (log.completed_at) {
      const completedAt = new Date(log.completed_at);
      const filterDate = new Date(oneWeekAgo);
      TestValidator.predicate(
        "completed after specified date",
        completedAt >= filterDate,
      );
    }
  }
  // 6. Test sorting by started_at (ascending)
  const sortedByStartedAsc =
    await api.functional.multiUserTodo.admin.backup_logs.index(
      adminConnection,
      {
        body: {
          sort: "started_at",
          direction: "asc",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoBackupLog.IRequest,
      },
    );
  typia.assert(sortedByStartedAsc);
  // Validate ascending order
  for (let i = 1; i < sortedByStartedAsc.data.length; i++) {
    const prev = new Date(sortedByStartedAsc.data[i - 1].started_at);
    const curr = new Date(sortedByStartedAsc.data[i].started_at);
    TestValidator.predicate(
      "logs sorted by started_at ascending",
      prev <= curr,
    );
  }
  // 7. Test sorting by started_at (descending)
  const sortedByStartedDesc =
    await api.functional.multiUserTodo.admin.backup_logs.index(
      adminConnection,
      {
        body: {
          sort: "started_at",
          direction: "desc",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoBackupLog.IRequest,
      },
    );
  typia.assert(sortedByStartedDesc);
  // Validate descending order
  for (let i = 1; i < sortedByStartedDesc.data.length; i++) {
    const prev = new Date(sortedByStartedDesc.data[i - 1].started_at);
    const curr = new Date(sortedByStartedDesc.data[i].started_at);
    TestValidator.predicate(
      "logs sorted by started_at descending",
      prev >= curr,
    );
  }
  // 8. Test sorting by backup_type
  const sortedByType =
    await api.functional.multiUserTodo.admin.backup_logs.index(
      adminConnection,
      {
        body: {
          sort: "backup_type",
          direction: "asc",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoBackupLog.IRequest,
      },
    );
  typia.assert(sortedByType);
  // Backup type sorting validation (string comparison)
  for (let i = 1; i < sortedByType.data.length; i++) {
    const prev = sortedByType.data[i - 1].backup_type;
    const curr = sortedByType.data[i].backup_type;
    TestValidator.predicate("backup_type sorted ascending", prev <= curr);
  }
  // 9. Test sorting by completed_at with null handling
  const sortedByCompleted =
    await api.functional.multiUserTodo.admin.backup_logs.index(
      adminConnection,
      {
        body: {
          sort: "completed_at",
          direction: "asc",
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoBackupLog.IRequest,
      },
    );
  typia.assert(sortedByCompleted);
  // Count logs with null completed_at (should appear at end for asc, beginning for desc)
  const nullCompletedCount = sortedByCompleted.data.filter(
    (log) => !log.completed_at,
  ).length;
  // For ascending: nulls should be at the end
  if (nullCompletedCount > 0) {
    const nonNullLogs = sortedByCompleted.data.slice(
      0,
      sortedByCompleted.data.length - nullCompletedCount,
    );
    const nullLogs = sortedByCompleted.data.slice(-nullCompletedCount);
    // Verify non-null logs are in ascending order
    for (let i = 1; i < nonNullLogs.length; i++) {
      const prev = new Date(nonNullLogs[i - 1].completed_at!);
      const curr = new Date(nonNullLogs[i].completed_at!);
      TestValidator.predicate(
        "non-null completed_at sorted ascending",
        prev <= curr,
      );
    }
    // Verify all null logs have null completed_at
    for (const log of nullLogs) {
      TestValidator.predicate(
        "null completed_at at end",
        log.completed_at === null || log.completed_at === undefined,
      );
    }
  }
  // 10. Test pagination with date filters
  const paginatedResult =
    await api.functional.multiUserTodo.admin.backup_logs.index(
      adminConnection,
      {
        body: {
          started_after: oneWeekAgo satisfies string & tags.Format<"date-time">,
          page: 1,
          limit: 3,
        } satisfies IMultiUserTodoBackupLog.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "page 1 limit matches",
    paginatedResult.data.length <= 3,
    true,
  );
  TestValidator.predicate(
    "pagination metadata exists",
    paginatedResult.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    paginatedResult.pagination.limit,
    3,
  );
  // 11. Test empty result set with non-matching date range (future date)
  const futureDate = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyResult =
    await api.functional.multiUserTodo.admin.backup_logs.index(
      adminConnection,
      {
        body: {
          started_after: futureDate satisfies string & tags.Format<"date-time">,
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoBackupLog.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Should have 0 records for future date filter
  TestValidator.equals("no logs for future date", emptyResult.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    emptyResult.pagination.pages,
    0,
  );
  // 12. Test combined filter with backup_type and date range
  const combinedFilter =
    await api.functional.multiUserTodo.admin.backup_logs.index(
      adminConnection,
      {
        body: {
          backup_type: "full",
          started_after: oneWeekAgo satisfies string & tags.Format<"date-time">,
          sort: "started_at",
          direction: "desc",
          page: 1,
          limit: 5,
        } satisfies IMultiUserTodoBackupLog.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Validate all results are full backups
  for (const log of combinedFilter.data) {
    TestValidator.equals("backup_type is full", log.backup_type, "full");
    const startedAt = new Date(log.started_at);
    const filterDate = new Date(oneWeekAgo);
    TestValidator.predicate(
      "started after one week ago",
      startedAt >= filterDate,
    );
  }
  // Validate descending order
  for (let i = 1; i < combinedFilter.data.length; i++) {
    const prev = new Date(combinedFilter.data[i - 1].started_at);
    const curr = new Date(combinedFilter.data[i].started_at);
    TestValidator.predicate("combined filter sorted descending", prev >= curr);
  }
}
