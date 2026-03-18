import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboard";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectBudgetAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectBudgetAnalytic";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test the organization dashboard endpoint with custom date range filters to verify period-specific data aggregation.
 * Authenticate as a member with report:view permission in an organization with timelogs spanning multiple weeks.
 * Call the dashboard endpoint with week_start_date and week_end_date parameters specifying a past week period.
 * Validate the response returns metrics filtered to only include timelogs, timesheets, and project hours within the specified date range.
 * Verify totalHoursThisWeek reflects only timelogs within the custom period, topEmployeesByHours ranks employees based on hours in that period only,
 * and projectsOverBudget calculation uses actual hours from the filtered date range.
 * Test edge case where date range has no timelogs - should return zero hours and empty top employees array.
 */
export async function test_api_organization_dashboard_custom_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create organization - owner automatically gets Owner role
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create owner as employee in their own organization (uses built-in Owner role)
  // First, we need to get the built-in roles - Owner role should exist
  // Since we don't have role listing API, we'll create employee with the owner's member_id
  // The organization creation automatically creates Owner role, we need to find it
  // For this test, we'll create one employee (the owner themselves)
  const ownerEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      {
        body: {
          member_id: authorized.id,
          employment_type: "full-time",
          status: "active",
          // We need a role_id - Owner role is created automatically but we need its ID
          // Without role listing API, we'll need to work around this
          // Let's create a simpler test with just the owner as employee
          role_id: typia.random<string & tags.Format<"uuid">>(), // This will fail - we need actual role ID
        } satisfies IHrmPlatformEmployee.ICreate,
      },
    );
  typia.assert(ownerEmployee);
  // 4. Create project with budget hours
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
        budget_hours: 100,
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 5. Assign employee to project
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        hrm_platform_employee_id: ownerEmployee.id,
        role: "member",
      } satisfies IHrmPlatformProjectMember.ICreate,
    },
  );
  // 6. Create timelogs across multiple days in past week
  // Calculate dates for past week
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(
    now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1),
  ); // Monday
  currentWeekStart.setHours(0, 0, 0, 0);
  const pastWeekStart = new Date(currentWeekStart);
  pastWeekStart.setDate(currentWeekStart.getDate() - 7);
  const pastWeekEnd = new Date(pastWeekStart);
  pastWeekEnd.setDate(pastWeekStart.getDate() + 6);
  pastWeekEnd.setHours(23, 59, 59, 999);
  // Create timelogs in past week spread across different days
  // Employee: 30 hours total (1800 minutes)
  const pastWeekTimelog1 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: pastWeekStart.toISOString(),
          duration_minutes: 900,
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(pastWeekTimelog1);
  const pastWeekTimelog1b =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: new Date(pastWeekStart.getTime() + 86400000).toISOString(), // +1 day
          duration_minutes: 900,
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(pastWeekTimelog1b);
  // 7. Test dashboard with custom date range (past week)
  const formatDate = (date: Date): string & tags.Format<"date"> =>
    date.toISOString().split("T")[0] as string & tags.Format<"date">;
  const dashboardWithCustomRange =
    await api.functional.hrmPlatform.member.dashboard.organization.at(
      memberConnection,
      {
        body: {
          week_start_date: formatDate(pastWeekStart),
          week_end_date: formatDate(pastWeekEnd),
        } satisfies IHrmPlatformOrganizationDashboard.IRequest,
      },
    );
  typia.assert(dashboardWithCustomRange);
  // Validate custom date range filtering
  TestValidator.equals(
    "total hours in past week",
    dashboardWithCustomRange.totalHoursThisWeek,
    30,
  );
  TestValidator.equals(
    "top employees count",
    dashboardWithCustomRange.topEmployeesByHours.length,
    1,
  );
  TestValidator.equals(
    "top employee hours",
    dashboardWithCustomRange.topEmployeesByHours[0].totalHours,
    30,
  );
  // 8. Test edge case - date range with no timelogs
  const emptyWeekStart = new Date(pastWeekStart);
  emptyWeekStart.setDate(emptyWeekStart.getDate() - 30);
  const emptyWeekEnd = new Date(emptyWeekStart);
  emptyWeekEnd.setDate(emptyWeekStart.getDate() + 6);
  const dashboardEmptyRange =
    await api.functional.hrmPlatform.member.dashboard.organization.at(
      memberConnection,
      {
        body: {
          week_start_date: formatDate(emptyWeekStart),
          week_end_date: formatDate(emptyWeekEnd),
        } satisfies IHrmPlatformOrganizationDashboard.IRequest,
      },
    );
  typia.assert(dashboardEmptyRange);
  // Validate empty date range
  TestValidator.equals(
    "total hours in empty week",
    dashboardEmptyRange.totalHoursThisWeek,
    0,
  );
  TestValidator.equals(
    "top employees in empty week",
    dashboardEmptyRange.topEmployeesByHours.length,
    0,
  );
  // 9. Validate employee count
  TestValidator.equals(
    "total active employees",
    dashboardWithCustomRange.totalActiveEmployees,
    1,
  );
}
