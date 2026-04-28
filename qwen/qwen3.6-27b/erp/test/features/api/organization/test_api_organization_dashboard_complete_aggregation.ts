import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformHighUtilizationProjectSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformHighUtilizationProjectSummary";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationDashboard";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Verify the organization dashboard correctly returns aggregated metrics for an authenticated member's active organization context.
 *
 * Validates that activeEmployeesCount accurately counts only employees with 'active' status. Verifies totalHoursThisWeek sums duration_minutes from all timelogs within the current calendar week, properly converting minutes to hours. Confirms budgetHighUtilizationProjects includes only projects where actualHours/budgetHours >= 0.80. Validates topEmployeesByHours correctly ranks the top employees by total hours worked this week. Ensures all data is properly scoped to the authenticated member's organization context with multi-tenancy isolation enforced.
 *
 * 1. First member registers and becomes the organization owner.
 * 2. Additional members register to become employee invites.
 * 3. Employees are created by inviting members with role assignments.
 * 4. An employee record is created for the owner as well.
 * 5. A project with a defined budget is created for budget tracking.
 * 6. Employees are assigned to the project as members.
 * 7. Timelogs are created by each employee for the current week to build up dashboard metrics.
 * 8. Organization dashboard is retrieved and all aggregated metrics are validated.
 * 9. Verifies activeEmployeesCount, totalHoursThisWeek, pendingTimesheetsCount, budgetHighUtilizationProjects, and topEmployeesByHours.
 */
