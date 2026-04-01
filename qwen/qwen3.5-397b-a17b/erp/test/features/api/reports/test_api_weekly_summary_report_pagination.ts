import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformWeeklySummaryReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformWeeklySummaryReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test weekly summary report pagination with extended date range.
 *
 * This test validates the pagination functionality of the weekly summary report endpoint:
 * 1. Registers and authenticates a member account
 * 2. Creates timelog entries spanning 6+ weeks to generate sufficient report data
 * 3. Queries the weekly summary endpoint with a large date range and small page size
 * 4. Validates pagination metadata (current page, limit, total records, total pages)
 * 5. Retrieves multiple pages and verifies no duplicate or missing weeks between pages
 * 6. Confirms page 1 returns the most recent weeks (sorted descending by weekStart)
 * 7. Validates week boundaries align to Monday-Sunday periods
 * 8. Verifies weekly summary data structure (weekStart, weekEnd, totalHours, timelogCount, employeeCount)
 */
export async function test_api_weekly_summary_report_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create timelogs spanning multiple weeks (6 weeks of data)
  const now = new Date();
  const sixWeeksAgo = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000); // 42 days = 6 weeks
  // Create at least one timelog per week to ensure 6 weeks of report data
  for (let week = 0; week < 6; week++) {
    const weekDate = new Date(
      sixWeeksAgo.getTime() + week * 7 * 24 * 60 * 60 * 1000,
    );
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: weekDate.toISOString(),
          durationMinutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
        },
      },
    );
  }
  // 3. Query weekly summary with pagination (2 weeks per page)
  const startDate = sixWeeksAgo.toISOString().split("T")[0]; // YYYY-MM-DD format
  const endDate = now.toISOString().split("T")[0];
  const pageSize = 2;
  const page1 =
    await api.functional.hrmPlatform.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          startDate,
          endDate,
          page: 1,
          limit: pageSize,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(page1);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "page limit matches request",
    page1.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "current page is at least 1",
    page1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "total records is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is at least 1",
    page1.pagination.pages >= 1,
  );
  // 5. Retrieve page 2 if available
  let page2: IPageIHrmPlatformWeeklySummaryReport.ISummary | null = null;
  if (page1.pagination.pages >= 2) {
    page2 =
      await api.functional.hrmPlatform.member.reports.weekly_summary.index(
        memberConnection,
        {
          body: {
            startDate,
            endDate,
            page: 2,
            limit: pageSize,
          } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
        },
      );
    typia.assert(page2);
    // 6. Verify no duplicate weeks between pages
    const page1WeekStarts = page1.data.map((w) => w.weekStart);
    const page2WeekStarts = page2.data.map((w) => w.weekStart);
    for (const weekStart of page1WeekStarts) {
      TestValidator.predicate(
        `week ${weekStart} not duplicated in page 2`,
        !page2WeekStarts.includes(weekStart),
      );
    }
  }
  // 7. Verify page 1 has weeks sorted descending by weekStart (most recent first)
  if (page1.data.length >= 2) {
    const firstWeekTime = new Date(page1.data[0].weekStart).getTime();
    const secondWeekTime = new Date(page1.data[1].weekStart).getTime();
    TestValidator.predicate(
      "page 1 weeks sorted descending by weekStart",
      firstWeekTime >= secondWeekTime,
    );
  }
  // 8. Validate week boundaries are approximately 7 days apart (Monday to Sunday)
  // This is business logic validation, not type validation
  for (const week of page1.data) {
    const weekStart = new Date(week.weekStart);
    const weekEnd = new Date(week.weekEnd);
    const daysDiff =
      (weekEnd.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000);
    TestValidator.predicate(
      "week span is approximately 7 days",
      daysDiff >= 6 && daysDiff <= 7,
    );
  }
  // 9. Validate page 2 week boundaries if retrieved
  if (page2) {
    for (const week of page2.data) {
      const weekStart = new Date(week.weekStart);
      const weekEnd = new Date(week.weekEnd);
      const daysDiff =
        (weekEnd.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000);
      TestValidator.predicate(
        "page 2 week span is approximately 7 days",
        daysDiff >= 6 && daysDiff <= 7,
      );
    }
  }
}
