import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIWeeklySummaryReport";
import type { IWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeeklySummaryReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test weekly summary report retrieval with date range filtering.
 *
 * This test verifies that authenticated admins can retrieve weekly summary
 * reports showing aggregated time tracking data organized by calendar week.
 * The test validates:
 * - Admin authentication via join endpoint
 * - Weekly summary report retrieval with date range parameters
 * - Response structure with pagination and weekly aggregated data
 * - Each week's summary includes total hours, timelog count, and employee count
 * - Results are sorted by week descending (most recent first)
 */
export async function test_api_weekly_summary_report_with_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Calculate date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  // 3. Request weekly summary report with date range
  const report =
    await api.functional.hrmPlatform.admin.weekly_summary_reports.index(
      adminConnection,
      {
        body: {
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          page: 1,
          limit: 20,
        } satisfies IWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(report);
  // 4. Validate pagination metadata
  TestValidator.equals("pagination current page", report.pagination.current, 1);
  TestValidator.equals("pagination limit", report.pagination.limit, 20);
  TestValidator.predicate(
    "pagination has non-negative records",
    report.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    report.pagination.pages >= 0,
  );
  // 5. Validate weekly summary data structure and business logic
  await ArrayUtil.asyncForEach(report.data, async (weeklySummary, index) => {
    typia.assert(weeklySummary);
    // Validate week span is exactly 7 days (Monday to Sunday)
    const weekStart = new Date(weeklySummary.week_start_date);
    const weekEnd = new Date(weeklySummary.week_end_date);
    const diffInDays = Math.floor(
      (weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    TestValidator.equals(`week ${index} spans exactly 7 days`, diffInDays, 6);
    // Validate aggregation data is non-negative
    TestValidator.predicate(
      `week ${index} has non-negative total hours`,
      weeklySummary.total_hours >= 0,
    );
    TestValidator.predicate(
      `week ${index} has non-negative timelog count`,
      weeklySummary.timelog_count >= 0,
    );
    TestValidator.predicate(
      `week ${index} has non-negative employee count`,
      weeklySummary.employee_count >= 0,
    );
    // Validate employee count is reasonable (cannot exceed timelog count)
    if (weeklySummary.timelog_count > 0) {
      TestValidator.predicate(
        `week ${index} employee count <= timelog count`,
        weeklySummary.employee_count <= weeklySummary.timelog_count,
      );
    }
  });
  // 6. Validate sorting (most recent week first)
  const validateSorting = (currentIndex: number) => {
    if (currentIndex >= report.data.length - 1) return;
    const previousWeek = new Date(report.data[currentIndex].week_start_date);
    const nextWeek = new Date(report.data[currentIndex + 1].week_start_date);
    TestValidator.predicate(
      `results sorted by week descending (week ${currentIndex} > week ${currentIndex + 1})`,
      previousWeek > nextWeek,
    );
    validateSorting(currentIndex + 1);
  };
  if (report.data.length > 1) {
    validateSorting(0);
  }
  // 7. Validate data count matches pagination
  TestValidator.predicate(
    "data length does not exceed limit",
    report.data.length <= report.pagination.limit,
  );
  // 8. Validate total hours calculation is reasonable
  const totalHoursAcrossAllWeeks = report.data.reduce(
    (sum, weeklySummary) => sum + weeklySummary.total_hours,
    0,
  );
  TestValidator.predicate(
    "total hours across all weeks is non-negative",
    totalHoursAcrossAllWeeks >= 0,
  );
}