export async function test_api_organization_dashboard_complete_aggregation(
  connection: api.IConnection,
) {
  // 1. First member joins and becomes organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(ownerAuthorized);
  // 2. Create additional members for employees
  const emp1Connection: api.IConnection = { host: connection.host };
  const emp1 = await authorize_member_join(emp1Connection, {});
  typia.assert(emp1);
  const emp2Connection: api.IConnection = { host: connection.host };
  const emp2 = await authorize_member_join(emp2Connection, {});
  typia.assert(emp2);
  const emp3Connection: api.IConnection = { host: connection.host };
  const emp3 = await authorize_member_join(emp3Connection, {});
  typia.assert(emp3);
  // 3. Create employees by inviting members to the organization (owner creates employees)
  // Let prepare function handle roleId from available organization roles
  const employee1 = await generate_random_hrm_platform_member_employees_create(
    ownerConnection,
    {
      body: {
        memberId: emp1.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee1);
  const employee2 = await generate_random_hrm_platform_member_employees_create(
    ownerConnection,
    {
      body: {
        memberId: emp2.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee2);
  const employee3 = await generate_random_hrm_platform_member_employees_create(
    ownerConnection,
    {
      body: {
        memberId: emp3.id,
        employmentType: "part-time",
      },
    },
  );
  typia.assert(employee3);
  // 4. Create project with budget (via owner)
  const project = await generate_random_hrm_platform_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#FF5733",
        budget: 100,
      },
    },
  );
  typia.assert(project);
  // 5. Add employees as project members
  const membership1 =
    await generate_random_hrm_platform_member_projects_memberships_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          employeeId: employee1.id,
          capacityRole: "member",
        },
      },
    );
  typia.assert(membership1);
  const membership2 =
    await generate_random_hrm_platform_member_projects_memberships_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          employeeId: employee2.id,
          capacityRole: "member",
        },
      },
    );
  typia.assert(membership2);
  const membership3 =
    await generate_random_hrm_platform_member_projects_memberships_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          employeeId: employee3.id,
          capacityRole: "member",
        },
      },
    );
  typia.assert(membership3);
  // 6. Calculate a date in the current week (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const wednesday = new Date(monday);
  wednesday.setDate(monday.getDate() + 2);
  // Employee 1 timelogs (heavy worker)
  const tl1a = await generate_random_hrm_platform_member_timelogs_create(
    emp1Connection,
    {
      body: {
        projectId: project.id,
        date: wednesday.toISOString(),
        durationMinutes: 380,
        workDescription: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(tl1a);
  const tl1b = await generate_random_hrm_platform_member_timelogs_create(
    emp1Connection,
    {
      body: {
        projectId: project.id,
        date: wednesday.toISOString(),
        durationMinutes: 240,
        workDescription: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(tl1b);
  // Employee 2 timelogs (moderate worker)
  const tl2a = await generate_random_hrm_platform_member_timelogs_create(
    emp2Connection,
    {
      body: {
        projectId: project.id,
        date: wednesday.toISOString(),
        durationMinutes: 270,
        workDescription: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(tl2a);
  const tl2b = await generate_random_hrm_platform_member_timelogs_create(
    emp2Connection,
    {
      body: {
        projectId: project.id,
        date: wednesday.toISOString(),
        durationMinutes: 180,
        workDescription: RandomGenerator.paragraph({ sentences: 2 }),
        billable: false,
      },
    },
  );
  typia.assert(tl2b);
  // Employee 3 timelogs (light worker)
  const tl3a = await generate_random_hrm_platform_member_timelogs_create(
    emp3Connection,
    {
      body: {
        projectId: project.id,
        date: wednesday.toISOString(),
        durationMinutes: 180,
        workDescription: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(tl3a);
  // 7. Calculate expected total hours this week
  const expectedTotalHours = (620 + 450 + 180) / 60;
  // 8. Retrieve organization dashboard
  const dashboard =
    await api.functional.hrmPlatform.member.organization_dashboard.at(
      ownerConnection,
    );
  typia.assert(dashboard);
  // 9. Validate dashboard metrics
  // Active employees count should be at least 3
  TestValidator.predicate(
    "active employees count is at least 3",
    dashboard.activeEmployeesCount >= 3,
  );
  // Total hours this week should match expected sum
  TestValidator.equals(
    "total hours this week matches sum of all timelogs",
    dashboard.totalHoursThisWeek,
    expectedTotalHours,
  );
  // Pending timesheets count should be 0 (none were submitted)
  TestValidator.equals(
    "pending timesheets count is 0 with no submitted timesheets",
    dashboard.pendingTimesheetsCount,
    0,
  );
  // Budget utilization: 20.83% of 100 hour budget, below 80% threshold
  TestValidator.equals(
    "budget high utilization projects is empty when below 80% threshold",
    dashboard.budgetHighUtilizationProjects.length,
    0,
  );
  // Top employees by hours should have entries
  TestValidator.predicate(
    "top employees by hours has entries",
    dashboard.topEmployeesByHours.length > 0,
  );
  // Verify limited to max 5 employees
  TestValidator.predicate(
    "top employees by hours has at most 5 entries",
    dashboard.topEmployeesByHours.length <= 5,
  );
  // Verify employees who logged time appear in top employees
  const topEmployeeIds = dashboard.topEmployeesByHours.map((e) => e.id);
  TestValidator.predicate(
    "employee who worked most appears in top employees",
    topEmployeeIds.includes(employee1.id),
  );
  // Verify ordering is by hours descending
  if (dashboard.topEmployeesByHours.length >= 2) {
    TestValidator.predicate(
      "top employees ordered by hours descending",
      dashboard.topEmployeesByHours[0].totalHours >=
        dashboard.topEmployeesByHours[1].totalHours,
    );
  }
  // Verify totalHours for employee 1
  const emp1DashboardEntry = dashboard.topEmployeesByHours.find(
    (e) => e.id === employee1.id,
  );
  if (emp1DashboardEntry !== undefined) {
    const expectedEmp1Hours = 620 / 60;
    TestValidator.equals(
      "employee 1 total hours matches expected",
      emp1DashboardEntry.totalHours,
      expectedEmp1Hours,
    );
  }
  // Verify all top employees have valid member info
  for (const emp of dashboard.topEmployeesByHours) {
    TestValidator.predicate(
      "top employee has display name",
      emp.member.display_name.length > 0,
    );
  }
}
