import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";

/**
 * Test temporal audit log analysis by searching logs within specific date
 * ranges.
 *
 * Administrator authenticates and queries audit logs with start and end date
 * filters to retrieve activities within a defined time window. The test
 * validates that all returned logs fall within the specified date range and
 * that the system correctly handles various date range scenarios including
 * single day, week-long, month-long, and custom ranges. This supports
 * time-bound investigations and compliance reporting requirements.
 */
export async function test_api_audit_logs_date_range_investigation(
  connection: api.IConnection,
) {
  // 1. Create and authenticate administrator account
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // 2. Test single day date range
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const todayEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
  );

  const singleDayResult: IPageIDiscussionBoardAuditLog =
    await api.functional.discussionBoard.administrator.audit.logs.index(
      connection,
      {
        body: {
          start_date: todayStart.toISOString(),
          end_date: todayEnd.toISOString(),
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(singleDayResult);

  // Validate all logs fall within single day range
  for (const log of singleDayResult.data) {
    const logDate = new Date(log.created_at);
    TestValidator.predicate(
      "log date should be within single day range",
      logDate >= todayStart && logDate <= todayEnd,
    );
  }

  // 3. Test week-long date range
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekStart = new Date(
    weekAgo.getFullYear(),
    weekAgo.getMonth(),
    weekAgo.getDate(),
  );

  const weekRangeResult: IPageIDiscussionBoardAuditLog =
    await api.functional.discussionBoard.administrator.audit.logs.index(
      connection,
      {
        body: {
          start_date: weekStart.toISOString(),
          end_date: todayEnd.toISOString(),
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(weekRangeResult);

  // Validate all logs fall within week range
  for (const log of weekRangeResult.data) {
    const logDate = new Date(log.created_at);
    TestValidator.predicate(
      "log date should be within week range",
      logDate >= weekStart && logDate <= todayEnd,
    );
  }

  // 4. Test month-long date range
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(
    monthAgo.getFullYear(),
    monthAgo.getMonth(),
    monthAgo.getDate(),
  );

  const monthRangeResult: IPageIDiscussionBoardAuditLog =
    await api.functional.discussionBoard.administrator.audit.logs.index(
      connection,
      {
        body: {
          start_date: monthStart.toISOString(),
          end_date: todayEnd.toISOString(),
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(monthRangeResult);

  // Validate all logs fall within month range
  for (const log of monthRangeResult.data) {
    const logDate = new Date(log.created_at);
    TestValidator.predicate(
      "log date should be within month range",
      logDate >= monthStart && logDate <= todayEnd,
    );
  }

  // 5. Test custom date range (15 days)
  const fifteenDaysAgo = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000);
  const customStart = new Date(
    fifteenDaysAgo.getFullYear(),
    fifteenDaysAgo.getMonth(),
    fifteenDaysAgo.getDate(),
  );
  const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
  const customEnd = new Date(
    fiveDaysAgo.getFullYear(),
    fiveDaysAgo.getMonth(),
    fiveDaysAgo.getDate(),
    23,
    59,
    59,
  );

  const customRangeResult: IPageIDiscussionBoardAuditLog =
    await api.functional.discussionBoard.administrator.audit.logs.index(
      connection,
      {
        body: {
          start_date: customStart.toISOString(),
          end_date: customEnd.toISOString(),
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(customRangeResult);

  // Validate all logs fall within custom range
  for (const log of customRangeResult.data) {
    const logDate = new Date(log.created_at);
    TestValidator.predicate(
      "log date should be within custom range",
      logDate >= customStart && logDate <= customEnd,
    );
  }

  // 6. Test pagination with date range filters
  const paginatedResult: IPageIDiscussionBoardAuditLog =
    await api.functional.discussionBoard.administrator.audit.logs.index(
      connection,
      {
        body: {
          start_date: monthStart.toISOString(),
          end_date: todayEnd.toISOString(),
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(paginatedResult);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be 1",
    paginatedResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    paginatedResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "data array length should not exceed limit",
    paginatedResult.data.length <= 10,
  );
}
