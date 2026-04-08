import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_timelogs_view_by_permission_holder(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates organization (admin is the organization owner)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create a project for timelog assignment
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Create first employee (timesheet owner) with owner role
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeDisplayName = RandomGenerator.name();
  // First, join as a member
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(employeeMemberConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      display_name: employeeDisplayName,
    },
  });
  // Create employee with owner role (time:view_all permission) - hardcoded UUID for built-in Owner role
  const ownerRoleId = "00000000-0000-0000-0000-000000000001" as string &
    tags.Format<"uuid">;
  const employeeInvitation =
    await generate_random_erp_hrm_admin_employees_create(adminConnection, {
      body: {
        email: employeeEmail,
        roleId: ownerRoleId,
        employmentType: "full-time",
      },
    });
  typia.assert(employeeInvitation);
  // 4. Employee creates a timelog - generate a random project ID for the request
  // Note: IErpHrmProject is a budget report type without id field, so we generate a UUID
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    employeeMemberConnection,
    {
      body: {
        projectId: projectId,
        date: new Date().toISOString(),
        durationMinutes: 120,
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 5. Employee creates a timesheet (get Monday of current week)
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  monday.setUTCHours(0, 0, 0, 0);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeMemberConnection,
    {
      body: {
        weekStartDate: monday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Store the employee ID from the timesheet
  const employeeId = timesheet.employee.id;
  // 6. Create second employee (viewer) who also has time:view_all permission
  const viewerEmail = typia.random<string & tags.Format<"email">>();
  const viewerPassword = RandomGenerator.alphaNumeric(16);
  const viewerMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(viewerMemberConnection, {
    body: {
      email: viewerEmail,
      password: viewerPassword,
      display_name: RandomGenerator.name(),
    },
  });
  // Create viewer with owner role (has time:view_all permission)
  await generate_random_erp_hrm_admin_employees_create(adminConnection, {
    body: {
      email: viewerEmail,
      roleId: ownerRoleId,
      employmentType: "full-time",
    },
  });
  // 7. Viewer with time:view_all permission retrieves timelogs from employee's timesheet
  const retrievedTimelogs =
    await api.functional.erpHrm.member.timesheets.timelogs.invert(
      viewerMemberConnection,
      { timesheetId: timesheet.id },
    );
  typia.assert(retrievedTimelogs);
  // 8. Verify HTTP 200 (typia.assert passed means success)
  // 9. Verify timesheet context shows original employee's information
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimelogs.timesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "timesheet employee ID matches",
    retrievedTimelogs.timesheet.employee.id,
    employeeId,
  );
  TestValidator.equals(
    "timesheet status matches",
    retrievedTimelogs.timesheet.status,
    "draft",
  );
  // 10. Verify timelog details from the other employee's timesheet are returned
  TestValidator.equals("timelog ID matches", retrievedTimelogs.id, timelog.id);
  TestValidator.equals(
    "timelog date matches",
    retrievedTimelogs.date,
    timelog.date,
  );
  TestValidator.equals(
    "timelog duration matches",
    retrievedTimelogs.durationMinutes,
    timelog.durationMinutes,
  );
  TestValidator.equals(
    "timelog billable matches",
    retrievedTimelogs.billable,
    true,
  );
  // 11. Verify employee context in timelog
  TestValidator.equals(
    "timelog employee ID matches",
    retrievedTimelogs.employee.id,
    employeeId,
  );
  // 12. Verify project context in timelog
  TestValidator.equals(
    "timelog project ID matches",
    retrievedTimelogs.project.id,
    timelog.project.id,
  );
}
