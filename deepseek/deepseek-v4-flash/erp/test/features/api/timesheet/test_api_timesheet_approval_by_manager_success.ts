import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
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
import { generate_random_hrm_time_tracking_member_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_member_invitations_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { generate_random_hrm_time_tracking_member_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_member_timesheets_create";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_approval_by_manager_success(
  connection: api.IConnection,
): Promise<void> {
  // =========================================================
  // 1. Register Employee (Member A) - will create org and timesheet
  // =========================================================
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(employeeAuth);
  // =========================================================
  // 2. Register Manager (Member B) - will approve the timesheet
  // =========================================================
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerPassword = RandomGenerator.alphaNumeric(16);
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: managerEmail,
      password: managerPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(managerAuth);
  const managerMemberId = managerAuth.id;
  // =========================================================
  // 3. Employee creates an Organization
  //    Becoming Owner with time:approve permission.
  //    Built-in roles (Owner, Manager, Employee) auto-created.
  // =========================================================
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      employeeConnection,
      {},
    );
  typia.assert(organization);
  const organizationId = organization.id;
  // =========================================================
  // 4. Re-authenticate employee to get fresh employee record
  //    After org creation, the owner's employee record exists
  //    with the Owner role. Re-login refreshes the data.
  // =========================================================
  const employeeReAuth = await authorize_member_login(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
    } as IHrmTimeTrackingMember.ILogin,
  });
  typia.assert(employeeReAuth);
  // Find the employee record for this organization
  const employeeEmployeeRecord = employeeReAuth.employees.find(
    (emp) => emp.role.organization.id === organizationId,
  );
  if (employeeEmployeeRecord === undefined)
    throw new Error("Employee record not found after org creation");
  const employeeId = employeeEmployeeRecord.id;
  // =========================================================
  // 5. Employee invites Manager to the organization
  //    Since manager is already registered, this auto-creates
  //    an active employee record with the specified role.
  // =========================================================
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      employeeConnection,
      {
        body: {
          email: managerEmail,
        },
      },
    );
  typia.assert(invitation);
  // =========================================================
  // 6. Employee creates a Project
  // =========================================================
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      employeeConnection,
      {},
    );
  typia.assert(project);
  const projectId = project.id;
  // =========================================================
  // 7. Add Employee as project member
  // =========================================================
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      employeeConnection,
      {
        params: {
          projectId,
        },
        body: {
          employee_id: employeeId,
          role: "member" as const,
        },
      },
    );
  typia.assert(projectMember);
  // =========================================================
  // 8. Calculate current week's Monday for timesheet
  // =========================================================
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString().split("T")[0]; // YYYY-MM-DD format
  // =========================================================
  // 9. Create a timelog within this work week
  // =========================================================
  const timelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      employeeConnection,
      {
        body: {
          project_id: projectId,
          date: monday.toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<480>
          >(),
        },
      },
    );
  typia.assert(timelog);
  // =========================================================
  // 10. Create a draft timesheet for the current work week
  // =========================================================
  const timesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: weekStartDate as any,
        },
      },
    );
  typia.assert(timesheet);
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.equals(
    "timesheet employee is set",
    timesheet.employee.id,
    employeeId,
  );
  // =========================================================
  // 11. Submit the timesheet for approval
  // =========================================================
  const submittedTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.submit(
      employeeConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is set",
    submittedTimesheet.submittedAt !== null &&
      submittedTimesheet.submittedAt !== undefined,
  );
  // =========================================================
  // 12. Manager approves the submitted timesheet
  // =========================================================
  const approvedTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.approve(
      managerConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(approvedTimesheet);
  // =========================================================
  // 13. Verify approval response
  // =========================================================
  TestValidator.equals(
    "timesheet status is approved",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at is populated",
    approvedTimesheet.reviewedAt !== null &&
      approvedTimesheet.reviewedAt !== undefined,
  );
  TestValidator.equals(
    "reviewer is the manager",
    approvedTimesheet.reviewer?.id,
    managerMemberId,
  );
  TestValidator.equals(
    "reviewer display name matches",
    approvedTimesheet.reviewer?.display_name,
    managerAuth.display_name,
  );
}
