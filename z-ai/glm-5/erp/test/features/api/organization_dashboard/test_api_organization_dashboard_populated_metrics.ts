import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationDashboard";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_organization_dashboard_populated_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Owner joins and creates organization (becomes owner with report:view permission)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // Step 2: Owner creates projects with budget_hours allocation for dashboard metrics
  const projects = await ArrayUtil.asyncRepeat(3, async (index) => {
    const project = await generate_random_erp_hrm_member_projects_create(
      ownerConnection,
      {
        body: {
          name: `Project ${index + 1} - ${RandomGenerator.name()}`,
          color_code: `#${Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0")}`,
          budget_hours: 10 + index * 5,
        },
      },
    );
    typia.assert(project);
    return project;
  });
  // Step 3: Create additional employees for active employee count and time tracking
  const employeeData: Array<{
    employee: IErpHrmEmployee;
    connection: api.IConnection;
  }> = [];
  for (let i = 0; i < 5; i++) {
    // Create new member with their own connection
    const empConnection: api.IConnection = { host: connection.host };
    const memberAuth = await authorize_member_join(empConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: `Employee ${i + 1}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(memberAuth);
    // Owner adds the member as employee to the organization
    // Note: roleId is not specified - generate_random_erp_hrm_member_employees_create
    // uses prepare_random_erp_hrm_employee which handles filling in the roleId
    const employee = await generate_random_erp_hrm_member_employees_create(
      ownerConnection,
      {
        body: {
          email: memberAuth.email,
          employmentType: "full_time",
        },
      },
    );
    typia.assert(employee);
    employeeData.push({ employee, connection: empConnection });
  }
  // Step 4: Calculate current week boundaries (Monday to Sunday)
  const now = new Date();
  const currentDay = now.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  // Step 5: Employees log timelogs against projects during the current week
  const timelogEntries: IErpHrmTimelog[] = [];
  for (const { connection: empConnection } of employeeData) {
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const logDate = new Date(weekStart);
      logDate.setDate(weekStart.getDate() + dayOffset);
      logDate.setHours(9, 0, 0, 0);
      const project = projects[dayOffset % projects.length];
      const timelog = await generate_random_erp_hrm_member_timelogs_create(
        empConnection,
        {
          body: {
            project_id: project.id,
            date: logDate.toISOString(),
            duration: (60 + dayOffset * 30) as number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
            billable: true,
          },
        },
      );
      typia.assert(timelog);
      timelogEntries.push(timelog);
    }
  }
  // Step 6: Create and submit timesheets to generate pending_approvals
  for (const { connection: empConnection } of employeeData) {
    const timesheet = await generate_random_erp_hrm_member_timesheets_create(
      empConnection,
      {
        body: {
          week_start_date: weekStart.toISOString(),
        },
      },
    );
    typia.assert(timesheet);
    // Submit timesheet for approval
    await api.functional.erpHrm.member.timesheets.submit(empConnection, {
      timesheetId: timesheet.id,
    });
  }
  // Step 7: Get organization dashboard
  const dashboard =
    await api.functional.erpHrm.member.dashboards.organization.at(
      ownerConnection,
    );
  typia.assert(dashboard);
  // Validation 1: total_active_employees should include owner + all created employees
  const expectedActiveEmployeeCount = employeeData.length + 1; // employees + owner
  TestValidator.equals(
    "total_active_employees count",
    dashboard.total_active_employees,
    expectedActiveEmployeeCount,
  );
  // Validation 2: weekly_hours should be positive (sum of all timelog durations / 60)
  TestValidator.predicate(
    "weekly_hours is positive",
    dashboard.weekly_hours > 0,
  );
  // Validation 3: pending_approvals should match submitted timesheets count
  TestValidator.equals(
    "pending_approvals count",
    dashboard.pending_approvals,
    employeeData.length,
  );
  // Validation 4: top_performers array should be limited to 5 entries maximum
  TestValidator.predicate(
    "top_performers array length <= 5",
    dashboard.top_performers.length <= 5,
  );
  // Validation 5: Each top_performer should have complete employee summary and positive hours_logged
  for (const performer of dashboard.top_performers) {
    typia.assert(performer.employee);
    TestValidator.predicate(
      "top_performer has hours_logged > 0",
      performer.hours_logged > 0,
    );
  }
  // Validation 6: budget_alerts should only include projects with >80% utilization
  for (const alert of dashboard.budget_alerts) {
    TestValidator.predicate(
      "budget_alert utilization > 80%",
      alert.utilization_percentage > 80,
    );
  }
  // Validation 7: budget_alerts should be sorted by utilization_percentage descending
  for (let i = 1; i < dashboard.budget_alerts.length; i++) {
    TestValidator.predicate(
      "budget_alerts sorted descending by utilization",
      dashboard.budget_alerts[i - 1].utilization_percentage >=
        dashboard.budget_alerts[i].utilization_percentage,
    );
  }
}
