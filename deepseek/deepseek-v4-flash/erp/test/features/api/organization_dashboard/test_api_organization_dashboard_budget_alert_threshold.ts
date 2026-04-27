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
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";

export async function test_api_organization_dashboard_budget_alert_threshold(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member with known credentials
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(authorized);
  // Step 2: Create an organization (auto-creates employee record for owner)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Login again to get the employee record created when the organization was created
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } as IHrmTimeTrackingMember.ILogin,
  });
  typia.assert(authorized2);
  // Find the employee record for this organization
  const employee = authorized2.employees.find(
    (e) => e.role.organization.id === organization.id,
  );
  if (employee === undefined) {
    throw new Error("Employee record not found after organization creation");
  }
  // Step 4: Create a project with budget_hours=10
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      loginConnection,
      {
        body: {
          budget_hours: 10 satisfies number | undefined | null as
            | number
            | undefined
            | null,
        },
      },
    );
  typia.assert(project);
  // Step 5: Add the owner employee as a project member with role='member'
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      loginConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: employee.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // Step 6: Log 510 minutes (8.5 hours) of billable time for today's date
  const timelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      loginConnection,
      {
        body: {
          project_id: project.id,
          duration_minutes: 510 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          date: new Date().toISOString(),
          billable: true,
        },
      },
    );
  typia.assert(timelog);
  // Step 7: Request the dashboard
  const dashboard =
    await api.functional.hrmTimeTracking.member.organizations.dashboard.overview(
      loginConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(dashboard);
  // Step 8: Validate dashboard metrics
  TestValidator.equals("activeEmployeeCount", dashboard.activeEmployeeCount, 1);
  TestValidator.equals("weeklyHours", dashboard.weeklyHours, 8.5);
  TestValidator.equals(
    "pendingTimesheetCount",
    dashboard.pendingTimesheetCount,
    0,
  );
  // Validate budget alerts
  TestValidator.equals("budgetAlerts count", dashboard.budgetAlerts.length, 1);
  const alert = dashboard.budgetAlerts[0];
  TestValidator.equals("budgetAlert projectId", alert.projectId, project.id);
  TestValidator.equals(
    "budgetAlert projectName",
    alert.projectName,
    project.name,
  );
  TestValidator.equals("budgetAlert budgetHours", alert.budgetHours, 10);
  TestValidator.equals(
    "budgetAlert totalLoggedHours",
    alert.totalLoggedHours,
    8.5,
  );
  TestValidator.equals(
    "budgetAlert utilizationPercent",
    alert.utilizationPercent,
    85.0,
  );
  // Validate top employees
  TestValidator.equals("topEmployees count", dashboard.topEmployees.length, 1);
  const top = dashboard.topEmployees[0];
  TestValidator.equals("topEmployee totalHours", top.totalHours, 8.5);
  TestValidator.equals("topEmployee employeeId", top.employeeId, employee.id);
}
