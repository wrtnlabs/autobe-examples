import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test time report generation grouped by employee dimension.
 *
 * This test validates:
 * 1. Admin authentication and authorization
 * 2. Time report request with employee grouping
 * 3. Response structure validation (group_type, group_id, group_name, hours, entry_count)
 * 4. Pagination functionality
 * 5. Business logic: total_hours = billable_hours + non_billable_hours
 */
export async function test_api_time_report_employee_grouping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Calculate date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  // 3. Request time report with employee grouping
  const reportRequest = {
    grouping: "employee" as const,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IHrmPlatformTimeReport.IRequest;
  const report = await api.functional.hrmPlatform.admin.time_reports.index(
    adminConnection,
    { body: reportRequest },
  );
  typia.assert(report);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    report.pagination.current === 1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    report.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    report.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    report.pagination.pages >= 0,
  );
  // 5. Validate each report entry
  await ArrayUtil.asyncForEach(report.data, async (entry, index) => {
    // Validate group_type is 'employee'
    TestValidator.equals(
      `entry ${index} group_type is employee`,
      entry.group_type,
      "employee",
    );
    // Validate group_id is a valid UUID format (typia.assert already validates this, but we check it exists)
    TestValidator.predicate(
      `entry ${index} group_id is non-empty`,
      entry.group_id.length > 0,
    );
    // Validate group_name is non-empty
    TestValidator.predicate(
      `entry ${index} group_name is non-empty`,
      entry.group_name.length > 0,
    );
    // Validate hours calculation: total_hours = billable_hours + non_billable_hours
    const calculatedTotal = entry.billable_hours + entry.non_billable_hours;
    TestValidator.equals(
      `entry ${index} total_hours equals billable + non_billable`,
      Math.round(entry.total_hours * 100),
      Math.round(calculatedTotal * 100),
    );
    // Validate entry_count is non-negative
    TestValidator.predicate(
      `entry ${index} entry_count is non-negative`,
      entry.entry_count >= 0,
    );
    // Validate all hours are non-negative
    TestValidator.predicate(
      `entry ${index} total_hours is non-negative`,
      entry.total_hours >= 0,
    );
    TestValidator.predicate(
      `entry ${index} billable_hours is non-negative`,
      entry.billable_hours >= 0,
    );
    TestValidator.predicate(
      `entry ${index} non_billable_hours is non-negative`,
      entry.non_billable_hours >= 0,
    );
  });
  // 6. Test pagination (page 2)
  const page2Request = {
    ...reportRequest,
    page: 2,
  } satisfies IHrmPlatformTimeReport.IRequest;
  const reportPage2 = await api.functional.hrmPlatform.admin.time_reports.index(
    adminConnection,
    { body: page2Request },
  );
  typia.assert(reportPage2);
  // Validate page 2 pagination
  TestValidator.equals(
    "page 2 current page is 2",
    reportPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit matches request",
    reportPage2.pagination.limit,
    10,
  );
  // If there are more records, page 2 should have data
  if (report.pagination.records > 10) {
    TestValidator.predicate(
      "page 2 has data when records > 10",
      reportPage2.data.length > 0,
    );
  }
  // 7. Test with weekly_summary enabled
  const weeklyReportRequest = {
    ...reportRequest,
    weekly_summary: true,
  } satisfies IHrmPlatformTimeReport.IRequest;
  const weeklyReport =
    await api.functional.hrmPlatform.admin.time_reports.index(adminConnection, {
      body: weeklyReportRequest,
    });
  typia.assert(weeklyReport);
  // Validate weekly summary structure
  await ArrayUtil.asyncForEach(weeklyReport.data, async (entry) => {
    if (entry.weekly_summary !== undefined) {
      TestValidator.predicate(
        `entry has weekly_summary array`,
        Array.isArray(entry.weekly_summary),
      );
      // Validate each weekly summary entry
      await ArrayUtil.asyncForEach(
        entry.weekly_summary,
        async (weekly, idx) => {
          TestValidator.predicate(
            `weekly summary ${idx} week_start_date is non-empty`,
            weekly.week_start_date.length > 0,
          );
          TestValidator.predicate(
            `weekly summary ${idx} total_hours is non-negative`,
            weekly.total_hours >= 0,
          );
          TestValidator.predicate(
            `weekly summary ${idx} billable_hours is non-negative`,
            weekly.billable_hours >= 0,
          );
          TestValidator.predicate(
            `weekly summary ${idx} non_billable_hours is non-negative`,
            weekly.non_billable_hours >= 0,
          );
          // Validate weekly hours calculation
          const weeklyCalculatedTotal =
            weekly.billable_hours + weekly.non_billable_hours;
          TestValidator.equals(
            `weekly summary ${idx} total_hours equals billable + non_billable`,
            Math.round(weekly.total_hours * 100),
            Math.round(weeklyCalculatedTotal * 100),
          );
        },
      );
    }
  });
}
