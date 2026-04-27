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

export async function test_api_timesheet_double_approval_conflict(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. REGISTER MEMBERS WITH KNOWN PASSWORDS
  //----
  // 1.1 Employee registers with known password for later re-login
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      password: employeePassword,
    },
  });
  const employeeEmail = employee.email;
  // 1.2 Manager registers with known password
  const managerPassword = RandomGenerator.alphaNumeric(16);
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      password: managerPassword,
    },
  });
  const managerEmail = manager.email;
  //----
  // 2. EMPLOYEE CREATES ORGANIZATION
  //----
  // After this, the employee has an employee record with Owner role
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      employeeConnection,
      {},
    );
  typia.assert(organization);
  //----
  // 3. RE-LOGIN EMPLOYEE TO GET UPDATED EMPLOYEE RECORD
  //----
  // After org creation, the employee's IAuthorized.employees array now
  // contains the employee record with the Owner role ID.
  const employeeAuthorized = await authorize_member_login(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IHrmTimeTrackingMember.ILogin,
  });
  const employeeRecord = employeeAuthorized.employees[0];
  typia.assert(employeeRecord);
  //----
  // 4. EMPLOYEE INVITES MANAGER
  //----
  // This auto-creates the manager's employee record with Manager role
  // granting time:approve permission
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
  //----
  // 5. EMPLOYEE CREATES PROJECT
  //----
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      employeeConnection,
      {},
    );
  typia.assert(project);
  //----
  // 6. ADD EMPLOYEE AS PROJECT MEMBER
  //----
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      employeeConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: employeeRecord.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  //----
  // 7. CREATE TIMELOG AGAINST PROJECT
  //----
  const timelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      employeeConnection,
      {
        body: {
          project_id: project.id,
        },
      },
    );
  typia.assert(timelog);
  //----
  // 8. CREATE DRAFT TIMESHEET FOR CURRENT WEEK
  //----
  // Calculate the most recent Monday
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString().split("T")[0] as string &
    tags.Format<"date">;
  const timesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: weekStartDate,
        },
      },
    );
  typia.assert(timesheet);
  //----
  // 9. SUBMIT TIMESHEET (draft → submitted)
  //----
  const submittedTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.submit(
      employeeConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  //----
  // 10. MANAGER APPROVES TIMESHEET (first call - succeeds, submitted → approved)
  //----
  const approvedTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.approve(
      managerConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(approvedTimesheet);
  //----
  // 11. MANAGER APPROVES TIMESHEET AGAIN (second call - expects 409 Conflict)
  //----
  // The approve endpoint validates that status is exactly 'submitted'.
  // Since it's now 'approved', the second call must fail with 409.
  await TestValidator.httpError(
    "approve already-approved timesheet should return 409 Conflict",
    409,
    async () => {
      await api.functional.hrmTimeTracking.member.timesheets.approve(
        managerConnection,
        {
          timesheetId: timesheet.id,
        },
      );
    },
  );
}