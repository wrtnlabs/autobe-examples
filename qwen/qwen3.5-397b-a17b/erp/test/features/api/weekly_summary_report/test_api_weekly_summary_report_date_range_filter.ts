import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test the weekly summary report endpoint correctly filters aggregated metrics by date range.
 *
 * Validates the complete date range filtering functionality for weekly summary reports including from date filtering, to date filtering, combined date range filtering, empty result handling, and pagination accuracy. Ensures that weeks are correctly included or excluded based on ISO week boundaries.
 *
 * Special attention is given to verifying that the from filter includes only weeks where week_start_date >= from, the to filter includes only weeks where week_end_date <= to, and combined filters correctly bound results on both ends. Edge cases include date range boundaries that align with ISO week boundaries (Monday/Sunday) and empty result sets when the date range contains no timelogs.
 *
 * 1. Member registers and authenticates.
 * 2. Organization is created for context.
 * 3. Employee invitation is created and accepted.
 * 4. Timelogs are created spanning 8+ weeks across different ISO weeks.
 * 5. Test from date filter: only weeks with week_start_date >= from are included.
 * 6. Test to date filter: only weeks with week_end_date <= to are included.
 * 7. Test combined from/to filter: results bounded by both dates.
 * 8. Test empty result: date range with no timelogs returns empty data array.
 * 9. Validate pagination metadata accurately reflects filtered result count.
 */
export async function test_api_weekly_summary_report_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create employee invitation (member becomes employee)
  // The prepare function handles role_id internally
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: member.email,
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        },
      },
    );
  typia.assert(invitation);
  // 4. Create timelogs spanning 8+ weeks
  // Generate dates spanning from 8 weeks ago to current week
  const now = new Date();
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);
  // Create timelogs for different weeks (Mondays)
  const timelogDates: string[] = [];
  for (let i = 0; i < 8; i++) {
    const weekDate = new Date(
      eightWeeksAgo.getTime() + i * 7 * 24 * 60 * 60 * 1000,
    );
    // Set to Monday of that week (ISO week start)
    const dayOfWeek = weekDate.getDay();
    const diff = weekDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(weekDate.setDate(diff));
    timelogDates.push(monday.toISOString().split("T")[0] + "T00:00:00.000Z");
  }
  // Create timelogs across the date range
  // The prepare function handles project_id internally
  for (const date of timelogDates) {
    const timelog = await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: date,
          duration_minutes: 480, // 8 hours
        },
      },
    );
    typia.assert(timelog);
  }
  // 5. Test from date filter
  // Get the week_start_date of the 4th timelog (middle of range)
  const fromDate = timelogDates[4];
  const fromDateOnly = fromDate.split("T")[0];
  const fromResult =
    await api.functional.hrmPlatform.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          from: fromDate,
          limit: 100,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(fromResult);
  // Validate all weeks have week_start_date >= from
  for (const week of fromResult.data) {
    TestValidator.predicate(
      `week_start_date >= from (${fromDateOnly})`,
      week.week_start_date >= fromDateOnly,
    );
  }
  // 6. Test to date filter
  const toDate = timelogDates[6];
  const toDateOnly = toDate.split("T")[0];
  const toResult =
    await api.functional.hrmPlatform.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          to: toDate,
          limit: 100,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(toResult);
  // Validate all weeks have week_end_date <= to
  for (const week of toResult.data) {
    TestValidator.predicate(
      `week_end_date <= to (${toDateOnly})`,
      week.week_end_date <= toDateOnly,
    );
  }
  // 7. Test combined from/to filter
  const combinedFrom = timelogDates[2];
  const combinedTo = timelogDates[5];
  const combinedFromDateOnly = combinedFrom.split("T")[0];
  const combinedToDateOnly = combinedTo.split("T")[0];
  const combinedResult =
    await api.functional.hrmPlatform.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          from: combinedFrom,
          to: combinedTo,
          limit: 100,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Validate all weeks are within the combined range
  for (const week of combinedResult.data) {
    TestValidator.predicate(
      `week within combined range`,
      week.week_start_date >= combinedFromDateOnly &&
        week.week_end_date <= combinedToDateOnly,
    );
  }
  // 8. Test empty result set
  const futureDate = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyResult =
    await api.functional.hrmPlatform.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          from: futureDate,
          limit: 100,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result has no data", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result pagination records",
    emptyResult.pagination.records,
    0,
  );
  // 9. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page valid",
    fromResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    fromResult.pagination.limit >= 1,
  );
  TestValidator.equals(
    "pagination records matches data length for single page",
    fromResult.pagination.records,
    fromResult.data.length,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    fromResult.pagination.pages,
    Math.ceil(fromResult.pagination.records / fromResult.pagination.limit),
  );
}
