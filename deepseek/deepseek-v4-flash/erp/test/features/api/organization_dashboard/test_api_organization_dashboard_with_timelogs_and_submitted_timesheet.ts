import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationDashboard";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { generate_random_hrm_time_tracking_member_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_member_timesheets_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_organization_dashboard_with_timelogs_and_submitted_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and capture credentials for re-login
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create organization (auto-creates employee record for owner)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Re-login to obtain updated profile with employee record
  const loginConnection: api.IConnection = { host: connection.host };
  const reauthorized = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(reauthorized);
  const employeeId = reauthorized.employees[0]!.id;
  // 4. Create project with budget_hours=40
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      loginConnection,
      {
        body: {
          budget_hours: 40,
        },
      },
    );
  typia.assert(project);
  // 5. Add owner employee as project member with role='member'
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      loginConnection,
      {
        body: {
          employee_id: employeeId,
          role: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 6. Log 240 minutes of billable time for today
  const now = new Date();
  const timelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      loginConnection,
      {
        body: {
          date: now.toISOString(),
          duration_minutes: 240,
          project_id: project.id,
          billable: true,
        },
      },
    );
  typia.assert(timelog);
  // 7. Calculate current week Monday for timesheet
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const weekStartDate = monday.toISOString().split("T")[0]!;
  // 8. Create draft timesheet for current work week
  const timesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      loginConnection,
      {
        body: {
          week_start_date: weekStartDate,
        },
      },
    );
  typia.assert(timesheet);
  // 9. Submit the timesheet for approval
  const submittedTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.submit(
      loginConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // 10. Retrieve the organization dashboard
  const dashboard =
    await api.functional.hrmTimeTracking.member.organizations.dashboard.overview(
      loginConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(dashboard);
  // 11. Validate all five dashboard metrics
  TestValidator.equals("activeEmployeeCount", dashboard.activeEmployeeCount, 1);
  TestValidator.equals("weeklyHours", dashboard.weeklyHours, 4.0);
  TestValidator.equals(
    "pendingTimesheetCount",
    dashboard.pendingTimesheetCount,
    1,
  );
  TestValidator.equals("budgetAlerts", dashboard.budgetAlerts, []);
  TestValidator.equals("topEmployees count", dashboard.topEmployees.length, 1);
  const topEmployee = dashboard.topEmployees[0]!;
  TestValidator.equals(
    "topEmployee.employeeId",
    topEmployee.employeeId,
    employeeId,
  );
  TestValidator.notEquals(
    "topEmployee.employeeName",
    topEmployee.employeeName,
    "",
  );
  TestValidator.equals("topEmployee.totalHours", topEmployee.totalHours, 4.0);
}
