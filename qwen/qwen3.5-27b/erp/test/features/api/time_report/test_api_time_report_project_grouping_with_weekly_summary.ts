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
 * Test the time report generation grouped by project dimension with weekly summary breakdown.
 *
 * This test validates:
 * 1. Time report generation with project grouping
 * 2. Weekly summary breakdown functionality
 * 3. Correct aggregation of hours across weeks
 * 4. Proper calculation of billable vs non-billable hours
 */
export async function test_api_time_report_project_grouping_with_weekly_summary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Calculate date range spanning at least 3 weeks
  const now = new Date();
  const threeWeeksAgo = new Date(now.getTime() - 3 * 7 * 24 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week in future
  // 3. Request time report with project grouping and weekly summary
  const report = await api.functional.hrmPlatform.admin.time_reports.index(
    adminConnection,
    {
      body: {
        start_date: threeWeeksAgo.toISOString(),
        end_date: endDate.toISOString(),
        grouping: "project",
        weekly_summary: true,
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTimeReport.IRequest,
    },
  );
  typia.assert(report);
  // 4. Verify pagination structure
  TestValidator.predicate("pagination exists", report.pagination !== undefined);
  TestValidator.predicate(
    "current page is valid",
    report.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    report.pagination.limit >= 1 && report.pagination.limit <= 100,
  );
  // 5. Verify data array exists
  TestValidator.predicate("data array exists", Array.isArray(report.data));
  // 6. If there are report entries, validate their structure
  if (report.data.length > 0) {
    await ArrayUtil.asyncForEach(report.data, async (entry) => {
      // Validate group_type is 'project'
      TestValidator.equals(
        "group_type is project",
        entry.group_type,
        "project",
      );
      // Validate group_id is a valid UUID
      TestValidator.predicate(
        "group_id is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          entry.group_id,
        ),
      );
      // Validate group_name exists and is non-empty
      TestValidator.predicate(
        "group_name is non-empty",
        entry.group_name.length > 0,
      );
      // Validate total_hours is non-negative
      TestValidator.predicate(
        "total_hours is non-negative",
        entry.total_hours >= 0,
      );
      // Validate billable_hours is non-negative
      TestValidator.predicate(
        "billable_hours is non-negative",
        entry.billable_hours >= 0,
      );
      // Validate non_billable_hours is non-negative
      TestValidator.predicate(
        "non_billable_hours is non-negative",
        entry.non_billable_hours >= 0,
      );
      // Validate total_hours equals sum of billable and non-billable
      TestValidator.predicate(
        "total_hours equals billable + non_billable",
        Math.abs(
          entry.total_hours - (entry.billable_hours + entry.non_billable_hours),
        ) < 0.001,
      );
      // Validate entry_count is non-negative
      TestValidator.predicate(
        "entry_count is non-negative",
        entry.entry_count >= 0,
      );
      // 7. Validate weekly_summary if present
      if (
        entry.weekly_summary !== undefined &&
        entry.weekly_summary.length > 0
      ) {
        // Validate weekly_summary is an array
        TestValidator.predicate(
          "weekly_summary is array",
          Array.isArray(entry.weekly_summary),
        );
        // Calculate sum of weekly totals
        let weeklyTotalSum = 0;
        let previousWeekDate: string | null = null;
        await ArrayUtil.asyncForEach(
          entry.weekly_summary,
          async (weeklyEntry) => {
            // Validate week_start_date format (date format)
            TestValidator.predicate(
              "week_start_date is valid date format",
              /^\d{4}-\d{2}-\d{2}$/.test(weeklyEntry.week_start_date),
            );
            // Validate total_hours is non-negative
            TestValidator.predicate(
              "weekly total_hours is non-negative",
              weeklyEntry.total_hours >= 0,
            );
            // Validate billable_hours is non-negative
            TestValidator.predicate(
              "weekly billable_hours is non-negative",
              weeklyEntry.billable_hours >= 0,
            );
            // Validate non_billable_hours is non-negative
            TestValidator.predicate(
              "weekly non_billable_hours is non-negative",
              weeklyEntry.non_billable_hours >= 0,
            );
            // Validate weekly total equals sum of billable and non-billable
            TestValidator.predicate(
              "weekly total equals billable + non_billable",
              Math.abs(
                weeklyEntry.total_hours -
                  (weeklyEntry.billable_hours + weeklyEntry.non_billable_hours),
              ) < 0.001,
            );
            // Accumulate weekly total
            weeklyTotalSum += weeklyEntry.total_hours;
            // Validate weeks are ordered chronologically
            if (previousWeekDate !== null) {
              TestValidator.predicate(
                "weeks are ordered chronologically",
                weeklyEntry.week_start_date >= previousWeekDate,
              );
            }
            previousWeekDate = weeklyEntry.week_start_date;
          },
        );
        // Validate sum of weekly totals equals entry's total_hours
        TestValidator.predicate(
          "sum of weekly totals equals entry total_hours",
          Math.abs(weeklyTotalSum - entry.total_hours) < 0.001,
        );
      }
    });
  }
}
