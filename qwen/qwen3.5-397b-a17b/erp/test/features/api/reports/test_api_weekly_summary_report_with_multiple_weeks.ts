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
 * Test the weekly summary report endpoint retrieves aggregated time tracking metrics across multiple ISO weeks.
 *
 * Validates the complete weekly summary report functionality including member authentication, organization context, employee records, and timelog aggregation across multiple weeks. Ensures that weekly summaries are correctly calculated with accurate total_hours, timelog_count, and employee_count metrics.
 *
 * Special attention is given to verifying ISO week boundaries (Monday-Sunday), proper sorting by week_start_date DESC, and accurate pagination metadata. The test creates timelogs spanning 2-3 different ISO weeks with varying durations to validate aggregation logic.
 *
 * 1. Member registers and authenticates with the platform.
 * 2. Organization is created for context isolation.
 * 3. Employee invitation is created and accepted.
 * 4. Multiple timelogs are created spanning different ISO weeks.
 * 5. Weekly summary report is retrieved and validated.
 * 6. Validates week boundaries, total hours calculation, timelog counts, employee counts, and pagination.
 */
export async function test_api_weekly_summary_report_with_multiple_weeks(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
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
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: member.email,
          employment_type: "full-time",
          expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        },
      },
    );
  typia.assert(invitation);
  // 4. Create timelogs spanning multiple ISO weeks
  // Calculate week boundaries
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const currentWeekMonday = new Date(now);
  currentWeekMonday.setDate(now.getDate() + mondayOffset);
  currentWeekMonday.setHours(0, 0, 0, 0);
  const previousWeekMonday = new Date(currentWeekMonday);
  previousWeekMonday.setDate(currentWeekMonday.getDate() - 7);
  const twoWeeksAgoMonday = new Date(currentWeekMonday);
  twoWeeksAgoMonday.setDate(currentWeekMonday.getDate() - 14);
  // Create timelogs for Week 1 (current week) - 2 entries
  const week1Timelog1 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: currentWeekMonday.toISOString(),
          duration_minutes: 120,
          billable: true,
        },
      },
    );
  typia.assert(week1Timelog1);
  const week1Timelog2 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: new Date(currentWeekMonday.getTime() + 86400000).toISOString(),
          duration_minutes: 180,
          billable: true,
        },
      },
    );
  typia.assert(week1Timelog2);
  // Create timelogs for Week 2 (previous week) - 3 entries
  const week2Timelog1 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: previousWeekMonday.toISOString(),
          duration_minutes: 240,
          billable: true,
        },
      },
    );
  typia.assert(week2Timelog1);
  const week2Timelog2 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: new Date(previousWeekMonday.getTime() + 86400000).toISOString(),
          duration_minutes: 150,
          billable: false,
        },
      },
    );
  typia.assert(week2Timelog2);
  const week2Timelog3 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: new Date(
            previousWeekMonday.getTime() + 86400000 * 2,
          ).toISOString(),
          duration_minutes: 210,
          billable: true,
        },
      },
    );
  typia.assert(week2Timelog3);
  // Create timelogs for Week 3 (two weeks ago) - 1 entry
  const week3Timelog1 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: twoWeeksAgoMonday.toISOString(),
          duration_minutes: 300,
          billable: true,
        },
      },
    );
  typia.assert(week3Timelog1);
  // 5. Retrieve weekly summary report
  const report =
    await api.functional.hrmPlatform.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(report);
  // 6. Validate pagination
  TestValidator.predicate("has pagination", report.pagination !== undefined);
  TestValidator.predicate("current page is 1", report.pagination.current === 1);
  TestValidator.predicate("limit is 10", report.pagination.limit === 10);
  TestValidator.predicate(
    "has 3 weeks of data",
    report.pagination.records === 3,
  );
  TestValidator.predicate("total pages is 1", report.pagination.pages === 1);
  // 7. Validate weekly summaries
  TestValidator.predicate("has 3 weekly summaries", report.data.length === 3);
  // Week 1 (most recent) - should be first due to DESC sorting
  const week1Summary = report.data[0];
  TestValidator.predicate(
    "week 1 has correct total hours",
    week1Summary.total_hours === 5,
  );
  TestValidator.predicate(
    "week 1 has 2 timelogs",
    week1Summary.timelog_count === 2,
  );
  TestValidator.predicate(
    "week 1 has 1 employee",
    week1Summary.employee_count === 1,
  );
  // Week 2 - should be second
  const week2Summary = report.data[1];
  TestValidator.predicate(
    "week 2 has correct total hours",
    week2Summary.total_hours === 10,
  );
  TestValidator.predicate(
    "week 2 has 3 timelogs",
    week2Summary.timelog_count === 3,
  );
  TestValidator.predicate(
    "week 2 has 1 employee",
    week2Summary.employee_count === 1,
  );
  // Week 3 (oldest) - should be last
  const week3Summary = report.data[2];
  TestValidator.predicate(
    "week 3 has correct total hours",
    week3Summary.total_hours === 5,
  );
  TestValidator.predicate(
    "week 3 has 1 timelog",
    week3Summary.timelog_count === 1,
  );
  TestValidator.predicate(
    "week 3 has 1 employee",
    week3Summary.employee_count === 1,
  );
  // 8. Validate week date boundaries (Monday-Sunday)
  TestValidator.predicate(
    "week 1 start is Monday",
    new Date(week1Summary.week_start_date).getDay() === 1,
  );
  TestValidator.predicate(
    "week 1 end is Sunday",
    new Date(week1Summary.week_end_date).getDay() === 0,
  );
  TestValidator.predicate(
    "week 2 start is Monday",
    new Date(week2Summary.week_start_date).getDay() === 1,
  );
  TestValidator.predicate(
    "week 2 end is Sunday",
    new Date(week2Summary.week_end_date).getDay() === 0,
  );
  TestValidator.predicate(
    "week 3 start is Monday",
    new Date(week3Summary.week_start_date).getDay() === 1,
  );
  TestValidator.predicate(
    "week 3 end is Sunday",
    new Date(week3Summary.week_end_date).getDay() === 0,
  );
  // 9. Validate sorting (DESC by week_start_date)
  TestValidator.predicate(
    "weeks sorted DESC",
    new Date(week1Summary.week_start_date).getTime() >=
      new Date(week2Summary.week_start_date).getTime() &&
      new Date(week2Summary.week_start_date).getTime() >=
        new Date(week3Summary.week_start_date).getTime(),
  );
}
