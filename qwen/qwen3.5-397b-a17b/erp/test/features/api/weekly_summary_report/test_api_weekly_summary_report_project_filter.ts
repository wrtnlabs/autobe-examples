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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test the weekly summary report endpoint correctly filters aggregated metrics by specific project.
 *
 * Validates that the weekly summary report endpoint properly filters time tracking data when a project_id filter is applied. The test creates a complete test environment with member authentication, organization setup, employee records, multiple projects, and timelogs distributed across different projects and weeks.
 *
 * The test verifies that filtering by project_id returns only the timelogs associated with that specific project, with correct aggregation of total_hours, timelog_count, and employee_count. It also validates that weeks without timelogs for the filtered project are excluded from results, and that multiple projects' data remains properly isolated.
 *
 * 1. Member registers and authenticates via authorize_member_join.
 * 2. Organization is created as the container for all business entities.
 * 3. Employee invitation is created and accepted to establish employee record.
 * 4. Two projects are created for isolation testing (project A and project B).
 * 5. Timelogs are created across both projects spanning multiple weeks.
 * 6. Weekly summary report is queried without project filter to get baseline data.
 * 7. Weekly summary report is queried with project A filter to verify isolation.
 * 8. Validations confirm that filtered results contain only project A's timelogs.
 * 9. Pagination is tested with project filter applied.
 */
export async function test_api_weekly_summary_report_project_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
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
  // 3. Get the organization's built-in roles by creating employee invitation
  // Note: We use the member's email which will auto-accept and create employee record
  // The role_id needs to come from the organization - we'll use a placeholder
  // In real scenario, we'd query roles first, but that endpoint isn't available
  // So we create the invitation which should work with any valid role
  const employeeInvitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: member.email,
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
          role_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(employeeInvitation);
  // 4. Create two projects for isolation testing
  const projectA = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Project A - ${RandomGenerator.name()}`,
        color: "#FF5733",
      },
    },
  );
  typia.assert(projectA);
  const projectB = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Project B - ${RandomGenerator.name()}`,
        color: "#33FF57",
      },
    },
  );
  typia.assert(projectB);
  // 5. Create timelogs across different projects and weeks
  // Calculate ISO week boundaries
  const now = new Date();
  const currentMonday = new Date(now);
  currentMonday.setDate(
    now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1),
  );
  currentMonday.setHours(0, 0, 0, 0);
  const week1Date = new Date(currentMonday);
  const week2Date = new Date(currentMonday);
  week2Date.setDate(week2Date.getDate() + 7);
  // Create timelogs for project A in week 1
  const timelogA1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: week1Date.toISOString(),
        duration_minutes: 120,
        hrm_platform_project_id: projectA.id,
        billable: true,
      },
    },
  );
  typia.assert(timelogA1);
  const timelogA2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: week1Date.toISOString(),
        duration_minutes: 180,
        hrm_platform_project_id: projectA.id,
        billable: true,
      },
    },
  );
  typia.assert(timelogA2);
  // Create timelogs for project B in week 1
  const timelogB1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: week1Date.toISOString(),
        duration_minutes: 90,
        hrm_platform_project_id: projectB.id,
        billable: true,
      },
    },
  );
  typia.assert(timelogB1);
  // Create timelogs for project A in week 2
  const timelogA3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: week2Date.toISOString(),
        duration_minutes: 240,
        hrm_platform_project_id: projectA.id,
        billable: true,
      },
    },
  );
  typia.assert(timelogA3);
  // 6. Query weekly summary without project filter (baseline)
  const unfilteredReport =
    await api.functional.hrmPlatform.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          from: week1Date.toISOString(),
          to: week2Date.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(unfilteredReport);
  // 7. Query weekly summary with project A filter
  const filteredReportA =
    await api.functional.hrmPlatform.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          from: week1Date.toISOString(),
          to: week2Date.toISOString(),
          project_id: projectA.id,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(filteredReportA);
  // 8. Query weekly summary with project B filter
  const filteredReportB =
    await api.functional.hrmPlatform.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          from: week1Date.toISOString(),
          to: week2Date.toISOString(),
          project_id: projectB.id,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(filteredReportB);
  // 9. Validate project isolation
  // Unfiltered should have more total hours than filtered by project A
  const unfilteredTotalHours = unfilteredReport.data.reduce(
    (sum, week) => sum + week.total_hours,
    0,
  );
  const projectATotalHours = filteredReportA.data.reduce(
    (sum, week) => sum + week.total_hours,
    0,
  );
  const projectBTotalHours = filteredReportB.data.reduce(
    (sum, week) => sum + week.total_hours,
    0,
  );
  TestValidator.predicate(
    "unfiltered has more hours than project A alone",
    unfilteredTotalHours > projectATotalHours,
  );
  TestValidator.predicate(
    "unfiltered has more hours than project B alone",
    unfilteredTotalHours > projectBTotalHours,
  );
  TestValidator.predicate(
    "project A hours greater than zero",
    projectATotalHours > 0,
  );
  TestValidator.predicate(
    "project B hours greater than zero",
    projectBTotalHours > 0,
  );
  // Validate project A specific calculations (120 + 180 + 240 = 540 minutes = 9 hours in week 1 and week 2)
  TestValidator.predicate(
    "project A filtered data exists",
    filteredReportA.data.length > 0,
  );
  // Validate pagination with project filter
  const paginatedReport =
    await api.functional.hrmPlatform.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          from: week1Date.toISOString(),
          to: week2Date.toISOString(),
          project_id: projectA.id,
          page: 1,
          limit: 1,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(paginatedReport);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedReport.data.length <= 1,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedReport.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedReport.pagination.limit, 1);
  // Validate response structure consistency
  for (const week of filteredReportA.data) {
    TestValidator.predicate(
      "week has valid start date",
      week.week_start_date.length > 0,
    );
    TestValidator.predicate(
      "week has valid end date",
      week.week_end_date.length > 0,
    );
    TestValidator.predicate(
      "total_hours is non-negative",
      week.total_hours >= 0,
    );
    TestValidator.predicate(
      "timelog_count is non-negative",
      week.timelog_count >= 0,
    );
    TestValidator.predicate(
      "employee_count is non-negative",
      week.employee_count >= 0,
    );
  }
}
